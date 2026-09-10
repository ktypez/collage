/**
 * Rich menu design showcase + deploy.
 *
 * Renders 4 distinct 2500x843 rich menu designs for the collage LINE bot and
 * composites them into preview images:
 *
 *   A. STUDIO 03  — clean "web edition" (lime on black, mirrors frontend)
 *   B. NEO GRID   — neon cyan/magenta tech (AI art bg + bezel + corner LEDs)
 *   C. FIELD 01   — cinematic work-site art (amber on dark, docu captions)
 *   D. EDITORIAL  — dark poster style (cream ink + orange, high contrast)
 *
 * All designs use near-black backgrounds.
 *
 * Layout: 4 top columns + one full-width bottom bar. Tap areas IDENTICAL in
 * every design (5 zones):
 *   1. ส่งรูปงาน      -> LIFF collage app              (top col 1)
 *   2. บันทึกงาน      -> truck.mcky.space              (top col 2)
 *   3. เปิดหน้าลูกค้า -> data.mcky.space                (top col 3)
 *   4. เปิด STS       -> oms.cfwenterprise.com/sts      (top col 4)
 *   5. เปิดสมาชิก     -> me.mcky.space                  (bottom full-width bar)
 *
 * Usage:
 *   NODE_PATH=backend/node_modules:frontend/node_modules node scripts/richmenu-designs.cjs
 *       [-o <outdir>]        default: frontend/previews/richmenu
 *       [--only a,b]         render a subset of {a,b,c,d}
 *       [--no-sheet]         skip the 2x2 contact sheet
 *       [--deploy <id>]      render <id>, then create+upload+set-default on LINE
 *
 * LINE deploy needs LINE_CHANNEL_ACCESS_TOKEN=xxx (also read from backend/.env).
 */
const sharp = require('sharp');
const { Client } = require('@line/bot-sdk');
const { join, resolve } = require('path');
const { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } = require('fs');

const LIFF_ID = process.env.LIFF_ID || '2010606328-7UnH1Yre';
const TRUCK_URL = 'https://truck.mcky.space';
const DATA_URL = 'https://data.mcky.space';
const PORTAL_URL = 'https://me.mcky.space';
const STS_URL = 'https://oms.cfwenterprise.com/sts';

const W = 2500;
const H = 843;
const COL = W / 4; // 625
const TOP_H = 643; // top columns tap height
const BAR_Y = 643; // bottom bar tap start
const BAR_H = H - BAR_Y; // 200

// Bottom full-width bar (visual box)
const BB_X0 = 30;
const BB_W = W - BB_X0 * 2; // 2440
const BB_Y = 652;
const BB_H = H - BB_Y - 24; // 167

const FONT_CP = resolve(__dirname, '../backend/design-system/fonts/ChakraPetch-SemiBold.ttf');
const FONT_CP_R = resolve(__dirname, '../backend/design-system/fonts/ChakraPetch-Regular.ttf');
const FONT_MONO = resolve(__dirname, '../backend/design-system/fonts/JetBrainsMono-Regular.ttf');

const CELLS = [
  { key: 'collage', num: '01', title: 'ส่งรูปงาน', sub: 'COLLAGE', uri: `https://liff.line.me/${LIFF_ID}` },
  { key: 'truck', num: '02', title: 'บันทึกงาน', sub: 'TRUCK', uri: TRUCK_URL },
  { key: 'data', num: '03', title: 'เปิดหน้าลูกค้า', sub: 'CLIENT DATA', uri: DATA_URL },
  { key: 'sts', num: '04', title: 'เปิด STS', sub: 'WORK WEB', icon: 'sts', uri: STS_URL },
];
const BARS = [
  { num: '05', title: 'เปิดสมาชิก', sub: 'PORTAL', icon: 'portal', uriShort: 'ME.MCKY.SPACE', uri: PORTAL_URL },
];

const ICONS = {
  collage:
    '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/>',
  truck:
    '<path d="M1 8h12v9H1z"/><path d="M13 11h5l3 3v3h-8"/><circle cx="5.5" cy="19" r="1.8"/><circle cx="16.5" cy="19" r="1.8"/>',
  data:
    '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  portal: '<rect x="8" y="6" width="8" height="12" rx="4"/><circle cx="11" cy="11" r="1.2"/>',
  sts: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 9h20"/><path d="M8 4v16"/>',
};

const defs = (extra = '') => `
  <defs>
    <style>
      @font-face { font-family:'CP'; src:url('file://${FONT_CP}'); font-weight:700; }
      @font-face { font-family:'CPR'; src:url('file://${FONT_CP_R}'); }
      @font-face { font-family:'JM'; src:url('file://${FONT_MONO}'); }
      ${extra}
    </style>
  </defs>`;

/* =============================================================================
   A — STUDIO 03 : mirrors the web app (frontend/style.css), solid black
   ============================================================================= */
const STUDIO = {
  id: 'a-studio',
  name: 'STUDIO 03',
  tag: 'WEB EDITION / LIME ON BLACK',
  palette: {
    bg: ['#0b0b0d', '#08080a', '#050506'],
    surface: '#101013',
    border: '#26262e',
    ink: '#f4f4f0',
    dim: '#a1a1a8',
    faint: '#5f5f68',
    accent: '#c7f464',
  },
};

function studioBase() {
  const p = STUDIO.palette;
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs(`
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${p.bg[0]}"/><stop offset="0.6" stop-color="${p.bg[1]}"/><stop offset="1" stop-color="${p.bg[2]}"/>
      </linearGradient>
      <radialGradient id="ease" cx="0.5" cy="0.08" r="0.9">
        <stop offset="0" stop-color="${p.accent}" stop-opacity="0.05"/>
        <stop offset="1" stop-color="${p.bg[0]}" stop-opacity="0"/>
      </radialGradient>`)}
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#ease)"/>
  </svg>`;
}

function studioOverlay() {
  const p = STUDIO.palette;
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs()}
    <text x="36" y="58" font-family="JM" font-size="22" letter-spacing="4" fill="${p.dim}">STACK<span fill="${p.accent}">//</span>FRAME</text>
    <text x="36" y="88" font-family="JM" font-size="18" letter-spacing="3" fill="${p.faint}">COLLAGE STUDIO // MENU</text>
    <text x="${W - 36}" y="58" text-anchor="end" font-family="JM" font-size="18" letter-spacing="4" fill="${p.faint}">A / 4+1</text>

    ${CELLS.map((c, i) => cardStudio(c, i, p)).join('')}
    ${barStudio(p)}
  </svg>`;
}

function cardStudio(c, i, p) {
  const x = i * COL;
  const cx = x + COL / 2;
  const pad = 24;
  const cw = COL - pad * 2;
  const cy0 = 116;
  const ch = TOP_H - cy0 - 22;
  const isPrimary = i === 0;
  return `
    <rect x="${x + pad}" y="${cy0}" width="${cw}" height="${ch}" rx="20" fill="${p.surface}" stroke="${p.border}" stroke-width="3"/>
    ${isPrimary
      ? `<rect x="${x + pad}" y="${cy0}" width="${cw}" height="7" fill="${p.accent}"/>`
      : `<rect x="${x + pad + 30}" y="${cy0}" width="56" height="7" rx="3" fill="${p.accent}"/>`}
    <text x="${x + pad + 34}" y="${cy0 + 64}" font-family="JM" font-size="21" letter-spacing="3" fill="${p.faint}">${c.num}</text>
    <text x="${cx}" y="${cy0 + 128}" text-anchor="middle" font-family="JM" font-size="21" letter-spacing="7" fill="${p.accent}">${c.sub}</text>
    <g transform="translate(${cx - 41}, ${cy0 + 168}) scale(3.4)" fill="none" stroke="${p.accent}" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.key]}</g>
    <line x1="${x + pad + 44}" y1="${cy0 + ch - 120}" x2="${x + pad + cw - 44}" y2="${cy0 + ch - 120}" stroke="${p.border}" stroke-width="3"/>
    <text x="${cx}" y="${cy0 + ch - 58}" text-anchor="middle" font-family="CP" font-size="44" fill="${p.ink}">${c.title}</text>
    <text x="${cx}" y="${cy0 + ch - 22}" text-anchor="middle" font-family="JM" font-size="15" letter-spacing="5" fill="${p.faint}">TAP</text>
  `;
}

function barStudio(p) {
  const b = BARS[0];
  const bx = BB_X0;
  const by = BB_Y;
  const bh = BB_H;
  return `
    <rect x="${bx}" y="${by}" width="${BB_W}" height="${bh}" rx="20" fill="${p.surface}" stroke="${p.border}" stroke-width="3"/>
    <rect x="${bx}" y="${by}" width="${BB_W}" height="7" fill="${p.accent}"/>
    <g transform="translate(${bx + 52}, ${by + bh / 2 - 34}) scale(2.85)" fill="none" stroke="${p.accent}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[b.icon]}</g>
    <text x="${bx + 140}" y="${by + bh / 2 + 16}" font-family="CP" font-size="52" fill="${p.ink}">${b.title}</text>
    <text x="${bx + 140}" y="${by + bh / 2 + 64}" font-family="JM" font-size="19" letter-spacing="5" fill="${p.accent}">${b.num} // ${b.sub}</text>
    <text x="${bx + BB_W - 40}" y="${by + bh / 2 + 16}" text-anchor="end" font-family="JM" font-size="17" letter-spacing="2" fill="${p.dim}">${b.uriShort}</text>
  `;
}

/* =============================================================================
   B — NEO GRID : neon tech, AI art floor + bezel + corner LEDs
   ============================================================================= */
const NEO = {
  id: 'b-neo',
  name: 'NEO GRID',
  tag: 'NEON CYAN x MAGENTA',
  bgImg: join(__dirname, 'richmenu-bg/neo.png'),
  palette: {
    accent: '#00ffd0',
    accent2: '#ff3be8',
    surface: 'rgba(6,9,17,0.9)',
    border: '#1d2b4a',
    ink: '#eafcf8',
    dim: '#6f7a9a',
  },
};

function neoOverlay() {
  const p = NEO.palette;
  const gridLines = [];
  for (let gx = 0; gx <= W; gx += 92) gridLines.push(`<line x1="${gx}" y1="0" x2="${gx}" y2="${H}" stroke="${p.accent}" stroke-opacity="0.04"/>`);
  for (let gy = 0; gy <= H; gy += 76) gridLines.push(`<line x1="0" y1="${gy}" x2="${W}" y2="${gy}" stroke="${p.accent}" stroke-opacity="0.03"/>`);
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs(`
      <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#04060b" stop-opacity="0.28"/>
        <stop offset="0.55" stop-color="#04060b" stop-opacity="0.6"/>
        <stop offset="1" stop-color="#04060b" stop-opacity="0.82"/>
      </linearGradient>`)}
    <rect width="${W}" height="${H}" fill="url(#scrim)"/>
    ${gridLines.join('')}

    <text x="36" y="56" font-family="JM" font-size="22" letter-spacing="4" fill="${p.dim}">STACK<span fill="${p.accent}">//</span>FRAME</text>
    <text x="36" y="86" font-family="JM" font-size="18" letter-spacing="4" fill="${p.accent}">NEO_GRID · READY</text>
    <text x="${W - 36}" y="56" text-anchor="end" font-family="JM" font-size="18" letter-spacing="4" fill="${p.dim}">B / 4+1</text>

    ${CELLS.map((c, i) => cardNeo(c, i, p)).join('')}
    ${barNeo(p)}

    <!-- bezel -->
    <rect x="10" y="10" width="${W - 20}" height="${H - 20}" rx="12" fill="none" stroke="${p.accent}" stroke-opacity="0.32" stroke-width="3"/>
    <rect x="21" y="21" width="${W - 42}" height="${H - 42}" rx="8" fill="none" stroke="${p.accent2}" stroke-opacity="0.2" stroke-width="2"/>
    ${[
      ['6', '6', p.accent], ['6', H - 26, p.accent2], [W - 26, '6', p.accent2], [W - 26, H - 26, p.accent],
    ]
      .map(([lx, ly, col]) => `<rect x="${lx}" y="${ly}" width="20" height="20" rx="4" fill="${col}"/>`)
      .join('')}
  </svg>`;
}

function cardNeo(c, i, p) {
  const x = i * COL;
  const cx = x + COL / 2;
  const pad = 24;
  const cw = COL - pad * 2;
  const cy0 = 116;
  const ch = TOP_H - cy0 - 22;
  const bar = i % 2 === 0 ? p.accent : p.accent2;
  return `
    <rect x="${x + pad}" y="${cy0}" width="${cw}" height="${ch}" rx="16" fill="${p.surface}" stroke="${p.border}" stroke-width="2"/>
    <rect x="${x + pad}" y="${cy0}" width="${cw}" height="5" rx="2" fill="${bar}"/>
    <rect x="${x + pad + 24}" y="${cy0 + 20}" width="56" height="30" rx="5" fill="none" stroke="${p.border}" stroke-width="2"/>
    <text x="${x + pad + 52}" y="${cy0 + 41}" text-anchor="middle" font-family="JM" font-size="18" fill="${bar}">${c.num}</text>
    <rect x="${cx - 50}" y="${cy0 + 76}" width="100" height="100" rx="12" fill="#0a0f22" stroke="${bar}" stroke-opacity="0.55" stroke-width="2"/>
    <g transform="translate(${cx - 43}, ${cy0 + 90}) scale(3.55)" fill="none" stroke="${p.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.key]}</g>
    <text x="${cx}" y="${cy0 + ch - 122}" text-anchor="middle" font-family="CP" font-size="44" fill="${p.ink}">${c.title}</text>
    <text x="${cx}" y="${cy0 + ch - 78}" text-anchor="middle" font-family="JM" font-size="17" letter-spacing="4" fill="${bar}">// ${c.sub}</text>
    <text x="${cx}" y="${cy0 + ch - 46}" text-anchor="middle" font-family="JM" font-size="14" letter-spacing="4" fill="${p.dim}">ACCESS 0${i + 1}</text>
  `;
}

function barNeo(p) {
  const b = BARS[0];
  const bx = BB_X0;
  const by = BB_Y;
  const bh = BB_H;
  return `
    <rect x="${bx}" y="${by}" width="${BB_W}" height="${bh}" rx="16" fill="${p.surface}" stroke="${p.border}" stroke-width="2"/>
    <rect x="${bx}" y="${by}" width="${BB_W}" height="5" rx="2" fill="${p.accent2}"/>
    <g transform="translate(${bx + 52}, ${by + bh / 2 - 38}) scale(3.15)" fill="none" stroke="${p.accent}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[b.icon]}</g>
    <text x="${bx + 140}" y="${by + bh / 2 + 18}" font-family="CP" font-size="52" fill="${p.ink}">${b.title}</text>
    <text x="${bx + 140}" y="${by + bh / 2 + 68}" font-family="JM" font-size="19" letter-spacing="5" fill="${p.accent2}">${b.num} // ${b.sub}</text>
    <text x="${bx + BB_W - 40}" y="${by + bh / 2 + 18}" text-anchor="end" font-family="JM" font-size="17" letter-spacing="2" fill="${p.dim}">${b.uriShort}</text>
  `;
}

/* =============================================================================
   C — FIELD 01 : cinematic work-site art, documentary captions
   ============================================================================= */
const FIELD = {
  id: 'c-field',
  name: 'FIELD 01',
  tag: 'SITE LOG / FILM GRADE',
  bgImg: join(__dirname, 'richmenu-bg/field.png'),
  palette: {
    accent: '#ffb45e',
    surface: 'rgba(16,13,10,0.87)',
    border: '#4a3b2c',
    ink: '#f4ecdf',
    dim: '#c9b49c',
    faint: '#8f7a62',
  },
};

function fieldOverlay() {
  const p = FIELD.palette;
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs(`
      <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0b0805" stop-opacity="0.2"/>
        <stop offset="0.6" stop-color="#0b0805" stop-opacity="0.55"/>
        <stop offset="1" stop-color="#0b0805" stop-opacity="0.84"/>
      </linearGradient>`)}
    <rect width="${W}" height="${H}" fill="url(#scrim)"/>

    <text x="36" y="58" font-family="CP" font-weight="700" font-size="24" fill="${p.ink}">STACK<span fill="${p.accent}">//</span>FRAME</text>
    <text x="36" y="90" font-family="JM" font-size="18" letter-spacing="3" fill="${p.dim}">FIELD_01 · SITE LOG</text>
    <text x="${W - 36}" y="58" text-anchor="end" font-family="JM" font-size="18" letter-spacing="4" fill="${p.faint}">C / 4+1</text>

    ${CELLS.map((c, i) => cardField(c, i, p)).join('')}
    ${barField(p)}

    <rect x="36" y="${H - 18}" width="66" height="6" rx="3" fill="${p.accent}"/>
  </svg>`;
}

function cardField(c, i, p) {
  const x = i * COL;
  const pad = 24;
  const cw = COL - pad * 2;
  const cy0 = 116;
  const ch = TOP_H - cy0 - 70;
  return `
    <rect x="${x + pad}" y="${cy0}" width="${cw}" height="${ch}" rx="18" fill="${p.surface}" stroke="${p.border}" stroke-width="2"/>
    <text x="${x + pad + 40}" y="${cy0 + 118}" font-family="CPR" font-size="118" fill="${p.accent}" opacity="0.28">${c.num}</text>
    <text x="${x + pad + 40}" y="${cy0 + 56}" font-family="JM" font-size="17" letter-spacing="2" fill="${p.dim}">REC ${c.num}</text>
    <circle cx="${x + pad + cw - 76}" cy="${cy0 + 82}" r="44" fill="none" stroke="${p.accent}" stroke-opacity="0.7" stroke-width="3"/>
    <g transform="translate(${x + pad + cw - 76 - 40}, ${cy0 + 82 - 40}) scale(3.3)" fill="none" stroke="${p.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.key]}</g>
    <line x1="${x + pad + 40}" y1="${cy0 + ch - 130}" x2="${x + pad + cw - 40}" y2="${cy0 + ch - 130}" stroke="${p.border}" stroke-width="2"/>
    <text x="${x + pad + 40}" y="${cy0 + ch - 62}" font-family="CP" font-size="42" fill="${p.ink}">${c.title}</text>
    <text x="${x + pad + 40}" y="${cy0 + ch - 24}" font-family="JM" font-size="17" letter-spacing="3" fill="${p.accent}">${c.sub}</text>
  `;
}

function barField(p) {
  const b = BARS[0];
  const bx = BB_X0;
  const by = BB_Y;
  const bh = BB_H;
  return `
    <rect x="${bx}" y="${by}" width="${BB_W}" height="${bh}" rx="18" fill="${p.surface}" stroke="${p.border}" stroke-width="2"/>
    <rect x="${bx}" y="${by}" width="${BB_W}" height="7" fill="${p.accent}"/>
    <circle cx="${bx + 78}" cy="${by + bh / 2}" r="38" fill="none" stroke="${p.accent}" stroke-opacity="0.7" stroke-width="3"/>
    <g transform="translate(${bx + 78 - 34}, ${by + bh / 2 - 34}) scale(2.85)" fill="none" stroke="${p.accent}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[b.icon]}</g>
    <text x="${bx + 158}" y="${by + bh / 2 + 18}" font-family="CP" font-size="52" fill="${p.ink}">${b.title}</text>
    <text x="${bx + 158}" y="${by + bh / 2 + 66}" font-family="JM" font-size="19" letter-spacing="5" fill="${p.accent}">${b.num} // ${b.sub}</text>
    <text x="${bx + BB_W - 40}" y="${by + bh / 2 + 18}" text-anchor="end" font-family="JM" font-size="17" letter-spacing="2" fill="${p.dim}">${b.uriShort}</text>
  `;
}

/* =============================================================================
   D — EDITORIAL : dark poster, cream ink + orange, high contrast
   ============================================================================= */
const EDITORIAL = {
  id: 'd-editorial',
  name: 'EDITORIAL',
  tag: 'DARK POSTER / HIGH CONTRAST',
  palette: {
    bg: ['#161310', '#0d0b09', '#060505'],
    accent: '#ff4d1c',
    surface: 'rgba(22,19,16,0.93)',
    border: '#3a352c',
    ink: '#f6f1e7',
    dim: '#b8ab97',
    faint: '#7d7262',
  },
};

function editorialBase() {
  const p = EDITORIAL.palette;
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs(`
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${p.bg[0]}"/><stop offset="0.6" stop-color="${p.bg[1]}"/><stop offset="1" stop-color="${p.bg[2]}"/>
      </linearGradient>
      <radialGradient id="ease" cx="0.5" cy="0.08" r="0.9">
        <stop offset="0" stop-color="${p.accent}" stop-opacity="0.06"/>
        <stop offset="1" stop-color="${p.bg[0]}" stop-opacity="0"/>
      </radialGradient>`)}
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#ease)"/>
  </svg>`;
}

function editorialOverlay() {
  const p = EDITORIAL.palette;
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs()}

    <text x="36" y="58" font-family="CP" font-weight="700" font-size="26" fill="${p.ink}">STACK<span fill="${p.accent}">//</span>FRAME</text>
    <text x="36" y="90" font-family="JM" font-size="18" letter-spacing="3" fill="${p.dim}">EDIT_01 · WORK MENU</text>
    <text x="${W - 36}" y="58" text-anchor="end" font-family="JM" font-size="18" letter-spacing="4" fill="${p.ink}">2026</text>
    <text x="${W - 36}" y="90" text-anchor="end" font-family="JM" font-size="16" letter-spacing="4" fill="${p.dim}">D / 4+1</text>

    ${CELLS.map((c, i) => cardEditorial(c, i, p)).join('')}
    ${barEditorial(p)}

    <rect x="0" y="${H - 7}" width="${W}" height="7" fill="${p.accent}"/>
  </svg>`;
}

function cardEditorial(c, i, p) {
  const x = i * COL;
  const cx = x + COL / 2;
  const pad = 24;
  const cw = COL - pad * 2;
  const cy0 = 116;
  const ch = TOP_H - cy0 - 22;
  return `
    <rect x="${x + pad}" y="${cy0}" width="${cw}" height="${ch}" rx="10" fill="${p.surface}" stroke="${p.border}" stroke-width="3"/>
    <rect x="${x + pad}" y="${cy0}" width="${cw}" height="9" fill="${p.accent}"/>
    <text x="${x + pad + cw - 36}" y="${cy0 + 108}" text-anchor="end" font-family="CPR" font-size="118" fill="${p.accent}">${c.num}</text>
    <g transform="translate(${cx - 43}, ${cy0 + 118}) scale(3.6)" fill="none" stroke="${p.ink}" stroke-width="2.05" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.key]}</g>
    <line x1="${x + pad + 36}" y1="${cy0 + ch - 126}" x2="${x + pad + cw - 36}" y2="${cy0 + ch - 126}" stroke="${p.dim}" stroke-opacity="0.35" stroke-width="2"/>
    <text x="${x + pad + 36}" y="${cy0 + ch - 58}" font-family="CP" font-weight="700" font-size="46" fill="${p.ink}">${c.title}</text>
    <text x="${x + pad + 36}" y="${cy0 + ch - 20}" font-family="JM" font-size="18" letter-spacing="4" fill="${p.accent}">${c.sub}</text>
  `;
}

function barEditorial(p) {
  const b = BARS[0];
  const bx = BB_X0;
  const by = BB_Y;
  const bh = BB_H;
  return `
    <rect x="${bx}" y="${by}" width="${BB_W}" height="${bh}" rx="10" fill="${p.surface}" stroke="${p.border}" stroke-width="3"/>
    <rect x="${bx}" y="${by}" width="${BB_W}" height="9" fill="${p.accent}"/>
    <g transform="translate(${bx + 50}, ${by + bh / 2 - 36}) scale(3)" fill="none" stroke="${p.ink}" stroke-width="2.05" stroke-linecap="round" stroke-linejoin="round">${ICONS[b.icon]}</g>
    <text x="${bx + 138}" y="${by + bh / 2 + 18}" font-family="CP" font-weight="700" font-size="54" fill="${p.ink}">${b.title}</text>
    <text x="${bx + 138}" y="${by + bh / 2 + 66}" font-family="JM" font-size="19" letter-spacing="5" fill="${p.accent}">${b.num} // ${b.sub}</text>
    <text x="${bx + BB_W - 40}" y="${by + bh / 2 + 18}" text-anchor="end" font-family="JM" font-size="17" letter-spacing="2" fill="${p.dim}">${b.uriShort}</text>
  `;
}

/* =============================================================================
   Render pipeline
   ============================================================================= */
const VARIANTS = [
  { def: STUDIO, base: studioBase, overlay: studioOverlay },
  { def: NEO, base: null, overlay: neoOverlay },
  { def: FIELD, base: null, overlay: fieldOverlay },
  { def: EDITORIAL, base: editorialBase, overlay: editorialOverlay },
];

async function renderBase(v) {
  if (v.def.bgImg) {
    return sharp(v.def.bgImg).resize(W, H, { fit: 'cover' }).png().toBuffer();
  }
  return sharp(Buffer.from(v.base())).png().toBuffer();
}

async function renderVariant(v, outDir) {
  mkdirSync(outDir, { recursive: true });
  const baseBuf = await renderBase(v);
  const overlayBuf = await sharp(Buffer.from(v.overlay())).png().toBuffer();

  const full = join(outDir, `${v.def.id}.png`);
  const small = join(outDir, `${v.def.id}-web.jpg`);
  const png = await sharp(baseBuf).composite([{ input: overlayBuf, top: 0, left: 0 }]).png().toBuffer();
  writeFileSync(full, png);
  await sharp(png).resize(1100, null, { fit: 'inside' }).jpeg({ quality: 88 }).toFile(small);
  console.log(`  ${v.def.id}  (${v.def.name})  -> ${full} / ${small}`);
  return { v, small, png };
}

async function contactSheet(results, outDir) {
  const labelH = 84;
  const tileW = 1100;
  const tileImgH = Math.round((tileW / W) * H); // 371
  const tileH = tileImgH + labelH; // 455
  const gap = 40;
  const pad = 28;
  const cols = 2;
  const rows = Math.ceil(results.length / cols);
  const sheetW = cols * tileW + (cols - 1) * gap + pad * 2;
  const sheetH = rows * tileH + (rows - 1) * gap + pad * 2;

  const composites = [];
  for (let idx = 0; idx < results.length; idx++) {
    const r = results[idx];
    const colIdx = idx % cols;
    const rowIdx = Math.floor(idx / cols);
    const x = pad + colIdx * (tileW + gap);
    const y = pad + rowIdx * (tileH + gap);
    const labelSvg = `<svg width="${tileW}" height="${labelH}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${tileW}" height="${labelH}" fill="#121216"/>
      <rect width="14" height="${labelH}" fill="${accentOf(r.v.def)}"/>
      <text x="34" y="50" font-family="JM" font-size="32" letter-spacing="3" fill="#f4f4f0">${r.v.def.name}</text>
      <text x="${tileW - 34}" y="50" text-anchor="end" font-family="JM" font-size="24" letter-spacing="3" fill="#8a8f9e">${r.v.def.tag}</text>
    </svg>`;

    const tile = await sharp(r.png).resize(tileW, tileImgH).toBuffer();
    composites.push({ input: tile, top: y, left: x });
    composites.push({ input: Buffer.from(labelSvg), top: y + tileImgH, left: x });
  }

  const sheet = join(outDir, 'contact-sheet.png');
  await sharp({ create: { width: sheetW, height: sheetH, channels: 3, background: '#0d0d10' } })
    .composite(composites)
    .png()
    .toFile(sheet);
  console.log(`Contact sheet -> ${sheet}`);
}

function accentOf(def) {
  return def.palette.accent;
}

/* =============================================================================
   LINE deploy (5 tap areas: 4 top cols + 1 bottom bar)
   ============================================================================= */
async function deploy(v) {
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN is required to deploy.');
  }
  const client = new Client({ channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN });

  const areas = [
    ...CELLS.map((c, i) => ({
      bounds: { x: Math.round(i * COL), y: 0, width: Math.round(COL), height: TOP_H },
      action: { type: 'uri', uri: c.uri },
    })),
    { bounds: { x: 0, y: BAR_Y, width: W, height: BAR_H }, action: { type: 'uri', uri: BARS[0].uri } },
  ];

  const richMenu = {
    size: { width: W, height: H },
    selected: true,
    name: `${v.def.name} (rich menu)`,
    chatBarText: 'เมนู',
    areas,
  };

  const tmpPng = join('/tmp', `${v.def.id}-deploy.png`);
  const baseBuf = await renderBase(v);
  const overlayBuf = await sharp(Buffer.from(v.overlay())).png().toBuffer();
  await sharp(baseBuf).composite([{ input: overlayBuf, top: 0, left: 0 }]).png().toFile(tmpPng);

  const richMenuId = await client.createRichMenu(richMenu);
  console.log('Rich menu created:', richMenuId);
  const image = readFileSync(tmpPng);
  await client.setRichMenuImage(richMenuId, image, 'image/png');
  console.log('Rich menu image uploaded:', image.length, 'bytes');
  await client.setDefaultRichMenu(richMenuId);
  console.log('Default rich menu set:', richMenuId);
  rmSync(tmpPng, { force: true });
  console.log('DONE');
}

/* =============================================================================
   main
   ============================================================================= */
async function main() {
  const args = process.argv.slice(2);
  const onlyArg = args.find((a) => a.startsWith('--only'));
  const only = onlyArg ? onlyArg.split('=')[1].split(',').map((s) => s.trim().toLowerCase()) : null;
  const noSheet = args.includes('--no-sheet');
  const deployIdx = args.indexOf('--deploy');
  let deployId = null;
  if (deployIdx !== -1) {
    deployId = args[deployIdx + 1];
  } else {
    const eq = args.find((a) => a.startsWith('--deploy='));
    if (eq) deployId = eq.split('=')[1];
  }
  const outDir = (args.find((a) => a.startsWith('-o=')) || '').split('=')[1] || 'frontend/previews/richmenu';

  if (deployId) {
    const id = deployId;
    const v = VARIANTS.find((x) => x.def.id === id || x.def.name.toLowerCase() === id);
    if (!v) throw new Error(`Unknown design: ${id}. Available: ${VARIANTS.map((x) => x.def.id).join(', ')}`);
    await deploy(v);
    return;
  }

  console.log(`Rendering ${VARIANTS.length} rich menu designs -> ${outDir}`);
  const results = [];
  for (const v of VARIANTS) {
    if (only && !only.includes(v.def.id[0])) continue;
    results.push(await renderVariant(v, outDir));
  }
  if (!noSheet && results.length > 1) {
    await contactSheet(results, outDir);
  }

  const gallery = join(outDir, 'index.html');
  writeFileSync(
    gallery,
    `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rich menu redesign · 4 concepts</title>
<style>
  :root{--bg:#0d0d10;--ink:#f4f4f0;--dim:#a1a1a8;--line:#2a2a32;--acc:#c7f464}
  *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
  header{padding:36px 44px 20px;border-bottom:1px solid var(--line)}header h1{margin:0;font-size:26px;letter-spacing:.5px}
  header p{margin:6px 0 0;color:var(--dim)}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:28px;padding:28px 44px 60px}
  .card{background:#15181d;border:1px solid var(--line);border-radius:14px;overflow:hidden}
  .card img{width:100%;display:block;border-bottom:1px solid var(--line)}
  .meta{padding:14px 18px;display:flex;justify-content:space-between;align-items:baseline;gap:12px}
  .meta b{font-size:17px}.meta span{color:var(--dim);font-size:13px;letter-spacing:1px}
  .note{font-size:13px;color:var(--dim);padding:0 18px 16px;margin:0}
  footer{padding:0 44px 40px;color:var(--dim);font-size:13px}
  footer code{background:#1e2129;padding:2px 6px;border-radius:6px}
</style></head><body>
<header><h1>Rich menu redesign · STACK<span style="color:var(--acc)">//</span>FRAME</h1>
<p>4 concepts, 2500×843, black backgrounds. Tap areas identical in all: แถวบน 4 ปุ่ม (ส่งรูปงาน LIFF · บันทึกงาน truck · เปิดหน้าลูกค้า data · เปิด STS oms.cfwenterprise.com/sts) + แถวล่างเต็มความกว้าง 1 ปุ่ม (เปิดสมาชิก → me.mcky.space)</p></header>
<div class="grid">
${results
  .map(
    (r) => `<div class="card"><img src="${r.v.def.id}-web.jpg" alt="${r.v.def.name}">
<div class="meta"><b>${r.v.def.name}</b><span>${r.v.def.tag}</span></div>
<p class="note">Full size: <a href="${r.v.def.id}.png" style="color:#7db8ff">${r.v.def.id}.png</a></p></div>`
  )
  .join('')}
</div>
<footer>Render: <code>NODE_PATH=backend/node_modules:frontend/node_modules node scripts/richmenu-designs.cjs</code> · Deploy a pick: <code>--deploy a-studio</code></footer>
</body></html>`,
  );
  console.log(`Gallery -> ${gallery}`);
}

main().catch((err) => {
  console.error('FAILED:', err.message || err);
  process.exit(1);
});