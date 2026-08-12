/**
 * Create + upload + link a default rich menu for the collage LINE bot.
 *
 * Usage:
 *   NODE_PATH=backend/node_modules:frontend/node_modules \
 *     LINE_CHANNEL_ACCESS_TOKEN=xxx node scripts/setup-richmenu.cjs
 *
 * Produces a 2500x843 rich menu image (STACK//FRAME dark theme, Thai labels)
 * with three tappable areas: ส่งรูปงาน (LIFF), บันทึกงาน (truck), ลูกค้า (data).
 */
const sharp = require('sharp');
const { Client } = require('@line/bot-sdk');
const { join } = require('path');
const { writeFileSync, rmSync } = require('fs');

const IMG_PATH = join(__dirname, 'richmenu.png');

const LIFF_ID = process.env.LIFF_ID || '2010606328-7UnH1Yre';
const TRUCK_URL = 'https://truck.mcky.space';
const DATA_URL = 'https://data.mcky.space';

// Rich menu canvas: 2500 x 843 px (LINE recommended ratio 2500x843 / 2500x1686).
const W = 2500;
const H = 843;
const COL = W / 3;

// Brand palette (STACK//FRAME)
const BG = '#0a0a0c';
const BORDER = '#2a2a32';
const FG = '#f5f5f7';
const ACCENT = '#ffb000'; // amber accent
const RED = '#B91C1C';

async function generateImage() {
  const font = '/usr/share/fonts/droid-nonlatin/DroidSansThai.ttf';

  const cells = [
    { label: '📸 ส่งรูปงาน', sub: 'COLLAGE', color: RED, uri: `https://liff.line.me/${LIFF_ID}` },
    { label: '🚛 บันทึกงาน', sub: 'TRUCK', color: '#1c4a3a', uri: TRUCK_URL },
    { label: '🥊 เปิดหน้าลูกค้า', sub: 'CLIENT DATA', color: '#3a2d14', uri: DATA_URL },
  ];

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>
        @font-face { font-family: 'Thai'; src: url('file://${font}'); }
        .label { font-family: 'Thai', sans-serif; fill: ${FG}; font-size: 84px; font-weight: bold; }
        .sub   { font-family: monospace; fill: ${ACCENT}; font-size: 40px; letter-spacing: 12px; }
      </style>
    </defs>
    <rect width="${W}" height="${H}" fill="${BG}"/>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${ACCENT}" stop-opacity="0.25"/>
      <stop offset="0.5" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="${ACCENT}" stop-opacity="0.1"/>
    </linearGradient>
    <rect width="${W}" height="${H}" fill="url(#g)" opacity="0.35"/>
    ${cells.map((c, i) => {
      const x = i * COL;
      return `
        <rect x="${x}" y="60" width="${COL - 40}" height="${H - 120}" rx="28" fill="${c.color}" stroke="${BORDER}" stroke-width="6"/>
        <rect x="${x}" y="60" width="${COL - 40}" height="12" rx="6" fill="${ACCENT}" opacity="0.85"/>
        <text class="sub" x="${x + COL / 2}" y="190" text-anchor="middle">${c.sub}</text>
        <text class="label" x="${x + COL / 2}" y="${H - 210}" text-anchor="middle">${c.label}</text>
      `;
    }).join('')}
  </svg>`;

  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toFile(IMG_PATH);

  console.log(`Rich menu image written: ${IMG_PATH}`);
}

async function main() {
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN is required');
  }

  const client = new Client({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  });

  await generateImage();

  // 3 vertical areas, each 1/3 of the width, full height.
  const targetUris = [
    `https://liff.line.me/${LIFF_ID}`,
    TRUCK_URL,
    DATA_URL,
  ];
  const areas = targetUris.map((uri, i) => ({
    bounds: { x: Math.round(i * COL), y: 0, width: Math.round(COL), height: H },
    action: { type: 'uri', uri },
  }));

  const richMenu = {
    size: { width: W, height: H },
    selected: true,
    name: 'STACK//FRAME หลัก',
    chatBarText: 'เมนู',
    areas,
  };

  const richMenuId = await client.createRichMenu(richMenu);
  console.log('Rich menu created:', richMenuId);

  const image = require('fs').readFileSync(IMG_PATH);
  await client.setRichMenuImage(richMenuId, image, 'image/png');
  console.log('Rich menu image uploaded:', image.length, 'bytes');

  await client.setDefaultRichMenu(richMenuId);
  console.log('Default rich menu set:', richMenuId);

  try { rmSync(IMG_PATH); } catch (e) {}
  console.log('DONE');
}

main().catch(err => {
  console.error('FAILED:', err.message || err);
  process.exit(1);
});
