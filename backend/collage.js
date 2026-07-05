import sharp from 'sharp';
import opentype from 'opentype.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 2000;
const TEXT_HEIGHT = 200;
const IMAGE_AREA_HEIGHT = CANVAS_HEIGHT - TEXT_HEIGHT;
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

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildTextSvg(name, date) {
  const margin = 50;
  const baselineY = 135;
  const nameSize = 64;
  const dateSize = 52;

  let namePathData = '';
  let datePathData = '';

  if (name) {
    const path = font.getPath(name, margin, baselineY, nameSize);
    namePathData = path.toSVG(2);
  }

  if (date) {
    const advance = font.getAdvanceWidth(date, dateSize);
    const x = CANVAS_WIDTH - margin - advance;
    const path = font.getPath(date, x, baselineY, dateSize);
    datePathData = path.toSVG(2);
  }

  return `<svg width="${CANVAS_WIDTH}" height="${TEXT_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#E5E6E6"/>
    <line x1="0" y1="0" x2="${CANVAS_WIDTH}" y2="0" stroke="#d0d0d0" stroke-width="2"/>
    <g fill="#333333">${namePathData}</g>
    <g fill="#666666">${datePathData}</g>
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
