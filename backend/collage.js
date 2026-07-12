import sharp from 'sharp';
import opentype from 'opentype.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

sharp.concurrency(1);

const W = 1080;

const HEADER_H = 220;
const DH = 8;
const PT = 40;
const PS = 48;
const PB = 48;
const G = 24;
const CP = 12;
const CR = 24;
const IR = 18;
const SY = 8;
const SB = 24;
const SA = 0.12;
const JPG_Q = 90;

const MONTHS = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
];

const DAYS = ['sun','mon','tue','wed','thu','fri','sat'];

const THEMES = {
  sun: { g: ['#3B050A','#8F1018','#B81E28'], d: '#F0B400', tc: '#fff', bg: '#F5ECEC' },
  mon: { g: ['#4A3000','#8B6914','#C9A96E'], d: '#8B4513', tc: '#fff', bg: '#F5F0E8' },
  tue: { g: ['#4A0E2E','#8B1A5E','#C4448E'], d: '#FFD700', tc: '#fff', bg: '#F5ECF0' },
  wed: { g: ['#043528','#0A6B53','#0E8F6E'], d: '#F4C430', tc: '#fff', bg: '#ECF5F0' },
  thu: { g: ['#4A1500','#8B3A0E','#C86A2C'], d: '#E8A020', tc: '#fff', bg: '#F5EEE8' },
  fri: { g: ['#052040','#0B3C87','#1A5FBF'], d: '#5AAEFF', tc: '#fff', bg: '#ECF0F5' },
  sat: { g: ['#2A0F4A','#6B2FB8','#9B5FE0'], d: '#FFB6FF', tc: '#fff', bg: '#F0ECF5' },
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
    const pw = font.getAdvanceWidth(name, 64);
    svg += `<g fill="${t.tc}">${font.getPath(name, Math.max(0, (W - pw) / 2), ty, 64).toSVG(2)}</g>`;
  }
  if (date) {
    const dy = name ? ty + 57 : Math.round(hh * 0.55) + 10;
    const pw = font.getAdvanceWidth(date, 34);
    svg += `<g fill="rgba(255,255,255,.9)">${font.getPath(date, Math.max(0, (W - pw) / 2), dy, 34).toSVG(2)}</g>`;
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
  const rh = Math.round(contentW * h / w);
  // Never upscale a small source (LINE-compressed photos) — that is the main cause
  // of blurry results. If the source is smaller than the card, keep its native size
  // and it will be centered inside the card. Use lanczos3 for crisp downscaling.
  const resized = await sharp(buf)
    .resize(contentW, rh, {
      fit: 'fill',
      withoutEnlargement: true,
      kernel: 'lanczos3',
    })
    .png()
    .toBuffer();
  const rmeta = await sharp(resized).metadata();
  // If the source was smaller than the card (no upscale applied), center it inside
  // the card area so there is no offset / empty gap on one side.
  const padX = Math.max(0, Math.round((contentW - rmeta.width) / 2));
  const padY = Math.max(0, Math.round((rh - rmeta.height) / 2));
  const mask = Buffer.from(maskSVG(contentW, rh));
  const rounded = await sharp({
    create: { width: contentW, height: rh, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: resized, top: padY, left: padX },
      { input: mask, top: 0, left: 0, blend: 'dest-in' },
    ])
    .png()
    .toBuffer();
  return { buf: rounded, w: rmeta.width, h: rmeta.height };
}

export async function createCollage(files, name, date, preset) {
  date = fmtDate(date);
  if (!preset || !THEMES[preset]) preset = defaultPreset();
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

  return base.composite(composites).jpeg({ quality: JPG_Q, mozjpeg: true }).toBuffer();
}
