import sharp from 'sharp';
import opentype from 'opentype.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 2000;
const HEADER_HEIGHT = 260;
const IMAGE_AREA_HEIGHT = CANVAS_HEIGHT - HEADER_HEIGHT;
const PADDING = 25;

const BG = { r: 229, g: 230, b: 230, alpha: 1 };

const font = opentype.parse(readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'NotoSansThai.ttf')
));

function getImageBoxes(count) {
  const W = CANVAS_WIDTH;
  const H = IMAGE_AREA_HEIGHT;
  const P = PADDING;

  if (count === 0) return [];

  const cols = Math.ceil(Math.sqrt(count));
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

function buildTextSvg(name, date, nameSize, dateSize) {
  const svgParts = [`<svg width="${CANVAS_WIDTH}" height="${HEADER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">`];

  svgParts.push(`<defs>
    <linearGradient id="headerGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f0f0f0"/>
      <stop offset="100%" stop-color="#e0e0e0"/>
    </linearGradient>
  </defs>`);

  svgParts.push(`<rect width="100%" height="100%" fill="url(#headerGrad)"/>`);

  if (name) {
    const w = font.getAdvanceWidth(name, nameSize);
    const x = (CANVAS_WIDTH - w) / 2;
    const path = font.getPath(name, x, 155, nameSize);
    svgParts.push(`<g fill="#1a1a1a">${path.toSVG(2)}</g>`);
  }

  if (date) {
    const w = font.getAdvanceWidth(date, dateSize);
    const x = (CANVAS_WIDTH - w) / 2;
    const path = font.getPath(date, x, 215, dateSize);
    svgParts.push(`<g fill="#888888">${path.toSVG(2)}</g>`);
  }

  svgParts.push(`<line x1="30" y1="${HEADER_HEIGHT - 2}" x2="${CANVAS_WIDTH - 30}" y2="${HEADER_HEIGHT - 2}" stroke="#c8c8c8" stroke-width="2"/>`);
  svgParts.push('</svg>');
  return svgParts.join('\n');
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
      top: Math.round(box.top + (box.height - rh) / 2) + HEADER_HEIGHT,
      left: Math.round(box.left + (box.width - rw) / 2),
    });
  }

  composites.push({
    input: Buffer.from(buildTextSvg(name, date, 76, 44)),
    top: 0,
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
