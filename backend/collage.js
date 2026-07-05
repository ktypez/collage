import sharp from 'sharp';
import opentype from 'opentype.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const CANVAS_WIDTH = 1920;
const HEADER_HEIGHT = 300;
const OUTER_MARGIN = 20;
const GAP_X = 24;
const GAP_Y = 24;
const BORDER_WIDTH = 4;
const SHADOW_OFFSET = 4;
const SHADOW_BLUR = 5;
const IMG_SCALE = 0.90;

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const PRESETS = {
  ocean: {
    grad: ['#4facfe', '#00f2fe'],
    nameColor: '#ffffff', dateColor: '#e0f7ff',
    sepColor: '#ffffff', sepOpacity: 0.4, bg: '#e8eaed',
  },
  sunset: {
    grad: ['#f093fb', '#f5576c'],
    nameColor: '#ffffff', dateColor: '#ffe0f0',
    sepColor: '#ffffff', sepOpacity: 0.35, bg: '#f5e6ed',
  },
  midnight: {
    grad: ['#141e30', '#243b55'],
    nameColor: '#ffffff', dateColor: '#a0b4d0',
    sepColor: '#ffffff', sepOpacity: 0.25, bg: '#e0e4ea',
  },
  gold: {
    grad: ['#fceabb', '#f8b500'],
    nameColor: '#3d2e00', dateColor: '#6b5700',
    sepColor: '#8a7300', sepOpacity: 0.5, bg: '#f0ede0',
  },
  mint: {
    grad: ['#a8edea', '#fed6e3'],
    nameColor: '#2a5a52', dateColor: '#7a5a6a',
    sepColor: '#7a9a92', sepOpacity: 0.4, bg: '#eaf0ee',
  },
};

function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255, alpha: 1 };
}

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

function buildTextSvg(name, date, nameSize, dateSize, sepY, c) {
  const parts = [`<svg width="${CANVAS_WIDTH}" height="${HEADER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">`];

  parts.push(`<defs>
    <linearGradient id="hGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${c.grad[0]}"/>
      <stop offset="100%" stop-color="${c.grad[1]}"/>
    </linearGradient>
  </defs>`);

  parts.push(`<rect width="100%" height="100%" fill="url(#hGrad)"/>`);

  if (name) {
    const w = font.getAdvanceWidth(name, nameSize);
    const x = Math.max(0, (CANVAS_WIDTH - w) / 2);
    const path = font.getPath(name, x, 185, nameSize);
    parts.push(`<g fill="${c.nameColor}">${path.toSVG(2)}</g>`);
  }

  if (date) {
    const w = font.getAdvanceWidth(date, dateSize);
    const x = Math.max(0, (CANVAS_WIDTH - w) / 2);
    const path = font.getPath(date, x, 250, dateSize);
    parts.push(`<g fill="${c.dateColor}">${path.toSVG(2)}</g>`);
  }

  parts.push(`<line x1="0" y1="${sepY}" x2="${CANVAS_WIDTH}" y2="${sepY}" stroke="${c.sepColor}" stroke-width="2" opacity="${c.sepOpacity}"/>`);
  parts.push('</svg>');
  return parts.join('\n');
}

export async function createCollage(files, name, date, preset = 'ocean') {
  date = formatThaiDate(date);
  const colors = PRESETS[preset] || PRESETS.ocean;
  const bg = hexToRgb(colors.bg);
  const count = files.length;

  const metas = await Promise.all(
    files.map(f => sharp(f.path).metadata())
  );

  const avgRatio = metas.reduce((sum, m) => sum + m.width / m.height, 0) / count;
  const cellRatio = Math.max(0.3, Math.min(3.0, avgRatio));

  const cols = count <= 2 ? count : Math.max(3, Math.ceil(Math.sqrt(count)));
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
    const innerW = (cellW - BORDER_WIDTH * 2) * IMG_SCALE;
    const innerH = (cellH - BORDER_WIDTH * 2) * IMG_SCALE;
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
    input: Buffer.from(buildTextSvg(name, date, 92, 34, HEADER_HEIGHT - 3, colors)),
    top: 0,
    left: 0,
  });

  // Canvas outer border
  const borderSvg = `<svg width="${CANVAS_WIDTH}" height="${totalH}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.5" y="0.5" width="${CANVAS_WIDTH - 1}" height="${totalH - 1}" fill="none" stroke="${colors.sepColor}" stroke-width="1" opacity="${Math.min(1, colors.sepOpacity + 0.2)}"/>
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
      background: bg,
    },
  });

  return base.composite(composites).jpeg({ quality: 90 }).toBuffer();
}
