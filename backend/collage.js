import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 2000;
const TEXT_HEIGHT = 200;
const IMAGE_AREA_HEIGHT = CANVAS_HEIGHT - TEXT_HEIGHT;
const PADDING = 25;

const BG = { r: 229, g: 230, b: 230, alpha: 1 };

const FONT_BASE64 = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'Loma.otf')
).toString('base64');

function getImageBoxes(count) {
  const W = CANVAS_WIDTH;
  const H = IMAGE_AREA_HEIGHT;
  const P = PADDING;

  if (count === 1) {
    return [{ left: P, top: P, width: W - 2 * P, height: H - 2 * P }];
  }

  if (count === 2) {
    const cw = (W - 3 * P) / 2;
    return [
      { left: P, top: P, width: cw, height: H - 2 * P },
      { left: 2 * P + cw, top: P, width: cw, height: H - 2 * P },
    ];
  }

  if (count === 3) {
    const topH = (H - 3 * P) * 0.55;
    const botH = (H - 3 * P) * 0.45;
    const botW = (W - 3 * P) / 2;
    return [
      { left: P, top: P, width: W - 2 * P, height: topH },
      { left: P, top: 2 * P + topH, width: botW, height: botH },
      { left: 2 * P + botW, top: 2 * P + topH, width: botW, height: botH },
    ];
  }

  const cols = count <= 4 ? 2 : Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const cellW = (W - (cols + 1) * P) / cols;
  const cellH = (H - (rows + 1) * P) / rows;

  return Array.from({ length: count }, (_, i) => ({
    left: P + (i % cols) * (cellW + P),
    top: P + Math.floor(i / cols) * (cellH + P),
    width: cellW,
    height: cellH,
  }));
}

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildTextSvg(name, date) {
  return `<svg width="${CANVAS_WIDTH}" height="${TEXT_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <style>
      @font-face {
        font-family: 'LomaEmbedded';
        src: url(data:application/x-font-opentype;base64,${FONT_BASE64}) format('opentype');
      }
    </style>
    <rect width="100%" height="100%" fill="#E5E6E6"/>
    <line x1="0" y1="0" x2="${CANVAS_WIDTH}" y2="0" stroke="#d0d0d0" stroke-width="2"/>
    <text x="50" y="130" font-family="LomaEmbedded, Tahoma, sans-serif" font-size="64" fill="#333" font-weight="bold">${escapeXml(name)}</text>
    <text x="${CANVAS_WIDTH - 50}" y="130" font-family="LomaEmbedded, Tahoma, sans-serif" font-size="52" fill="#666" text-anchor="end">${escapeXml(date)}</text>
  </svg>`;
}

export async function createCollage(files, name, date) {
  const boxes = getImageBoxes(files.length);
  const composites = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const box = boxes[i];
    const meta = await sharp(file.path).metadata();

    const scale = Math.min(box.width / meta.width, box.height / meta.height);
    const rw = Math.round(meta.width * scale);
    const rh = Math.round(meta.height * scale);

    const buf = await sharp(file.path)
      .resize(rw, rh, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();

    composites.push({
      input: buf,
      top: Math.round(box.top + (box.height - rh) / 2),
      left: Math.round(box.left + (box.width - rw) / 2),
    });
  }

  composites.push({
    input: Buffer.from(buildTextSvg(name, date)),
    top: IMAGE_AREA_HEIGHT,
    left: 0,
  });

  const base = sharp({
    create: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      channels: 4,
      background: BG,
    },
  });

  return base.composite(composites).jpeg({ quality: 90 }).toBuffer();
}
