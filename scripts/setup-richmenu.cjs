/**
 * Create + upload + link a default rich menu for the collage LINE bot.
 *
 * Usage:
 *   NODE_PATH=backend/node_modules:frontend/node_modules \
 *     LINE_CHANNEL_ACCESS_TOKEN=xxx node scripts/setup-richmenu.cjs
 *
 * Produces a 2500x843 rich menu image ("DUSK" — twilight gradient matching the
 * STACK//FRAME web studio design, Thai labels in ChakraPetch) with three
 * tappable areas: ส่งรูปงาน (LIFF), บันทึกงาน (truck), ลูกค้า (data).
 */
const sharp = require('sharp');
const { Client } = require('@line/bot-sdk');
const { join, resolve } = require('path');
const { writeFileSync, rmSync } = require('fs');

const IMG_PATH = join(__dirname, 'richmenu.png');

const LIFF_ID = process.env.LIFF_ID || '2010606328-7UnH1Yre';
const TRUCK_URL = 'https://truck.mcky.space';
const DATA_URL = 'https://data.mcky.space';

// Rich menu canvas: 2500 x 843 px (LINE recommended ratio 2500x843 / 2500x1686).
const W = 2500;
const H = 843;
const COL = W / 3;

// DUSK palette — same design language as the web studio (frontend/style.css):
// dark surfaces, lime accent, thin borders. Gradient goes from deep indigo
// (top) down into near-black (bottom) like the sky after sunset.
const BG_TOP = '#221a3a';
const BG_MID = '#151129';
const BG_BOT = '#0a0a0c';
const SURFACE = '#17171b';
const SURFACE_2 = '#1e1e24';
const BORDER = '#2a2a32';
const INK = '#f4f4f0';
const INK_DIM = '#a1a1a8';
const INK_FAINT = '#6b6b74';
const ACCENT = '#c7f464'; // lime (web accent)

// ChakraPetch renders Thai + Latin and is the project's brand tech font.
const FONT_TH = resolve(__dirname, '../backend/design-system/fonts/ChakraPetch-SemiBold.ttf');

// Minimal line icons (24x24 grid, stroke-based, scale at render time).
const ICONS = {
  collage: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/>',
  truck: '<path d="M1 8h12v9H1z"/><path d="M13 11h5l3 3v3h-8"/><circle cx="5.5" cy="19" r="1.8"/><circle cx="16.5" cy="19" r="1.8"/>',
  data: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
};

const CELLS = [
  { num: '01', title: 'ส่งรูปงาน', sub: 'COLLAGE', icon: 'collage', uri: `https://liff.line.me/${LIFF_ID}` },
  { num: '02', title: 'บันทึกงาน', sub: 'TRUCK', icon: 'truck', uri: TRUCK_URL },
  { num: '03', title: 'เปิดหน้าลูกค้า', sub: 'CLIENT DATA', icon: 'data', uri: DATA_URL },
];

async function generateImage() {
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>
        @font-face { font-family: 'CP'; src: url('file://${FONT_TH}'); }
        .title { font-family: 'CP', sans-serif; fill: ${INK}; font-size: 74px; font-weight: 700; }
        .sub   { font-family: monospace; fill: ${ACCENT}; font-size: 34px; letter-spacing: 14px; }
        .num   { font-family: monospace; fill: ${INK_FAINT}; font-size: 34px; letter-spacing: 4px; }
        .mono  { font-family: monospace; font-size: 30px; letter-spacing: 6px; }
      </style>
      <linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${BG_TOP}"/>
        <stop offset="0.55" stop-color="${BG_MID}"/>
        <stop offset="1" stop-color="${BG_BOT}"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.5" cy="0.15" r="0.9">
        <stop offset="0" stop-color="${ACCENT}" stop-opacity="0.14"/>
        <stop offset="0.5" stop-color="#7c5cff" stop-opacity="0.08"/>
        <stop offset="1" stop-color="${BG_TOP}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="accentBar" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${ACCENT}"/>
        <stop offset="1" stop-color="#a78bfa"/>
      </linearGradient>
    </defs>

    <!-- dusk sky -->
    <rect width="${W}" height="${H}" fill="url(#dusk)"/>
    <rect width="${W}" height="${H}" fill="url(#glow)"/>

    <!-- horizon glow line -->
    <rect x="0" y="${H - 3}" width="${W}" height="3" fill="url(#accentBar)" opacity="0.8"/>

    <!-- brand strip -->
    <text class="mono" x="52" y="78" fill="${INK_DIM}">STACK<span fill="${ACCENT}">//</span>FRAME</text>
    <text class="mono" x="52" y="122" fill="${INK_FAINT}">DUSK_01 · COLLAGE STUDIO</text>

    ${CELLS.map((c, i) => {
      const x = i * COL;
      const cx = x + COL / 2;
      const pad = 36;
      const cw = COL - pad * 2;
      const cy0 = 165;
      const ch = H - cy0 - 60;
      return `
        <!-- cell -->
        <rect x="${x + pad}" y="${cy0}" width="${cw}" height="${ch}" rx="30" fill="${SURFACE}" opacity="0.92" stroke="${BORDER}" stroke-width="4"/>
        <!-- top accent tick -->
        <rect x="${x + pad + 34}" y="${cy0}" width="64" height="8" rx="4" fill="${ACCENT}"/>
        <!-- index -->
        <text class="num" x="${x + pad + 38}" y="${cy0 + 120}" text-anchor="middle">${c.num}</text>
        <!-- sub label -->
        <text class="sub" x="${cx}" y="${cy0 + 205}" text-anchor="middle">${c.sub}</text>
        <!-- icon -->
        <g transform="translate(${cx - 60}, ${cy0 + 250}) scale(5)" fill="none" stroke="${ACCENT}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.icon]}</g>
        <!-- divider -->
        <line x1="${x + pad + 60}" y1="${cy0 + ch - 250}" x2="${x + pad + cw - 60}" y2="${cy0 + ch - 250}" stroke="${BORDER}" stroke-width="3"/>
        <!-- title -->
        <text class="title" x="${cx}" y="${cy0 + ch - 120}" text-anchor="middle">${c.title}</text>
      `;
    }).join('')}
  </svg>`;

  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toFile(IMG_PATH);

  console.log(`Rich menu image written: ${IMG_PATH}`);
}

async function main() {
  const imageOnly = process.argv.includes('--image-only');
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN && !imageOnly) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN is required (or pass --image-only to just render the PNG)');
  }

  await generateImage();

  if (imageOnly) {
    console.log(`[image-only] ${IMG_PATH}`);
    return;
  }

  const client = new Client({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  });

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
