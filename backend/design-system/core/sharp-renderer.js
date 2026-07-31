/* =============================================================================
   core/sharp-renderer.js — production renderer (sharp)
   -----------------------------------------------------------------------------
   Reads the SAME theme manifest as the client canvas-renderer and produces a
   collage with sharp (SVG composites + modulate). Used by backend collage.js.

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
import { DAY_PRESETS, DAY_NAMES } from '../engine/layout.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let monoFont = null;
let displayFont = null;
let thaiFont = null;
try {
  monoFont = opentype.parse(readFileSync(resolve(__dirname, '../fonts/JetBrainsMono-Regular.ttf')));
} catch {}
try {
  displayFont = opentype.parse(readFileSync(resolve(__dirname, '../fonts/VT323-Regular.ttf')));
} catch {}
try {
  // Thai-capable font (backend root — for user name/date). Mono fonts have no Thai glyphs.
  thaiFont = opentype.parse(readFileSync(resolve(__dirname, '../../NotoSansThai.ttf')));
} catch {}

/* =============================================================================
   helpers
   ============================================================================= */
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pickFont(manifest) {
  const header = manifest.canvas.header || {};
  if (header.font === 'display' && displayFont) return displayFont;
  return monoFont;
}

/** Draw text as SVG path (opentype), centered or left-aligned */
function textPathSVG(text, font, size, { x, y, align = 'left', color = '#fff' }) {
  const path = font.getPath(text, 0, 0, size).toSVG(2);
  const w = font.getAdvanceWidth(text, size);
  const tx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  // y is baseline
  return `<g fill="${color}" transform="translate(${tx} ${y})">${path}</g>`;
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
  return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255) > 450; // avg > 150
}

/* =============================================================================
   BACKGROUND (bg gradient/flat + header text)
   ============================================================================= */
export function renderBackdrop(manifest, { W, H, headerH, name, date, cards }) {
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

  // --- header (name + date only, centered — like the default/min renderer) ---
  // Theme title intentionally omitted: production output shows just name + date.
  const nameFont = thaiFont || monoFont;
  const textColor = isLightBg(c) ? '#16161a' : '#ffffff';
  if (name || date) {
    const hasBoth = !!(name && date);
    if (name) {
      const nameSize = Math.round(headerH * (hasBoth ? 0.24 : 0.28));
      svg.push(textPathSVG(name, nameFont, nameSize, {
        x: W / 2, y: Math.round(headerH * (hasBoth ? 0.48 : 0.56)), align: 'center', color: textColor,
      }));
    }
    if (date) {
      const dateSize = Math.round(headerH * 0.11);
      svg.push(textPathSVG(date, nameFont, dateSize, {
        x: W / 2, y: Math.round(headerH * (hasBoth ? 0.78 : 0.56)), align: 'center', color: hexToRgba(textColor, 0.85),
      }));
    }
  }

  // --- chrome: side rails (rack) — behind photos ---
  const ch = c.chrome;
  if (ch && ch.rails) {
    const r = ch.rails;
    const rw = Math.max(10, Math.round(W * r.widthRatio));
    const screwR = Math.max(2, Math.round(W * 0.006));
    const nScrews = 8;
    svg.push(`<defs><linearGradient id="rail" x1="0" y1="0" x2="1" y2="0">` +
      `<stop offset="0%" stop-color="${r.dark}"/>` +
      `<stop offset="50%" stop-color="${r.mid}"/>` +
      `<stop offset="100%" stop-color="${r.dark}"/>` +
      `</linearGradient></defs>`);
    svg.push(`<rect x="0" y="0" width="${rw}" height="${H}" fill="url(#rail)"/>`);
    svg.push(`<rect x="${W - rw}" y="0" width="${rw}" height="${H}" fill="url(#rail)"/>`);
    for (let i = 0; i < nScrews; i++) {
      const sy = Math.round((i / (nScrews - 1)) * H);
      svg.push(`<circle cx="${Math.round(rw / 2)}" cy="${sy}" r="${screwR}" fill="${r.screw}"/>`);
      svg.push(`<circle cx="${W - Math.round(rw / 2)}" cy="${sy}" r="${screwR}" fill="${r.screw}"/>`);
    }
    svg.push(`<line x1="${rw}" y1="0" x2="${rw}" y2="${H}" stroke="${r.highlight}" stroke-width="1"/>`);
    svg.push(`<line x1="${W - rw}" y1="0" x2="${W - rw}" y2="${H}" stroke="${r.highlight}" stroke-width="1"/>`);
  }

  // --- cell chip backgrounds (behind photos) ---
  const cell = c.cell || {};
  if (cell.bg) {
    for (const card of cards) {
      svg.push(`<rect x="${card.x}" y="${card.y}" width="${card.w}" height="${card.h}" fill="${cell.bg}"/>`);
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

  // --- cell borders ---
  if (cell.border && cell.width) {
    for (const card of cards) {
      const bw = cell.width;
      const rounded = cell.rounded ? `rx="${cell.rounded}"` : '';
      parts.push(`<rect x="${card.x}" y="${card.y}" width="${card.w}" height="${card.h}" ${rounded} fill="none" stroke="${cell.border}" stroke-width="${bw}"/>`);
    }
  }

  // --- cell labels (UNIT 01 / P1 / 01) ---
  if (cell.label) {
    const font = monoFont;
    if (font) {
      const ls = 26;
      const pad = 10;
      const lh = 34;
      cards.forEach((card, i) => {
        const text = cell.label === true
          ? String(i + 1).padStart(2, '0')
          : String(cell.label).replace('{n}', String(i + 1).padStart(2, '0'));
        const labelBg = cell.labelBg ?? 'rgba(0,0,0,0.55)';
        const labelColor = cell.labelColor ?? '#fff';
        const align = cell.labelAlign || 'right';
        const w = font.getAdvanceWidth(text, ls) + pad * 2;
        const x = align === 'left' ? card.x : card.x + card.w - w;
        const y = card.y + card.h - lh;
        parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${lh}" fill="${labelBg}"/>`);
        parts.push(textPathSVG(text, font, ls, { x: x + pad, y: y + lh - 8, color: labelColor }));
      });
    }
  }

  // --- chrome: LEDs (rack) + bezel/corner LEDs (crt) — on top ---
  const ch = c.chrome;
  if (ch) {
    // rack status LEDs (top-right)
    if (ch.leds) {
      const l = ch.leds;
      const n = l.colors.length;
      const r = Math.max(3, Math.round(W * l.sizeRatio));
      const gap = r * l.gapMul;
      const startX = W - r * 2 - gap * n;
      const y = Math.round(r * l.yMul);
      l.colors.forEach((color, i) => {
        const cx = startX + i * gap;
        parts.push(`<circle cx="${cx}" cy="${y}" r="${r * 3}" fill="${color}" fill-opacity="0.25"/>`);
        parts.push(`<circle cx="${cx}" cy="${y}" r="${r}" fill="${color}"/>`);
      });
    }
    // CRT bezel frame
    if (ch.bezel) {
      const b = ch.bezel;
      const bw = Math.max(16, Math.round(W * b.widthRatio));
      parts.push(`<rect x="0" y="0" width="${W}" height="${bw}" fill="${b.color}"/>`);
      parts.push(`<rect x="0" y="${H - bw}" width="${W}" height="${bw}" fill="${b.color}"/>`);
      parts.push(`<rect x="0" y="0" width="${bw}" height="${H}" fill="${b.color}"/>`);
      parts.push(`<rect x="${W - bw}" y="0" width="${bw}" height="${H}" fill="${b.color}"/>`);
      const gb = Math.round(bw * 0.6);
      parts.push(`<rect x="${gb}" y="${gb}" width="${W - gb * 2}" height="${H - gb * 2}" fill="none" stroke="${b.glow}" stroke-width="${Math.max(1, Math.round(W * 0.004))}"/>`);
    }
    // CRT corner LEDs (power/activity)
    if (ch.cornerLeds) {
      ch.cornerLeds.forEach((led) => {
        const r = Math.max(3, Math.round(W * led.sizeRatio));
        const pad = Math.round(W * led.padRatio);
        let x = led.x === 'left' ? pad : W - pad;
        let y = led.y === 'bottom' ? H - pad : pad;
        if (led.dxRatio) x += Math.round(W * led.dxRatio);
        parts.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${led.color}"/>`);
      });
    }
  }

  // --- overlays ---
  const ov = c.overlay;
  const ovList = Array.isArray(ov) ? ov : ov ? [ov] : ['none'];
  const ovOpts = c.overlayOpts || {};
  ovList.forEach((name) => {
    const o = ovOpts[name] || {};
    if (name === 'scanline') {
      const spacing = o.spacing ?? 4;
      const alpha = o.alpha ?? 0.18;
      let lines = '';
      for (let y = 0; y < H; y += spacing) {
        lines += `<rect y="${y}" width="${W}" height="1" fill="rgba(0,0,0,${alpha})"/>`;
      }
      parts.push(lines);
    } else if (name === 'vignette') {
      const intensity = o.intensity ?? 0.55;
      const r = Math.round(Math.max(W, H) * 0.75);
      parts.push(`<defs><radialGradient id="vig" cx="50%" cy="50%" r="70%">
        <stop offset="55%" stop-color="rgba(0,0,0,0)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,${intensity})"/>
      </radialGradient></defs><rect width="${W}" height="${H}" fill="url(#vig)"/>`);
    } else if (name === 'grid') {
      const spacing = o.spacing ?? 60;
      const color = o.color ?? 'rgba(0,212,255,0.05)';
      let grid = '';
      for (let x = 0; x <= W; x += spacing) grid += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${color}" stroke-width="1"/>`;
      for (let y = 0; y <= H; y += spacing) grid += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${color}" stroke-width="1"/>`;
      parts.push(grid);
    } else if (name === 'connectors') {
      const color = o.color ?? 'rgba(0,212,255,0.30)';
      if (cards.length) {
        const cx = W / 2, cy = Math.round(H * 0.55);
        let conn = '';
        for (const card of cards) {
          const mx = card.x + card.w / 2;
          const my = card.y + card.h / 2;
          conn += `<line x1="${mx}" y1="${my}" x2="${cx + (mx - cx) * 0.25}" y2="${cy + (my - cy) * 0.25}" stroke="${color}" stroke-width="2"/>`;
        }
        conn += `<circle cx="${cx}" cy="${cy}" r="10" fill="${color}"/>`;
        parts.push(conn);
      }
    }
  });

  // --- accent strip (min theme / presetAccent) ---
  if (c.presetAccent && preset) {
    const stopsArr = DAY_PRESETS[preset];
    if (stopsArr) {
      const stripH = Math.max(14, Math.round(H * 0.02));
      const stops = stopsArr.map((s, i) =>
        `<stop offset="${(i / (stopsArr.length - 1)) * 100}%" stop-color="${s}"/>`).join('');
      parts.push(`<defs><linearGradient id="acc" x1="0" y1="0" x2="1" y2="0">${stops}</linearGradient></defs>`);
      parts.push(`<rect y="${H - stripH}" width="${W}" height="${stripH}" fill="url(#acc)"/>`);
      if (monoFont) {
        const label = `// ${DAY_NAMES[preset] || preset}`;
        parts.push(textPathSVG(label, monoFont, 24, {
          x: W - 20, y: H - stripH / 2 + 8, align: 'right', color: 'rgba(0,0,0,0.55)',
        }));
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
