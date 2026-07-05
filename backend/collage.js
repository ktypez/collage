import sharp from 'sharp';
import opentype from 'opentype.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const CANVAS_WIDTH = 2000;
const HEADER_HEIGHT = 260;
const PADDING = 25;
const CELL_RATIO = 1;

const BG = { r: 229, g: 230, b: 230, alpha: 1 };

const font = opentype.parse(readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'NotoSansThai.ttf')
));

function getGrid(count) {
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const cellW = Math.floor((CANVAS_WIDTH - (cols + 1) * PADDING) / cols);
  const cellH = Math.floor(cellW * CELL_RATIO);
  const gridH = rows * cellH + (rows + 1) * PADDING;
  const totalH = HEADER_HEIGHT + gridH;

  const boxes = Array.from({ length: count }, (_, i) => ({
    left: PADDING + (i % cols) * (cellW + PADDING),
    top: PADDING + Math.floor(i / cols) * (cellH + PADDING),
    width: cellW,
    height: cellH,
  }));

  return { boxes, totalH };
}

function buildTextSvg(name, date, nameSize, dateSize, canvasH) {
  const parts = [`<svg width="${CANVAS_WIDTH}" height="${HEADER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">`];

  parts.push(`<defs>
    <linearGradient id="hGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f5f5f5"/>
      <stop offset="100%" stop-color="#e0e0e0"/>
    </linearGradient>
  </defs>`);

  parts.push(`<rect width="100%" height="100%" fill="url(#hGrad)"/>`);

  if (name) {
    const w = font.getAdvanceWidth(name, nameSize);
    const x = Math.max(0, (CANVAS_WIDTH - w) / 2);
    const path = font.getPath(name, x, 155, nameSize);
    parts.push(`<g fill="#1a1a1a">${path.toSVG(2)}</g>`);
  }

  if (date) {
    const w = font.getAdvanceWidth(date, dateSize);
    const x = Math.max(0, (CANVAS_WIDTH - w) / 2);
    const path = font.getPath(date, x, 215, dateSize);
    parts.push(`<g fill="#999999">${path.toSVG(2)}</g>`);
  }

  parts.push(`<line x1="40" y1="${HEADER_HEIGHT - 2}" x2="${CANVAS_WIDTH - 40}" y2="${HEADER_HEIGHT - 2}" stroke="#d0d0d0" stroke-width="1"/>`);
  parts.push('</svg>');
  return parts.join('\n');
}

export async function createCollage(files, name, date) {
  const count = files.length;
  const { boxes, totalH } = getGrid(count);
  const composites = [];

  for (let i = 0; i < count; i++) {
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
    input: Buffer.from(buildTextSvg(name, date, 76, 44, totalH)),
    top: 0,
    left: 0,
  });

  const base = sharp({
    create: {
      width: CANVAS_WIDTH,
      height: totalH,
      channels: 4,
      background: BG,
    },
  });

  return base.composite(composites).jpeg({ quality: 90 }).toBuffer();
}
