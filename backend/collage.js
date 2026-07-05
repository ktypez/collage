import sharp from 'sharp';
import opentype from 'opentype.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const CANVAS_WIDTH = 3840;
const HEADER_HEIGHT = 500;
const PAD_X = 4;
const PAD_Y = 20;

const BG = { r: 229, g: 230, b: 230, alpha: 1 };

const font = opentype.parse(readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'NotoSansThai.ttf')
));

function buildTextSvg(name, date, nameSize, dateSize) {
  const parts = [`<svg width="${CANVAS_WIDTH}" height="${HEADER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">`];

  parts.push(`<defs>
    <linearGradient id="hGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fafafa"/>
      <stop offset="100%" stop-color="#ececec"/>
    </linearGradient>
  </defs>`);

  parts.push(`<rect width="100%" height="100%" fill="url(#hGrad)"/>`);

  if (name) {
    const w = font.getAdvanceWidth(name, nameSize);
    const x = Math.max(0, (CANVAS_WIDTH - w) / 2);
    const path = font.getPath(name, x, 295, nameSize);
    parts.push(`<g fill="#1a1a1a">${path.toSVG(2)}</g>`);
  }

  if (date) {
    const w = font.getAdvanceWidth(date, dateSize);
    const x = Math.max(0, (CANVAS_WIDTH - w) / 2);
    const path = font.getPath(date, x, 400, dateSize);
    parts.push(`<g fill="#999999">${path.toSVG(2)}</g>`);
  }

  parts.push(`<line x1="0" y1="${HEADER_HEIGHT - 3}" x2="${CANVAS_WIDTH}" y2="${HEADER_HEIGHT - 3}" stroke="#b8b8b8" stroke-width="4"/>`);
  parts.push('</svg>');
  return parts.join('\n');
}

export async function createCollage(files, name, date) {
  const count = files.length;

  const metas = await Promise.all(
    files.map(f => sharp(f.path).metadata())
  );

  const avgRatio = metas.reduce((sum, m) => sum + m.width / m.height, 0) / count;
  const cellRatio = Math.max(0.3, Math.min(3.0, avgRatio));

  const cols = count <= 3 ? count : Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const cellW = Math.floor((CANVAS_WIDTH - (cols + 1) * PAD_X) / cols);
  const cellH = Math.floor(cellW / cellRatio);

  const gridH = rows * cellH + 2 * PAD_X + (rows - 1) * PAD_Y;
  const totalH = HEADER_HEIGHT + gridH;

  const composites = [];

  for (let i = 0; i < count; i++) {
    const meta = metas[i];
    const col = i % cols;
    const row = Math.floor(i / cols);

    const box = {
      left: PAD_X + col * (cellW + PAD_X),
      top: PAD_X + row * (cellH + PAD_Y),
      width: cellW,
      height: cellH,
    };

    const scale = Math.min(box.width / meta.width, box.height / meta.height);
    const rw = Math.round(meta.width * scale);
    const rh = Math.round(meta.height * scale);

    const buf = await sharp(files[i].path)
      .resize(rw, rh, { fit: 'inside' })
      .toBuffer();

    composites.push({
      input: buf,
      top: Math.round(box.top + (box.height - rh) / 2) + HEADER_HEIGHT,
      left: Math.round(box.left + (box.width - rw) / 2),
    });
  }

  composites.push({
    input: Buffer.from(buildTextSvg(name, date, 170, 64)),
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

  return base.composite(composites).jpeg({ quality: 95 }).toBuffer();
}
