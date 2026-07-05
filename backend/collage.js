import sharp from 'sharp';
import opentype from 'opentype.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const CANVAS_WIDTH = 1920;
const HEADER_HEIGHT = 250;
const OUTER_MARGIN = 16;
const GAP_X = 2;
const GAP_Y = 10;
const BORDER_WIDTH = 3;
const SHADOW_OFFSET = 3;
const SHADOW_BLUR = 4;

const BG = { r: 229, g: 230, b: 230, alpha: 1 };

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

function formatThaiDate(dateStr) {
  let d;
  if (dateStr && dateStr.trim()) {
    d = new Date(dateStr + 'T00:00:00');
  } else {
    d = new Date();
  }
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()];
  const year = d.getFullYear() + 543;
  return `วันที่ ${day} ${month} ${year}`;
}

const font = opentype.parse(readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'NotoSansThai.ttf')
));

function buildTextSvg(name, date, nameSize, dateSize, sepY) {
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
    const path = font.getPath(name, x, 148, nameSize);
    parts.push(`<g fill="#1a1a1a">${path.toSVG(2)}</g>`);
  }

  if (date) {
    const w = font.getAdvanceWidth(date, dateSize);
    const x = Math.max(0, (CANVAS_WIDTH - w) / 2);
    const path = font.getPath(date, x, 200, dateSize);
    parts.push(`<g fill="#999999">${path.toSVG(2)}</g>`);
  }

  parts.push(`<line x1="0" y1="${sepY}" x2="${CANVAS_WIDTH}" y2="${sepY}" stroke="#b8b8b8" stroke-width="2"/>`);
  parts.push('</svg>');
  return parts.join('\n');
}

export async function createCollage(files, name, date) {
  date = formatThaiDate(date);
  const count = files.length;

  const metas = await Promise.all(
    files.map(f => sharp(f.path).metadata())
  );

  const avgRatio = metas.reduce((sum, m) => sum + m.width / m.height, 0) / count;
  const cellRatio = Math.max(0.3, Math.min(3.0, avgRatio));

  const cols = count <= 3 ? count : Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const cellW = Math.floor((CANVAS_WIDTH - 2 * OUTER_MARGIN - (cols - 1) * GAP_X) / cols);
  const cellH = Math.floor(cellW / cellRatio);

  const gridH = 2 * OUTER_MARGIN + rows * cellH + (rows - 1) * GAP_Y;
  const totalH = HEADER_HEIGHT + gridH;

  const composites = [];

  // Generate reusable shadow and white background (same size for all cells)
  const [shadowTile, whiteTile] = await Promise.all([
    sharp({
      create: { width: cellW, height: cellH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.35 } },
    }).blur(SHADOW_BLUR).png().toBuffer(),
    sharp({
      create: { width: cellW, height: cellH, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
    }).jpeg().toBuffer(),
  ]);

  // Process all images in parallel
  const imgTasks = [];
  for (let i = 0; i < count; i++) {
    const meta = metas[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const box = {
      left: OUTER_MARGIN + col * (cellW + GAP_X),
      top: OUTER_MARGIN + row * (cellH + GAP_Y),
      width: cellW,
      height: cellH,
    };
    composites.push(
      { input: shadowTile, top: box.top + HEADER_HEIGHT + SHADOW_OFFSET, left: box.left + SHADOW_OFFSET },
      { input: whiteTile, top: box.top + HEADER_HEIGHT, left: box.left },
    );
    const innerW = cellW - BORDER_WIDTH * 2;
    const innerH = cellH - BORDER_WIDTH * 2;
    const scale = Math.min(innerW / meta.width, innerH / meta.height);
    const rw = Math.round(meta.width * scale);
    const rh = Math.round(meta.height * scale);
    imgTasks.push(
      sharp(files[i].path).resize(rw, rh, { fit: 'inside' }).toBuffer()
        .then(buf => ({
          input: buf,
          top: Math.round(box.top + (cellH - rh) / 2) + HEADER_HEIGHT,
          left: Math.round(box.left + (cellW - rw) / 2),
        }))
    );
  }

  composites.push(...await Promise.all(imgTasks));

  composites.push({
    input: Buffer.from(buildTextSvg(name, date, 85, 32, HEADER_HEIGHT - 2)),
    top: 0,
    left: 0,
  });

  // Canvas outer border
  const borderSvg = `<svg width="${CANVAS_WIDTH}" height="${totalH}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.5" y="0.5" width="${CANVAS_WIDTH - 1}" height="${totalH - 1}" fill="none" stroke="#b0b0b0" stroke-width="1"/>
  </svg>`;
  composites.push({
    input: Buffer.from(borderSvg),
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
