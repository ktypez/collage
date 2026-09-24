/* =============================================================================
   core/sharp-renderer.js — production renderer (sharp)
   -----------------------------------------------------------------------------
   Reads the theme manifests and produces a collage with sharp
   (SVG composites + modulate). Used by backend collage.js.

   Theme canvas pipeline (mirrored here):
     backdrop  = bg + header + cell chip backgrounds      → SVG → PNG
     photos    = rounded images (with optional photoFx)   → sharp composite
     foreground= cell borders + labels + overlays + accent → SVG → PNG
   ============================================================================= */

import sharp from 'sharp';
import opentype from 'opentype.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DAY_PRESETS } from '../engine/layout.js';
import { getThaiShaper, shapeThai } from './hb-shape.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let monoFont = null;
let thaiFont = null;
let chakraFont = null;
let serifFont = null;
let thaiSerifFont = null;
// HarfBuzz shapers for every Thai-capable font we ship. opentype.js 2.x can't
// shape Thai correctly for any of them (ChakraPetch outright crashes; Source
// Serif 4 / Noto Serif Thai / Noto Sans Thai silently drop GPOS, dropping tone
// marks to the baseline). HarfBuzz applies Thai GSUB+GPOS the way browsers do,
// keeping วรรณยุกต์ above the consonant across the whole font stack.
let chakraBuffer = null;
let serifBuffer = null;
let thaiSerifBuffer = null;
let thaiBuffer = null;
let chakraShaper = null;
let serifShaper = null;
let thaiSerifShaper = null;
let thaiShaper = null;
try {
  monoFont = opentype.parse(readFileSync(resolve(__dirname, '../fonts/JetBrainsMono-Regular.ttf')));
} catch {}
try {
  // Thai-capable font (backend root — for user name/date). Mono fonts have no Thai glyphs.
  thaiBuffer = readFileSync(resolve(__dirname, '../../NotoSansThai.ttf'));
  thaiFont = opentype.parse(thaiBuffer);
  thaiShaper = await getThaiShaper(thaiBuffer);
} catch (e) {
  console.error('[sharp-renderer] NotoSansThai / shaper init failed:', e.message);
  thaiShaper = null;
}
try {
  // Chakra Petch — Thai + Latin, techy look (preferred for big clear header text)
  chakraBuffer = readFileSync(resolve(__dirname, '../fonts/ChakraPetch-SemiBold.ttf'));
  chakraFont = opentype.parse(chakraBuffer);
  // opentype.js chokes on Chakra Petch's Thai GSUB (chaining substitution type 11), so
  // keep its feature list to latn-only. Thai runs are shaped by HarfBuzz below
  // (hb-shape.js) instead — it handles Chakra Petch's Thai GSUB/GPOS correctly.
  if (chakraFont && chakraFont.defaultRenderOptions && Array.isArray(chakraFont.defaultRenderOptions.features)) {
    chakraFont.defaultRenderOptions.features = chakraFont.defaultRenderOptions.features.filter(f => f.script === 'latn');
  }
  // Warm the HarfBuzz shaper (loads wasm + parses the font once).
  chakraShaper = await getThaiShaper(chakraBuffer);
} catch (e) {
  console.error('[sharp-renderer] Chakra Petch / harfbuzz init failed:', e.message);
  chakraShaper = null;
}
try {
  // Source Serif 4 — real serif (Latin + Thai glyphs), for editorial themes
  serifBuffer = readFileSync(resolve(__dirname, '../fonts/SourceSerif4-VF.ttf'));
  serifFont = opentype.parse(serifBuffer);
  serifShaper = await getThaiShaper(serifBuffer);
} catch (e) {
  console.error('[sharp-renderer] Source Serif 4 / shaper init failed:', e.message);
  serifShaper = null;
}
try {
  // Noto Serif Thai — Thai serif fallback for editorial themes
  thaiSerifBuffer = readFileSync(resolve(__dirname, '../fonts/NotoSerifThai-VF.ttf'));
  thaiSerifFont = opentype.parse(thaiSerifBuffer);
  thaiSerifShaper = await getThaiShaper(thaiSerifBuffer);
} catch (e) {
  console.error('[sharp-renderer] Noto Serif Thai / shaper init failed:', e.message);
  thaiSerifShaper = null;
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_SHORT = { sun: 'SUN', mon: 'MON', tue: 'TUE', wed: 'WED', thu: 'THU', fri: 'FRI', sat: 'SAT' };

/* =============================================================================
   helpers
   ============================================================================= */
/** Split text into runs: Thai chars → thaiFont, everything else → base font */
function splitTextRuns(text, isThai) {
  const runs = [];
  let cur = '', curThai = null;
  for (const ch of text) {
    const th = isThai(ch);
    if (cur && th !== curThai) { runs.push({ text: cur, thai: curThai }); cur = ''; }
    curThai = th; cur += ch;
  }
  if (cur) runs.push({ text: cur, thai: curThai });
  return runs;
}

/** Render text with per-script fonts (Latin serif + Thai serif fallback).
 *  Thai runs go through HarfBuzz when a shaper is ready so tone marks sit
 *  above the consonant (see hb-shape.js). */
function textPathSVGMulti(text, baseFont, thaiF, size, { x, y, align = 'left', color = '#fff', glow = null }) {
  if (!thaiF) return textPathSVG(text, baseFont, size, { x, y, align, color, glow });
  const isThaiCh = (ch) => /[฀-๿]/.test(ch);
  const runs = splitTextRuns(text, isThaiCh);
  const filter = glow ? ` filter="url(#hglow)"` : '';
  let extra = '';
  if (glow) {
    extra = `<defs><filter id="hglow" x="-50%" y="-50%" width="200%" height="200%">` +
      `<feGaussianBlur stdDeviation="${glow}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  }
  // Thai run -> HarfBuzz (if shaper ready), else fall back to opentype.getPath
  const runLayer = (r, col) => {
    const f = r.thai ? thaiF : baseFont;
    if (r.thai && thaiSerifShaper) {
      const shaped = shapeThai(thaiSerifShaper, r.text, size, col);
      return { svg: shaped.svg, w: shaped.width };
    }
    return { svg: f.getPath(r.text, 0, 0, size).toSVG(2), w: f.getAdvanceWidth(r.text, size) };
  };
  const layers = runs.map(r => runLayer(r, color));
  let totalW = 0;
  for (const l of layers) totalW += l.w;
  let tx = align === 'center' ? x - totalW / 2 : align === 'right' ? x - totalW : x;
  let out = '';
  for (const l of layers) {
    out += `<g${filter} fill="${color}" transform="translate(${tx} ${y})">${l.svg}</g>`;
    tx += l.w;
  }
  return extra + out;
}

/** Draw text as SVG path (opentype), centered or left-aligned.
    glitch: RGB-split layers like the 404 hero — [rightColor, leftColor] shadows */
function textPathSVG(text, font, size, { x, y, align = 'left', color = '#fff', glow = null, glitch = null }) {
  // y is baseline
  const filter = glow ? ` filter="url(#hglow)"` : '';
  let extra = '';
  if (glow) {
    extra = `<defs><filter id="hglow" x="-50%" y="-50%" width="200%" height="200%">` +
      `<feGaussianBlur stdDeviation="${glow}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  }
  // Render in Thai/Latin runs: opentype v2 emits NaN control points halfway
  // through long mixed Thai+Latin strings (ChakraPetch), and librsvg silently
  // drops the rest of the <path> from the first NaN onward — cutting the date/
  // name short. Splitting isolates each run so every glyph actually renders.
  //
  // Thai runs ALSO go through HarfBuzz (hb-shape.js) when the font is Chakra
  // Petch: opentype's Thai GSUB handling is broken for that font, which used to
  // drop tone marks (วรรณยุกต์) to the baseline — "วันที่" → "วันที".
  // Pick the HarfBuzz shaper that matches the active font, so Thai tone marks
  // are raised above the consonant for every Thai-capable font we ship.
  let shaper = null;
  if (font === chakraFont) shaper = chakraShaper;
  else if (font === serifFont) shaper = serifShaper;
  else if (font === thaiSerifFont) shaper = thaiSerifShaper;
  else if (font === thaiFont) shaper = thaiShaper;
  // Fallback Thai font: the mono font has no
  // Thai glyphs and silently emit empty boxes for Thai characters. When the
  // active font lacks a Thai shaper, fall through to thaiFont (Noto Sans Thai)
  // for Thai runs so the name/date still renders correctly.
  const fallbackThai = !shaper && thaiFont;
  const fallbackShaper = !shaper ? thaiShaper : null;
  // per-run: { text, thai } → SVG fragment + advance width (px at `size`)
  const runLayer = (r, col) => {
    if (r.thai && shaper) {
      const shaped = shapeThai(shaper, r.text, size, col);
      return { svg: shaped.svg, w: shaped.width };
    }
    if (r.thai && fallbackShaper) {
      const shaped = shapeThai(fallbackShaper, r.text, size, col);
      return { svg: shaped.svg, w: shaped.width };
    }
    const f = (r.thai && fallbackThai) ? fallbackThai : font;
    return { svg: f.getPath(r.text, 0, 0, size).toSVG(2), w: f.getAdvanceWidth(r.text, size) };
  };
  const mkLayers = (col, dx) => {
    const runs = splitTextRuns(text, (ch) => /[\u0E00-\u0E7F]/.test(ch));
    const layers = runs.map(r => runLayer(r, col));
    let totalW = 0;
    for (const l of layers) totalW += l.w;
    let tx = (align === 'center' ? x - totalW / 2 : align === 'right' ? x - totalW : x) + (dx || 0);
    let out = '';
    for (const l of layers) {
      out += `<g${filter} fill="${col}" transform="translate(${tx} ${y})">${l.svg}</g>`;
      tx += l.w;
    }
    return out;
  };
  let layers = mkLayers(color, 0);
  if (glitch) {
    const off = Math.round(size * 0.025);
    // RGB split: right shadow + left shadow (like text-shadow 3px/-3px)
    if (glitch[0]) layers = mkLayers(glitch[0], off) + layers;
    if (glitch[1]) layers = mkLayers(glitch[1], -off) + layers;
  }
  return extra + layers;
}

function hexToRgba(hex, alpha = 1) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Detect if a theme's background is light (affects name/date text color) */
function isLightBg(c) {
  let first = null;
  if (typeof c.bg === 'string') first = c.bg;
  else if (c.bg && c.bg.gradient) first = c.bg.gradient[0];
  if (!first) return false;
  const n = parseInt(String(first).replace('#', ''), 16);
  if (Number.isNaN(n)) return false;
  return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255) > 450;
}

function contrastTextOn(hex) {
  const value = String(hex).replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return '#ffffff';
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const srgb = v / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  const blackContrast = (luminance + 0.05) / 0.05;
  const whiteContrast = 1.05 / (luminance + 0.05);
  return blackContrast >= whiteContrast ? '#111111' : '#ffffff';
}

/* =============================================================================
   BACKGROUND (bg gradient/flat + header text)
   ============================================================================= */
export function renderBackdrop(manifest, { W, H, headerH, name, date, cards, preset }) {
  const c = manifest.canvas;
  const svg = [];

  // --- base background ---
  const bg = c.bg;
  if (bg && typeof bg === 'string') {
    svg.push(`<rect width="${W}" height="${H}" fill="${bg}"/>`);
  } else if (bg && bg.gradient) {
    const stops = bg.gradient.map((s, i) =>
      `<stop offset="${(i / (bg.gradient.length - 1)) * 100}%" stop-color="${s}"/>`).join('');
    const vert = bg.vertical !== false;
    const gid = 'bg';
    svg.push(`<defs><linearGradient id="${gid}" x1="0" y1="0" x2="${vert ? 0 : 1}" y2="${vert ? 1 : 0}">${stops}</linearGradient></defs>`);
    svg.push(`<rect width="${W}" height="${H}" fill="url(#${gid})"/>`);
  } else {
    svg.push(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);
  }

  const hd = c.header || {};
  const presetStops = preset ? DAY_PRESETS[preset] : null;
  const presetHeaderColor = hd.presetHeader && presetStops
    ? presetStops[hd.presetHeaderStop ?? 1]
    : null;

  if (presetHeaderColor) {
    svg.push(`<rect width="${W}" height="${headerH}" fill="${presetHeaderColor}"/>`);
  }

  // --- header stripe (themed accent bar at top edge) ---
  if (hd.stripe) {
    const sh = hd.stripeHeight || Math.round(headerH * 0.06);
    const where = hd.stripePos || 'bottom'; // bottom = below header, top = above
    if (where === 'top') {
      svg.push(`<rect x="0" y="0" width="${W}" height="${sh}" fill="${hd.stripe}"/>`);
    } else {
      svg.push(`<rect x="0" y="${headerH}" width="${W}" height="${sh}" fill="${hd.stripe}"/>`);
    }
  }

  // --- header (name + date, centered, big & clear) ---
  // Serif themes use Source Serif 4 for Latin + Noto Serif Thai for Thai.
  // Other themes use Chakra Petch + Noto Sans Thai for reliable Thai shaping.
  const useSerif = hd.font === 'serif';
  const nameFont = useSerif
    ? (serifFont || thaiSerifFont || thaiFont || monoFont)
    : (chakraFont || thaiFont || monoFont);
  const textColor = presetHeaderColor
    ? contrastTextOn(presetHeaderColor)
    : (isLightBg(c) ? '#16161a' : '#ffffff');
  const ink = hd.ink || textColor;
  const align = hd.align === 'left' || hd.align === 'right' ? hd.align : 'center';
  const margin = Math.max(72, hd.margin || 96);
  const textX = align === 'left' ? margin : align === 'right' ? W - margin : W / 2;
  const glowBlur = hd.glow && hd.color ? 8 : null;
  const glitchColors = hd.glitch;
  const drawText = useSerif
    ? (txt, f, sz, o) => textPathSVGMulti(txt, f, thaiSerifFont || null, sz, o)
    : textPathSVG;
  if (name || date) {
    const hasBoth = !!(name && date);
    if (name) {
      const nameSize = Math.round(headerH * (hasBoth ? 0.30 : 0.34));
      svg.push(drawText(name, nameFont, nameSize, {
        x: textX, y: Math.round(headerH * (hasBoth ? 0.47 : 0.55)), align,
        color: hd.glitch ? (hd.color || '#ff3366') : hexToRgba(ink, 0.9),
        glow: glowBlur, glitch: glitchColors,
      }));
    }
    if (date) {
      const dateSize = Math.round(headerH * 0.13);
      svg.push(drawText(date, nameFont, dateSize, {
        x: textX, y: Math.round(headerH * (hasBoth ? 0.78 : 0.55)), align, color: hexToRgba(ink, 0.8),
      }));
    }
  }

  // --- cell chip backgrounds (behind photos) — supports hex or linear-gradient ---
  const cell = c.cell || {};
  if (cell.backplate) {
    const plate = cell.backplate;
    const dx = plate.dx || 0;
    const dy = plate.dy || 0;
    const radius = plate.rounded ?? cell.rounded ?? 0;
    const rx = radius ? `rx="${radius}"` : '';
    for (const card of cards) {
      svg.push(`<rect x="${card.x + dx}" y="${card.y + dy}" width="${card.w}" height="${card.h}" ${rx} fill="${plate.fill}"/>`);
    }
  }
  if (cell.bg) {
    const rounded = cell.rounded ? `rx="${cell.rounded}"` : '';
    const shadow = cell.shadow ? `filter="drop-shadow(0 8px 16px rgba(0,0,0,${cell.shadow}))"` : '';
    const isGrad = typeof cell.bg === 'string' && cell.bg.startsWith('linear-gradient');
    if (isGrad) {
      // parse linear-gradient(180deg,#1c1c20,#0a0a0c)
      const m = cell.bg.match(/linear-gradient\(\s*([\d.]+deg)\s*,(.+)\)/);
      const deg = m ? parseFloat(m[1]) : 180;
      const stops = (m ? m[2] : cell.bg).split(',').map(s => s.trim());
      const vert = deg >= 135 && deg <= 225;
      svg.push(`<defs><linearGradient id="cellbg" x1="0" y1="0" x2="${vert ? 0 : 1}" y2="${vert ? 1 : 0}">` +
        stops.map((s, i) => `<stop offset="${(i / (stops.length - 1)) * 100}%" stop-color="${s}"/>`).join('') +
        `</linearGradient></defs>`);
      for (const card of cards) {
        svg.push(`<rect x="${card.x}" y="${card.y}" width="${card.w}" height="${card.h}" ${rounded} fill="url(#cellbg)" ${shadow}/>`);
      }
    } else {
      for (const card of cards) {
        svg.push(`<rect x="${card.x}" y="${card.y}" width="${card.w}" height="${card.h}" ${rounded} fill="${cell.bg}" ${shadow}/>`);
      }
    }
  }

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg.join('')}</svg>`);
}

/* =============================================================================
   FOREGROUND (cell borders + labels + overlays + accent strip)
   ============================================================================= */
export function renderForeground(manifest, { W, H, cards, preset }) {
  const c = manifest.canvas;
  const cell = c.cell || {};
  const parts = [];

  if (c.dayStrip && preset && DAY_PRESETS[preset]) {
    const strip = c.dayStrip;
    const height = strip.height || 30;
    const activeHeight = strip.activeHeight || Math.round(height * 1.7);
    const gap = strip.gap ?? 4;
    const segmentW = W / DAY_KEYS.length;
    parts.push(`<rect x="0" y="0" width="${W}" height="${activeHeight}" fill="${strip.background || '#111111'}"/>`);
    DAY_KEYS.forEach((key, i) => {
      const colors = DAY_PRESETS[key];
      const active = key === preset;
      const blockH = active ? activeHeight : height;
      const blockW = segmentW - gap;
      const x = i * segmentW + gap / 2;
      const opacity = active ? 1 : (strip.inactiveOpacity ?? 0.62);
      parts.push(`<rect x="${x}" y="0" width="${blockW}" height="${blockH}" fill="${colors[1]}" fill-opacity="${opacity}"/>`);
      if (active && strip.label !== false && monoFont) {
        const size = strip.labelSize || 18;
        parts.push(textPathSVG(DAY_SHORT[key], monoFont, size, {
          x: x + blockW / 2,
          y: Math.round(activeHeight / 2 + size * 0.35),
          align: 'center',
          color: contrastTextOn(colors[1]),
        }));
      }
    });
  }

  // --- cell borders ---
  if (cell.border && cell.width) {
    for (const card of cards) {
      const bw = cell.width;
      const rounded = cell.rounded ? `rx="${cell.rounded}"` : '';
      parts.push(`<rect x="${card.x}" y="${card.y}" width="${card.w}" height="${card.h}" ${rounded} fill="none" stroke="${cell.border}" stroke-width="${bw}"/>`);
    }
  }

  // --- registration marks: make each frame read like a prepared print plate ---
  if (cell.cropMarks) {
    const marks = typeof cell.cropMarks === 'object' ? cell.cropMarks : {};
    const color = marks.color || cell.border || '#111111';
    const size = marks.size || 30;
    const width = marks.width || 3;
    const inset = marks.inset ?? 10;
    for (const card of cards) {
      const left = card.x + inset;
      const right = card.x + card.w - inset;
      const top = card.y + inset;
      const bottom = card.y + card.h - inset;
      const d = [
        `M ${left} ${top + size} L ${left} ${top} L ${left + size} ${top}`,
        `M ${right - size} ${top} L ${right} ${top} L ${right} ${top + size}`,
        `M ${left} ${bottom - size} L ${left} ${bottom} L ${left + size} ${bottom}`,
        `M ${right - size} ${bottom} L ${right} ${bottom} L ${right} ${bottom - size}`,
      ].join(' ');
      parts.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="square"/>`);
    }
  }

  if (cell.label) {
    const font = monoFont;
    if (font) {
      const ls = cell.labelSize || 26;
      const pad = cell.labelPad || 12;
      const baseH = cell.labelHeight || 34;
      const inset = cell.labelInset ?? 12;
      const align = cell.labelAlign || 'right';
      const position = cell.labelPosition || (align === 'left' ? 'bottom-left' : 'bottom-right');
      cards.forEach((card, i) => {
        const text = cell.label === true
          ? String(i + 1).padStart(2, '0')
          : String(cell.label).replace('{n}', String(i + 1).padStart(2, '0'));
        const labelBg = cell.labelBg ?? 'rgba(0,0,0,0.55)';
        const labelColor = cell.labelColor ?? '#fff';
        const textW = font.getAdvanceWidth(text, ls);
        const boxW = textW + pad * 2;
        const isCircle = cell.labelShape === 'circle';
        const boxH = isCircle ? Math.max(baseH, boxW) : baseH;
        let x = align === 'left' ? card.x : card.x + card.w - boxW;
        let y = card.y + card.h - boxH;
        if (position.includes('top')) y = card.y + inset;
        if (position.includes('left')) x = card.x + inset;
        if (position.includes('right')) x = card.x + card.w - boxW - inset;
        if (position.includes('center')) x = card.x + (card.w - boxW) / 2;

        if (isCircle) {
          const cx = x + boxW / 2;
          const cy = y + boxH / 2;
          parts.push(`<circle cx="${cx}" cy="${cy}" r="${boxH / 2}" fill="${labelBg}"/>`);
          parts.push(textPathSVG(text, font, ls, {
            x: cx - textW / 2, y: cy + Math.round(ls * 0.35), color: labelColor,
          }));
        } else {
          const radius = cell.labelRounded ?? (cell.rounded ? Math.min(14, cell.rounded / 2) : 0);
          const rounded = radius ? `rx="${radius}"` : '';
          parts.push(`<rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" ${rounded} fill="${labelBg}"/>`);
          parts.push(textPathSVG(text, font, ls, {
            x: x + pad, y: y + boxH - Math.round(ls * 0.3), color: labelColor,
          }));
        }
      });
    }
  }

  // --- optional frame and film-edge chrome ---
  const ch = c.chrome;
  if (ch) {
    if (ch.frame) {
      const f = ch.frame;
      const inset = f.inset ?? 24;
      const radius = f.rounded ?? 0;
      const rounded = radius ? `rx="${radius}"` : '';
      parts.push(`<rect x="${inset}" y="${inset}" width="${W - inset * 2}" height="${H - inset * 2}" ${rounded} fill="none" stroke="${f.color}" stroke-width="${f.width || 2}" stroke-opacity="${f.opacity ?? 1}"/>`);
    }
    if (ch.filmPerforations) {
      const p = ch.filmPerforations;
      const holeW = p.width || 30;
      const holeH = p.height || 48;
      const pad = p.pad ?? 24;
      const gap = p.gap || 150;
      const color = p.color || '#f2ead8';
      const opacity = p.opacity ?? 0.72;
      for (let y = Math.round(p.start ?? 72); y < H - holeH; y += gap) {
        parts.push(`<rect x="${pad}" y="${y}" width="${holeW}" height="${holeH}" rx="${p.rounded ?? 4}" fill="${color}" fill-opacity="${opacity}"/>`);
        parts.push(`<rect x="${W - pad - holeW}" y="${y}" width="${holeW}" height="${holeH}" rx="${p.rounded ?? 4}" fill="${color}" fill-opacity="${opacity}"/>`);
      }
    }
  }

  if (!parts.length) return null;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${parts.join('')}</svg>`);
}

/* =============================================================================
   PHOTO FX — map manifest.canvas.photoFx CSS filter → sharp.modulate params
   ============================================================================= */
export function getPhotoFx(manifest) {
  const fx = manifest.canvas.photoFx;
  if (!fx) return null;
  const m = { saturation: 1, brightness: 1 };
  const sat = fx.match(/saturate\(([\d.]+)\)/);
  const bri = fx.match(/brightness\(([\d.]+)\)/);
  if (sat) m.saturation = parseFloat(sat[1]);
  if (bri) m.brightness = parseFloat(bri[1]);
  if (m.saturation === 1 && m.brightness === 1) return null;
  return m;
}
