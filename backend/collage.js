import sharp from 'sharp';
import opentype from 'opentype.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

sharp.concurrency(1);

const W = 2160;

const HEADER_H = 440;
const DH = 14;
const PT = 80;
const PS = 96;
const PB = 96;
const G = 48;
const CP = 24;
const CR = 36;
const IR = 28;
const SY = 14;
const SB = 36;
const SA = 0.10;
const MAX_SOURCE_PIXELS = 50_000_000;
const MAX_TOTAL_SOURCE_PIXELS = 180_000_000;
const MAX_ASPECT_RATIO = 4;
const MAX_OUTPUT_HEIGHT = 10_000;
const SHADOW_CACHE_LIMIT = 64;

const MONTHS = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
];

const DAYS = ['sun','mon','tue','wed','thu','fri','sat'];

const THEMES = {
  sun: { g: ['#B91C1C', '#DC2626', '#F87171'], tc: '#fff', bg: '#F8E9E6', label: 'SUNDAY', code: 'SUN / 01' },
  mon: { g: ['#854D0E', '#CA8A04', '#FACC15'], tc: '#fff', bg: '#F6F0D9', label: 'MONDAY', code: 'MON / 02' },
  tue: { g: ['#9D174D', '#DB2777', '#F472B6'], tc: '#fff', bg: '#F6E7EE', label: 'TUESDAY', code: 'TUE / 03' },
  wed: { g: ['#047857', '#059669', '#34D399'], tc: '#fff', bg: '#E7F1EB', label: 'WEDNESDAY', code: 'WED / 04' },
  thu: { g: ['#C2410C', '#EA580C', '#FB923C'], tc: '#fff', bg: '#F7E9DE', label: 'THURSDAY', code: 'THU / 05' },
  fri: { g: ['#1D4ED8', '#3B82F6', '#60A5FA'], tc: '#fff', bg: '#E8EFF7', label: 'FRIDAY', code: 'FRI / 06' },
  sat: { g: ['#6D28D9', '#7C3AED', '#A78BFA'], tc: '#fff', bg: '#EEEAF7', label: 'SATURDAY', code: 'SAT / 07' },
};

function defaultPreset() {
  return DAYS[new Date().getDay()];
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
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? '#111111' : '#ffffff';
}

function cols(n) {
  if (n === 1) return 1;
  if (n <= 3) return n;
  return 3;
}

function inputError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export async function readImageMetadata(files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw inputError('NO_IMAGES', 'No images uploaded');
  }

  let totalPixels = 0;
  const metas = await Promise.all(files.map(async (file) => {
    let meta;
    try {
      meta = await sharp(file.path, {
        limitInputPixels: MAX_SOURCE_PIXELS,
        sequentialRead: true,
        failOn: 'error',
      }).metadata();
    } catch (error) {
      if (/pixel limit/i.test(String(error?.message || ''))) {
        throw inputError('IMAGE_TOO_LARGE', `Each image must be at most ${MAX_SOURCE_PIXELS / 1_000_000} megapixels`);
      }
      throw inputError('INVALID_IMAGE', 'One or more uploaded files are not valid images');
    }

    const width = meta?.width || 0;
    const height = meta?.height || 0;
    const pixels = width * height;
    if (!['jpeg', 'png', 'webp'].includes(meta?.format)) {
      throw inputError('INVALID_IMAGE_TYPE', 'Only JPEG, PNG, and WEBP images are supported');
    }
    if (pixels <= 0 || pixels > MAX_SOURCE_PIXELS) {
      throw inputError('IMAGE_TOO_LARGE', `Each image must be at most ${MAX_SOURCE_PIXELS / 1_000_000} megapixels`);
    }
    if (Math.max(width, height) / Math.min(width, height) > MAX_ASPECT_RATIO) {
      throw inputError('IMAGE_ASPECT_RATIO', `Image aspect ratio must not exceed ${MAX_ASPECT_RATIO}:1`);
    }
    totalPixels += pixels;
    return meta;
  }));

  if (totalPixels > MAX_TOTAL_SOURCE_PIXELS) {
    throw inputError('TOTAL_IMAGE_PIXELS', `Combined image resolution must not exceed ${MAX_TOTAL_SOURCE_PIXELS / 1_000_000} megapixels`);
  }
  return metas;
}

function assertOutputHeight(height) {
  if (!Number.isFinite(height) || height <= 0 || height > MAX_OUTPUT_HEIGHT) {
    throw inputError('OUTPUT_TOO_LARGE', `Collage height must not exceed ${MAX_OUTPUT_HEIGHT}px`);
  }
}

function fmtDate(value) {
  if (value != null && typeof value !== 'string') {
    throw inputError('INVALID_DATE', 'Date must be a string');
  }
  const text = value?.trim() || '';
  if (text.length > 32) throw inputError('INVALID_DATE', 'Date is too long');
  let date = text ? new Date(text + 'T00:00:00') : new Date();
  if (Number.isNaN(date.getTime())) date = new Date();
  return `วันที่ ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear() + 543}`;
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
<rect width="100%" height="100%" fill="url(#h)"/>
<rect y="100" width="100%" height="270" fill="#0b1020" fill-opacity=".25"/>
<rect y="${hh - 10}" width="100%" height="10" fill="${t.g[1]}"/>`;

  const metaSize = 28;
  const leftMeta = '7 DAYS';
  const rightMeta = `${t.code}  /  ${t.label}`;
  const rightWidth = font.getAdvanceWidth(rightMeta, metaSize);
  svg += `<g fill="rgba(255,255,255,.78)">${font.getPath(leftMeta, 96, 74, metaSize).toSVG(2)}</g>`;
  svg += `<g fill="rgba(255,255,255,.78)">${font.getPath(rightMeta, W - 96 - rightWidth, 74, metaSize).toSVG(2)}</g>`;
  svg += `<line x1="96" y1="98" x2="${W - 96}" y2="98" stroke="rgba(255,255,255,.28)" stroke-width="2"/>`;

  const ty = Math.round(hh * 0.55);
  if (name) {
    const pw = font.getAdvanceWidth(name, 124);
    svg += `<g fill="${t.tc}">${font.getPath(name, Math.max(0, (W - pw) / 2), ty, 124).toSVG(2)}</g>`;
  }
  if (date) {
    const dy = name ? ty + 110 : Math.round(hh * 0.55) + 20;
    const pw = font.getAdvanceWidth(date, 64);
    svg += `<g fill="rgba(255,255,255,.9)">${font.getPath(date, Math.max(0, (W - pw) / 2), dy, 64).toSVG(2)}</g>`;
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
    if (shadowCache.size >= SHADOW_CACHE_LIMIT) {
      shadowCache.delete(shadowCache.keys().next().value);
    }
    shadowCache.set(key, await sharp(Buffer.from(svg)).blur(SB).png().toBuffer());
  }
  return shadowCache.get(key);
}

function cardBgSVG(w, h, accent) {
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${CR}" fill="#fff" stroke="${accent}" stroke-opacity=".22" stroke-width="2"/></svg>`;
}

function cardMarkSVG(w, h, accent, index) {
  const label = String(index).padStart(2, '0');
  const x = 20;
  const y = 1;
  const tagW = 52;
  const tagH = 22;
  const ink = contrastTextOn(accent);
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${x}" y="${y}" width="${tagW}" height="${tagH}" rx="6" fill="${accent}"/>
    <rect x="${x}" y="${y}" width="5" height="${tagH}" rx="2.5" fill="${ink}" fill-opacity=".34"/>
    <g fill="${ink}">${font.getPath(label, x + 14, y + 17, 16).toSVG(2)}</g>
    <line x1="${x + tagW + 10}" y1="${y + tagH / 2}" x2="${x + tagW + 48}" y2="${y + tagH / 2}" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
}

function maskSVG(w, h) {
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="${h}" rx="${IR}" fill="#fff"/></svg>`;
}

export async function roundImage(buf, w, h, contentW) {
  // Allow upscale up to 3x the original size to fill the card.
  // Capping prevents pixelation from extremely small sources (e.g. 50px LINE thumbnails).
  const upscaleCap = 3;
  const targetW = w < contentW ? Math.min(contentW, Math.round(w * upscaleCap)) : contentW;
  const targetH = Math.round(targetW * h / w);
  const resized = await sharp(buf, {
    limitInputPixels: MAX_SOURCE_PIXELS,
    sequentialRead: true,
    failOn: 'error',
  })
    .resize(targetW, targetH, {
      fit: 'fill',
      kernel: 'lanczos3',
    })
    .png()
    .toBuffer();
  const rmeta = await sharp(resized, { limitInputPixels: MAX_SOURCE_PIXELS }).metadata();
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
  if (name != null && typeof name !== 'string') {
    throw inputError('INVALID_NAME', 'Name must be a string');
  }
  name = name?.trim() || '';
  if (name.length > 80) throw inputError('INVALID_NAME', 'Name must not exceed 80 characters');

  date = fmtDate(date);
  if (!preset || !THEMES[preset]) preset = defaultPreset();
  const metas = await readImageMetadata(files);

  // Theme manifests use the shared image pipeline. 7 DAYS/default keeps the legacy renderer.
  const themeId = String(theme || '').toLowerCase();
  const themedManifest = THEME_MANIFESTS[themeId];
  if (themedManifest) {
    return createThemedCollage(files, name, date, preset, themedManifest, metas);
  }

  const t = THEMES[preset];
  const count = files.length;

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
  assertOutputHeight(totalH);

  const composites = [];

  composites.push({ input: Buffer.from(headerSVG(name, date, HEADER_H, t)), top: 0, left: 0 });
  composites.push({ input: Buffer.from(dividerSVG(t.g[2])), top: HEADER_H, left: 0 });

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
    composites.push({ input: Buffer.from(cardBgSVG(cardW, ch, t.g[1])), top: actualY, left: x });
    // Center the (possibly smaller) image inside the card's content area.
    const cx = x + CP + Math.max(0, Math.round((dims[i].iw - imgs[i].w) / 2));
    const cy = actualY + CP + Math.max(0, Math.round((dims[i].ih - imgs[i].h) / 2));
    composites.push({ input: imgs[i].buf, top: cy, left: cx });
    composites.push({ input: Buffer.from(cardMarkSVG(cardW, ch, t.g[1], i + 1)), top: actualY, left: x });
  }

  const bgc = parseInt(t.bg.slice(1), 16);
  const base = sharp({
    create: { width: W, height: totalH, channels: 4, background: { r: (bgc >> 16) & 255, g: (bgc >> 8) & 255, b: bgc & 255, alpha: 1 } },
  });

  return base.composite(composites).sharpen({ sigma: 1.5 }).jpeg({ quality: 100, chromaSubsampling: '4:4:4' }).toBuffer();
}

/* =============================================================================
   THEMED RENDERING
   -----------------------------------------------------------------------------
   Same masonry layout and proportional image pipeline for every visual theme.
   A manifest can change only the chrome around the photos, never their order,
   aspect ratio, or scale. 7 DAYS/default keeps the original day-gradient path.
   ============================================================================= */
export async function createThemedCollage(files, name, date, preset, manifest, metas) {
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
  assertOutputHeight(totalH);

  // pixel-space card rects (for sharp-renderer)
  const cards = placements.map(p => ({ x: p.x, y: contentY + p.y, w: cardW, h: p.ch }));

  // 1. backdrop: bg gradient/flat + header + cell chips
  const backdropSVG = renderBackdrop(manifest, { W, H: totalH, headerH: HEADER_H, name, date, cards, preset });
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
  const usesPreset = Boolean(manifest.canvas.dayStrip);
  const fgSVG = renderForeground(manifest, { W, H: totalH, cards, preset: usesPreset ? preset : null });

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
  for (const id of ['calendar', 'claude', 'lumen', 'post', 'studio', 'cinema', 'velvet']) {
    const { manifest } = await import(`./design-system/themes/${id}/manifest.js`);
    if (manifest) THEME_MANIFESTS[id] = manifest;
  }
} catch (e) {
  console.error('[collage] theme manifest load failed:', e.message);
}
export const SUPPORTED_THEME_IDS = Object.freeze(['min', ...Object.keys(THEME_MANIFESTS)]);
export const SUPPORTED_PRESET_IDS = Object.freeze(Object.keys(THEMES));
const { renderBackdrop, renderForeground, getPhotoFx } = await import('./design-system/core/sharp-renderer.js');
