import sharp from 'sharp';
import opentype from 'opentype.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

sharp.concurrency(1);

const W = 1080;
const MIN_H = 1350;
const HEADER_MIN = 220;
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
const JPG_Q = 85;

const MONTHS = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
];

const THEMES = {
  crimson:         { g: ['#3B050A','#8F1018','#C32029'], d: '#F0B400', tc: '#fff', bg: '#ECECEC' },
  'corporate-blue':{ g: ['#052040','#0B3C87','#1A5FBF'], d: '#5AAEFF', tc: '#fff', bg: '#ECECEC' },
  emerald:         { g: ['#043528','#0A6B53','#0E8F6E'], d: '#F4C430', tc: '#fff', bg: '#ECECEC' },
  dark:            { g: ['#000','#111','#2A2A2A'],         d: '#D4AF37', tc: '#fff', bg: '#ECECEC' },
  purple:          { g: ['#2A0F4A','#6B2FB8','#9B5FE0'], d: '#FFB6FF', tc: '#fff', bg: '#ECECEC' },
};

function cols(n) {
  if (n <= 3) return n;
  if (n === 4) return 2;
  if (n <= 9) return 3;
  return 4;
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
  const resized = await sharp(buf).resize(contentW, rh).toBuffer();
  const mask = Buffer.from(maskSVG(contentW, rh));
  return sharp({
    create: { width: contentW, height: rh, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: resized, top: 0, left: 0 },
      { input: mask, top: 0, left: 0, blend: 'dest-in' },
    ])
    .png()
    .toBuffer();
}

export async function createCollage(files, name, date, preset = 'crimson') {
  date = fmtDate(date);
  const t = THEMES[preset] || THEMES.crimson;
  const count = files.length;
  const c = cols(count);

  const usable = W - PS * 2;
  const cardW = Math.floor((usable - G * (c - 1)) / c);
  const iw = cardW - CP * 2;

  const metas = await Promise.all(files.map(f => sharp(f.path).metadata()));

  const dims = metas.map(m => {
    const ih = Math.round(iw * m.height / m.width);
    return { iw, ih, ch: ih + CP * 2 };
  });

  const rows = Math.ceil(count / c);
  let contentH = 0;
  for (let r = 0; r < rows; r++) {
    const s = r * c;
    const e = Math.min(s + c, count);
    const rh = Math.max(...dims.slice(s, e).map(d => d.ch));
    contentH += rh;
    if (r < rows - 1) contentH += G;
  }

  const rest = contentH + DH + PT + PB;
  let headerH = Math.max(HEADER_MIN, Math.round(rest * 0.19 / 0.81));
  let totalH = headerH + rest;
  if (totalH < MIN_H) {
    headerH = Math.max(HEADER_MIN, MIN_H - rest);
    totalH = MIN_H;
  }

  const composites = [];

  composites.push({ input: Buffer.from(headerSVG(name, date, headerH, t)), top: 0, left: 0 });
  composites.push({ input: Buffer.from(dividerSVG(t.d)), top: headerH, left: 0 });

  let contentY = headerH + DH + PT;

  for (let r = 0; r < rows; r++) {
    const s = r * c;
    const e = Math.min(s + c, count);
    const n = e - s;

    let rowOff = 0;
    if (r === rows - 1 && n < c) {
      rowOff = Math.floor((usable - (n * cardW + (n - 1) * G)) / 2);
    }

    const rh = Math.max(...dims.slice(s, e).map(d => d.ch));

    const imgs = await Promise.all(
      dims.slice(s, e).map((d, i) =>
        roundImage(files[s + i].path, metas[s + i].width, metas[s + i].height, d.iw)
      )
    );

    const pad = SB * 2;

    for (let i = 0; i < n; i++) {
      const x = PS + rowOff + i * (cardW + G);
      const y = contentY;
      const { ch } = dims[s + i];

      const shadow = await getShadow(cardW, ch);
      composites.push({ input: shadow, top: y + SY - pad / 2, left: x - pad / 2 });
      composites.push({ input: Buffer.from(cardBgSVG(cardW, ch)), top: y, left: x });
      composites.push({ input: imgs[i], top: y + CP, left: x + CP });
    }

    contentY += rh + G;
  }

  const base = sharp({
    create: { width: W, height: totalH, channels: 4, background: { r: 236, g: 236, b: 236, alpha: 1 } },
  });

  return base.composite(composites).jpeg({ quality: JPG_Q }).toBuffer();
}
