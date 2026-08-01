import sharp from 'sharp';
import opentype from 'opentype.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

sharp.concurrency(1);

const W = 2160;

const HEADER_H = 440;
const DH = 16;
const PT = 80;
const PS = 96;
const PB = 96;
const G = 48;
const CP = 24;
const CR = 48;
const IR = 36;
const SY = 16;
const SB = 48;
const SA = 0.12;
const JPG_Q = 95;

const MONTHS = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
];

const DAYS = ['sun','mon','tue','wed','thu','fri','sat'];

const THEMES = {
  sun: { g: ['#DC2626','#EF4444','#F87171'], d: '#FBBF24', tc: '#fff', bg: '#FEF2F2' },
  mon: { g: ['#854D0E','#CA8A04','#FACC15'], d: '#A16207', tc: '#fff', bg: '#FEFCE8' },
  tue: { g: ['#BE185D','#EC4899','#F472B6'], d: '#FDE68A', tc: '#fff', bg: '#FDF2F8' },
  wed: { g: ['#047857','#059669','#34D399'], d: '#FCD34D', tc: '#fff', bg: '#ECFDF5' },
  thu: { g: ['#C2410C','#EA580C','#FB923C'], d: '#FED7AA', tc: '#fff', bg: '#FFF7ED' },
  fri: { g: ['#1D4ED8','#3B82F6','#60A5FA'], d: '#BFDBFE', tc: '#fff', bg: '#EFF6FF' },
  sat: { g: ['#7C3AED','#8B5CF6','#A78BFA'], d: '#DDD6FE', tc: '#fff', bg: '#F5F3FF' },
};

const THEME_NAMES = {
  sun: 'อาทิตย์',
  mon: 'จันทร์',
  tue: 'อังคาร',
  wed: 'พุธ',
  thu: 'พฤหัสบดี',
  fri: 'ศุกร์',
  sat: 'เสาร์',
};

function defaultPreset() {
  return DAYS[new Date().getDay()];
}

function cols(n) {
  if (n === 1) return 1;
  if (n <= 3) return n;
  return 3;
}

function isScreenshot(meta) {
  const ratio = meta.height / meta.width;
  const screenshotRatio = 2760 / 1256; // ~2.2
  return Math.abs(ratio - screenshotRatio) < 0.1;
}

function fmtDate(s) {
  const d = s && s.trim() ? new Date(s + 'T00:00:00') : new Date();
  return `วันที่ ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const font = opentype.parse(readFileSync(resolve(__dirname, 'NotoSansThai.ttf')));

function headerSVG(name, date, hh, t) {
  let svg = `<svg width="${W}" height="${hh}" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="h" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="${t.g[0]}"/>
<stop offset="50%" stop-color="${t.g[1]}"/>
<stop offset="100%" stop-color="${t.g[2]}"/>
</linearGradient></defs>
<rect width="100%" height="100%" fill="url(#h)"/>`;

  const ty = Math.round(hh * 0.55);
  if (name) {
    const pw = font.getAdvanceWidth(name, 128);
    svg += `<g fill="${t.tc}">${font.getPath(name, Math.max(0, (W - pw) / 2), ty, 128).toSVG(2)}</g>`;
  }
  if (date) {
    const dy = name ? ty + 114 : Math.round(hh * 0.55) + 20;
    const pw = font.getAdvanceWidth(date, 68);
    svg += `<g fill="rgba(255,255,255,.9)">${font.getPath(date, Math.max(0, (W - pw) / 2), dy, 68).toSVG(2)}</g>`;
  }
  return svg + '</svg>';
}

function dividerSVG(c) {
  return `<svg width="${W}" height="${DH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${c}"/></svg>`;
}

const shadowCache = new Map();

async function getShadow(w, h) {
  const key = `${w}x${h}`;
  if (!shadowCache.has(key)) {
    const pad = SB * 2;
    const svg = `<svg width="${w + pad}" height="${h + pad}" xmlns="http://www.w3.org/2000/svg"><rect x="${pad / 2}" y="${pad / 2}" width="${w}" height="${h}" fill="rgba(0,0,0,${SA})"/></svg>`;
    shadowCache.set(key, await sharp(Buffer.from(svg)).blur(SB).png().toBuffer());
  }
  return shadowCache.get(key);
}

function cardBgSVG(w, h) {
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="${h}" rx="${CR}" fill="#fff"/></svg>`;
}

function maskSVG(w, h) {
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="${h}" rx="${IR}" fill="#fff"/></svg>`;
}

async function roundImage(buf, w, h, contentW) {
  // Allow upscale up to 3x the original size to fill the card.
  // Capping prevents pixelation from extremely small sources (e.g. 50px LINE thumbnails).
  const upscaleCap = 3;
  const targetW = w < contentW ? Math.min(contentW, Math.round(w * upscaleCap)) : contentW;
  const targetH = Math.round(targetW * h / w);
  const resized = await sharp(buf)
    .resize(targetW, targetH, {
      fit: 'fill',
      kernel: 'lanczos3',
    })
    .png()
    .toBuffer();
  const rmeta = await sharp(resized).metadata();
  // Center the (possibly smaller than card) image inside the card area.
  const padX = Math.max(0, Math.round((contentW - rmeta.width) / 2));
  const padY = Math.max(0, Math.round((targetH - rmeta.height) / 2));
  const mask = Buffer.from(maskSVG(contentW, targetH));
  const rounded = await sharp({
    create: { width: contentW, height: targetH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: resized, top: padY, left: padX },
      { input: mask, top: 0, left: 0, blend: 'dest-in' },
    ])
    .png()
    .toBuffer();
  return { buf: rounded, w: rmeta.width, h: rmeta.height };
}

export async function createCollage(files, name, date, preset, theme) {
  date = fmtDate(date);
  if (!preset || !THEMES[preset]) preset = defaultPreset();

  // Themed rendering (rack/crt/noc) — min/default keeps the original renderer
  const themeId = String(theme || '').toLowerCase();
  const themedManifest = THEME_MANIFESTS[themeId];
  if (themedManifest) {
    return createThemedCollage(files, name, date, preset, themedManifest);
  }

  const t = THEMES[preset];
  const count = files.length;

  const metas = await Promise.all(files.map(f => sharp(f.path).metadata()));

  const c = cols(count);

  const usable = W - PS * 2;
  const cardW = Math.floor((usable - G * (c - 1)) / c);
  const iw = cardW - CP * 2;

  // Guard against missing/zero dimensions (e.g. a photo whose metadata height is
  // unavailable). Without this, ih becomes NaN -> column heights become NaN ->
  // Math.min returns NaN -> colIdx = -1 and every image piles into one column.
  // We fall back to the first image's dimensions of the layout (iw square) so a
  // single bad photo can never poison the whole column-height tracker.
  const dims = metas.map(m => {
    const w = m.width && m.width > 0 ? m.width : iw;
    const h = m.height && m.height > 0 ? m.height : iw;
    const ih = Math.round(iw * h / w) || iw;
    return { iw, ih, ch: ih + CP * 2 };
  });

  // Masonry layout (max 3 columns): each image drops into the currently
  // shortest column, so shorter photos (e.g. 152px) naturally fill gaps left by
  // taller ones instead of forcing a new full row. Start each column's height
  // from the first image placed in it (the "first image of the row/column" idea)
  // so a NaN/missing height can never propagate — the fallback above guarantees
  // dims[i].ch is always a finite positive number.
  const colHeights = new Array(c).fill(0);
  const placements = [];

  for (let i = 0; i < count; i++) {
    const colIdx = colHeights.indexOf(Math.min(...colHeights));
    const x = PS + colIdx * (cardW + G);
    const y = colHeights[colIdx];
    placements.push({ colIdx, x, y, ch: dims[i].ch });
    colHeights[colIdx] += dims[i].ch + G;
  }

  const contentH = Math.max(...colHeights) - G;
  const rest = contentH + DH + PT + PB;
  const totalH = HEADER_H + rest;

  const composites = [];

  composites.push({ input: Buffer.from(headerSVG(name, date, HEADER_H, t)), top: 0, left: 0 });
  composites.push({ input: Buffer.from(dividerSVG(t.d)), top: HEADER_H, left: 0 });

  const contentY = HEADER_H + DH + PT;

  const imgs = await Promise.all(
    dims.map((d, i) =>
      roundImage(files[i].path, metas[i].width, metas[i].height, d.iw)
    )
  );

  const pad = SB * 2;

  for (let i = 0; i < count; i++) {
    const { x, y, ch } = placements[i];
    const actualY = contentY + y;

    const shadow = await getShadow(cardW, ch);
    composites.push({ input: shadow, top: actualY + SY - pad / 2, left: x - pad / 2 });
    composites.push({ input: Buffer.from(cardBgSVG(cardW, ch)), top: actualY, left: x });
    // Center the (possibly smaller) image inside the card's content area.
    const cx = x + CP + Math.max(0, Math.round((dims[i].iw - imgs[i].w) / 2));
    const cy = actualY + CP + Math.max(0, Math.round((dims[i].ih - imgs[i].h) / 2));
    composites.push({ input: imgs[i].buf, top: cy, left: cx });
  }

  const bgc = parseInt(t.bg.slice(1), 16);
  const base = sharp({
    create: { width: W, height: totalH, channels: 4, background: { r: (bgc >> 16) & 255, g: (bgc >> 8) & 255, b: bgc & 255, alpha: 1 } },
  });

  return base.composite(composites).sharpen({ sigma: 1.5 }).jpeg({ quality: 100, chromaSubsampling: '4:4:4' }).toBuffer();
}

/* =============================================================================
   THEMED RENDERING (rack / crt / noc)
   -----------------------------------------------------------------------------
   Same masonry layout + image pipeline as above, but the visual chrome
   (background, header, cell frames, overlays, photo fx) comes from the
   theme MANIFEST via sharp-renderer.js — the same manifest the client canvas
   uses. min / default keeps the original day-gradient renderer above.
   ============================================================================= */
export async function createThemedCollage(files, name, date, preset, manifest) {
  const metas = await Promise.all(files.map(f => sharp(f.path).metadata()));
  const count = files.length;
  const c = cols(count);
  const usable = W - PS * 2;
  const cardW = Math.floor((usable - G * (c - 1)) / c);
  const iw = cardW - CP * 2;
  const cell = manifest.canvas.cell || {};
  const unitHeadH = cell.unit ? (cell.unitHeadH || 48) : 0;
  const topPad = cell.unit ? (unitHeadH + 8) : CP; // unit head occupies top
  const botPad = CP;

  const dims = metas.map(m => {
    const w = m.width && m.width > 0 ? m.width : iw;
    const h = m.height && m.height > 0 ? m.height : iw;
    const ih = Math.round(iw * h / w) || iw;
    return { iw, ih, ch: ih + topPad + botPad };
  });

  const colHeights = new Array(c).fill(0);
  const placements = [];
  for (let i = 0; i < count; i++) {
    const colIdx = colHeights.indexOf(Math.min(...colHeights));
    const x = PS + colIdx * (cardW + G);
    const y = colHeights[colIdx];
    placements.push({ colIdx, x, y, ch: dims[i].ch });
    colHeights[colIdx] += dims[i].ch + G;
  }

  const contentH = Math.max(...colHeights) - G;
  // themed: content starts exactly 44px below the date baseline (mirrors the
  // date y-position formula in sharp-renderer's renderBackdrop)
  const dateBaseY = Math.round(HEADER_H * ((name && date) ? 0.78 : 0.55));
  const contentY = dateBaseY + 44;
  const totalH = contentY + contentH + PB;

  // pixel-space card rects (for sharp-renderer)
  const cards = placements.map(p => ({ x: p.x, y: contentY + p.y, w: cardW, h: p.ch }));

  // 1. backdrop: bg gradient/flat + header + cell chips
  const backdropSVG = renderBackdrop(manifest, { W, H: totalH, headerH: HEADER_H, name, date, cards });
  const backdrop = await sharp(backdropSVG).png().toBuffer();

  // 2. photos (rounded + optional photoFx)
  const fx = getPhotoFx(manifest);
  const imgs = [];
  for (let i = 0; i < count; i++) {
    const rounded = await roundImage(files[i].path, metas[i].width, metas[i].height, dims[i].iw);
    let buf = rounded.buf;
    if (fx) buf = await sharp(buf).modulate(fx).png().toBuffer();
    const cx = placements[i].x + CP + Math.max(0, Math.round((dims[i].iw - rounded.w) / 2));
    const cy = contentY + placements[i].y + topPad + Math.max(0, Math.round((dims[i].ih - rounded.h) / 2));
    imgs.push({ input: buf, top: cy, left: cx });
  }

  // 3. foreground: cell borders + labels + overlays + accent
  //    (rasterize SVG → PNG first; composite over a FLATTENED base — compositing
  //     an RGBA overlay over an RGBA base in sharp mangles transparent-black
  //     pixels and erases the photos underneath. Must flatten in a SEPARATE step,
  //     not a chain, otherwise sharp still produces dark output.)
  const fgSVG = renderForeground(manifest, { W, H: totalH, cards, preset: manifest.canvas.presetAccent ? preset : null });

  // 4. compose — step 1: base + photos, flatten to RGB
  let baseBuf = await sharp(backdrop)
    .composite(imgs)
    .flatten({ background: '#000000' })
    .png()
    .toBuffer();

  // step 2: overlay foreground (transparent PNG over opaque RGB works correctly)
  if (fgSVG) {
    const fgPNG = await sharp(fgSVG).png().toBuffer();
    baseBuf = await sharp(baseBuf).composite([{ input: fgPNG }]).png().toBuffer();
  }

  return sharp(baseBuf).sharpen({ sigma: 1.5 }).jpeg({ quality: 100, chromaSubsampling: '4:4:4' }).toBuffer();
}

/* =============================================================================
   Theme registry (from design-system — the SAME manifests as the client)
   ============================================================================= */
const THEME_MANIFESTS = {};
try {
  for (const id of ['rack', 'crt', 'noc', 'glitchpage', 'claude']) {
    const { manifest } = await import(`./design-system/themes/${id}/manifest.js`);
    if (manifest) THEME_MANIFESTS[id] = manifest;
  }
} catch (e) {
  console.error('[collage] theme manifest load failed:', e.message);
}
const { renderBackdrop, renderForeground, getPhotoFx } = await import('./design-system/core/sharp-renderer.js');
