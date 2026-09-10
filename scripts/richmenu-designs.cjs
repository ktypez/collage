/**
 * Rich menu design showcase + deploy.
 *
 * Renders 5 distinct 2500x843 rich menu designs for the collage LINE bot and
 * composites them into preview images:
 *
 *   A. STUDIO 03  — clean "web edition" (lime on black, mirrors frontend)
 *   B. NEO GRID   — neon cyan/magenta tech (AI art bg + bezel + corner LEDs)
 *   C. FIELD 01   — cinematic work-site art (amber on dark, docu captions)
 *   D. EDITORIAL  — dark poster style (cream ink + orange, high contrast)
 *   E. MONO TYPE  — pure black & white, typography-first (big type)
 *
 *   Gen-2 concepts (F–I):
 *   F. NOIR NIGHTS — crimson neon film-noir on black (AI night city art)
 *   G. SITE VOLT   — industrial amber/yellow, hazard stripes (AI site art)
 *   H. DATA CORE   — navy/cyan terminal console (AI server art)
 *   I. ROYAL GOLD  — luxury gold/cream on black (pure SVG)
 *
 * All designs use near-black backgrounds.
 *
 * Layout: 5 equal buttons in a single full-height row. Tap areas IDENTICAL in
 * every design:
 *   1. ส่งรูปงาน      -> LIFF collage app              (col 1)
 *   2. บันทึกงาน      -> truck.mcky.space              (col 2)
 *   3. เปิดหน้าลูกค้า -> data.mcky.space                (col 3)
 *   4. เปิด STS       -> oms.cfwenterprise.com/sts      (col 4)
 *   5. เปิดสมาชิก     -> me.mcky.space                  (col 5)
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
const COL = W / 5; // 500

const FONT_CP = resolve(__dirname, '../backend/design-system/fonts/ChakraPetch-SemiBold.ttf');
const FONT_CP_R = resolve(__dirname, '../backend/design-system/fonts/ChakraPetch-Regular.ttf');
const FONT_MONO = resolve(__dirname, '../backend/design-system/fonts/JetBrainsMono-Regular.ttf');

const CELLS = [
  { key: 'collage', num: '01', title: 'ส่งรูปงาน', sub: 'COLLAGE', uri: `https://liff.line.me/${LIFF_ID}` },
  { key: 'truck', num: '02', title: 'บันทึกงาน', sub: 'TRUCK', uri: TRUCK_URL },
  { key: 'data', num: '03', title: 'เปิดหน้าลูกค้า', sub: 'CLIENT DATA', uri: DATA_URL },
  { key: 'sts', num: '04', title: 'เปิด STS', sub: 'WORK WEB', uri: STS_URL },
  { key: 'portal', num: '05', title: 'เปิดสมาชิก', sub: 'PORTAL', uri: PORTAL_URL },
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
   Theme B — NEO GRID (selected; others share the same 5-col geometry)
   ============================================================================= */
const NEO = {
  id: 'b-neo',
  name: 'NEO GRID',
  tag: 'NEON CYAN x MAGENTA',
  bgImg: join(__dirname, 'richmenu-bg/neo.png'),
  palette: {
    accent: '#00ffd0',
    accent2: '#ff3be8',
    surface: 'rgba(5,8,15,0.92)',
    border: '#1d2b4a',
    ink: '#eafcf8',
    dim: '#6f7a9a',
  },
};

function neoBase() {
  // Pure black fallback base (used when no bgImg provided)
  return null;
}

function neoOverlay() {
  const p = NEO.palette;
  const gridLines = [];
  for (let gx = 0; gx <= W; gx += 92) gridLines.push(`<line x1="${gx}" y1="0" x2="${gx}" y2="${H}" stroke="${p.accent}" stroke-opacity="0.04"/>`);
  for (let gy = 0; gy <= H; gy += 76) gridLines.push(`<line x1="0" y1="${gy}" x2="${W}" y2="${gy}" stroke="${p.accent}" stroke-opacity="0.03"/>`);
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs(`
      <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#020308" stop-opacity="0.34"/>
        <stop offset="0.55" stop-color="#020308" stop-opacity="0.68"/>
        <stop offset="1" stop-color="#020308" stop-opacity="0.9"/>
      </linearGradient>`)}
    <rect width="${W}" height="${H}" fill="url(#scrim)"/>
    ${gridLines.join('')}

    <text x="36" y="56" font-family="JM" font-size="22" letter-spacing="4" fill="${p.dim}">STACK<span fill="${p.accent}">//</span>FRAME</text>
    <text x="36" y="86" font-family="JM" font-size="17" letter-spacing="4" fill="${p.accent}">NEO_GRID · 5 CHANNELS</text>
    <text x="${W - 36}" y="56" text-anchor="end" font-family="JM" font-size="17" letter-spacing="4" fill="${p.dim}">B / NEO</text>

    ${CELLS.map((c, i) => cardNeo(c, i, p)).join('')}

    <!-- bezel -->
    <rect x="10" y="10" width="${W - 20}" height="${H - 20}" rx="12" fill="none" stroke="${p.accent}" stroke-opacity="0.32" stroke-width="3"/>
    <rect x="21" y="21" width="${W - 42}" height="${H - 42}" rx="8" fill="none" stroke="${p.accent2}" stroke-opacity="0.2" stroke-width="2"/>
    ${[
      ['6', '6', p.accent], ['6', H - 26, p.accent2], [W - 26, '6', p.accent2], [W - 26, H - 26, p.accent],
    ]
      .map(([lx, ly, col]) => `<rect x="${lx}" y="${ly}" width="20" height="20" rx="4" fill="${col}"/>`)
      .join('')}
    <!-- off-black lift: guarantee no pure #000 pixels anywhere -->
    <rect width="${W}" height="${H}" fill="#0d1018" opacity="0.10"/>
  </svg>`;
}

function cardNeo(c, i, p) {
  const x = i * COL;
  const cx = x + COL / 2;
  const pad = 26;
  const cw = COL - pad * 2;
  const cy0 = 108;
  const ch = H - cy0 - 30;
  const bar = i % 2 === 0 ? p.accent : p.accent2;
  const bars = [p.accent, p.accent2, p.accent, p.accent2, p.accent][i];
  return `
    <rect x="${x + pad}" y="${cy0}" width="${cw}" height="${ch}" rx="16" fill="${p.surface}" stroke="${p.border}" stroke-width="2"/>
    <rect x="${x + pad}" y="${cy0}" width="${cw}" height="6" rx="3" fill="${bars}"/>
    <rect x="${x + pad + 28}" y="${cy0 + 30}" width="62" height="32" rx="6" fill="none" stroke="${p.border}" stroke-width="2"/>
    <text x="${x + pad + 59}" y="${cy0 + 52}" text-anchor="middle" font-family="JM" font-size="18" fill="${bars}">${c.num}</text>
    <rect x="${cx - 60}" y="${cy0 + 118}" width="120" height="120" rx="14" fill="#0a0f22" stroke="${bars}" stroke-opacity="0.55" stroke-width="2"/>
    <g transform="translate(${cx - 52}, ${cy0 + 134}) scale(4.3)" fill="none" stroke="${p.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.key]}</g>
    <text x="${cx}" y="${cy0 + ch - 206}" text-anchor="middle" font-family="CP" font-size="48" fill="${p.ink}">${c.title}</text>
    <text x="${cx}" y="${cy0 + ch - 148}" text-anchor="middle" font-family="JM" font-size="18" letter-spacing="4" fill="${bars}">// ${c.sub}</text>
    <text x="${cx}" y="${cy0 + ch - 104}" text-anchor="middle" font-family="JM" font-size="14" letter-spacing="4" fill="${p.dim}">ACCESS 0${i + 1}</text>
    <rect x="${x + pad}" y="${cy0 + ch - 24}" width="${cw}" height="5" rx="2" fill="${bars}"/>
  `;
}

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
      <radialGradient id="ease" cx="0.5" cy="0.06" r="0.9">
        <stop offset="0" stop-color="${p.accent}" stop-opacity="0.05"/>
        <stop offset="1" stop-color="${p.bg[0]}" stop-opacity="0"/>
      </radialGradient>`)}
    <rect width="${W}" height="${H}" fill="${p.bg[0]}"/>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#ease)"/>
  </svg>`;
}

function studioOverlay() {
  const p = STUDIO.palette;
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs()}
    <text x="36" y="56" font-family="JM" font-size="22" letter-spacing="4" fill="${p.dim}">STACK<span fill="${p.accent}">//</span>FRAME</text>
    <text x="36" y="86" font-family="JM" font-size="17" letter-spacing="3" fill="${p.faint}">COLLAGE STUDIO // MENU</text>
    <text x="${W - 36}" y="56" text-anchor="end" font-family="JM" font-size="17" letter-spacing="4" fill="${p.faint}">A / 5</text>

    ${CELLS.map((c, i) => cardStudio(c, i, p)).join('')}
  </svg>`;
}

function cardStudio(c, i, p) {
  const x = i * COL;
  const cx = x + COL / 2;
  const pad = 26;
  const cw = COL - pad * 2;
  const cy0 = 108;
  const ch = H - cy0 - 30;
  const isPrimary = i === 0;
  return `
    <rect x="${x + pad}" y="${cy0}" width="${cw}" height="${ch}" rx="20" fill="${p.surface}" stroke="${p.border}" stroke-width="3"/>
    ${isPrimary
      ? `<rect x="${x + pad}" y="${cy0}" width="${cw}" height="7" fill="${p.accent}"/>`
      : `<rect x="${x + pad + 30}" y="${cy0}" width="52" height="7" rx="3" fill="${p.accent}"/>`}
    <text x="${x + pad + 34}" y="${cy0 + 64}" font-family="JM" font-size="20" letter-spacing="3" fill="${p.faint}">${c.num}</text>
    <text x="${cx}" y="${cy0 + 128}" text-anchor="middle" font-family="JM" font-size="20" letter-spacing="6" fill="${p.accent}">${c.sub}</text>
    <g transform="translate(${cx - 43}, ${cy0 + 182}) scale(3.55)" fill="none" stroke="${p.accent}" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.key]}</g>
    <line x1="${x + pad + 44}" y1="${cy0 + ch - 170}" x2="${x + pad + cw - 44}" y2="${cy0 + ch - 170}" stroke="${p.border}" stroke-width="3"/>
    <text x="${cx}" y="${cy0 + ch - 96}" text-anchor="middle" font-family="CP" font-size="44" fill="${p.ink}">${c.title}</text>
    <text x="${cx}" y="${cy0 + ch - 52}" text-anchor="middle" font-family="JM" font-size="15" letter-spacing="5" fill="${p.faint}">TAP</text>
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
    surface: 'rgba(15,12,9,0.9)',
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
        <stop offset="0" stop-color="#090604" stop-opacity="0.24"/>
        <stop offset="0.6" stop-color="#090604" stop-opacity="0.6"/>
        <stop offset="1" stop-color="#090604" stop-opacity="0.88"/>
      </linearGradient>`)}
    <rect width="${W}" height="${H}" fill="url(#scrim)"/>

    <text x="36" y="58" font-family="CP" font-weight="700" font-size="24" fill="${p.ink}">STACK<span fill="${p.accent}">//</span>FRAME</text>
    <text x="36" y="90" font-family="JM" font-size="17" letter-spacing="3" fill="${p.dim}">FIELD_01 · SITE LOG</text>
    <text x="${W - 36}" y="58" text-anchor="end" font-family="JM" font-size="17" letter-spacing="4" fill="${p.faint}">C / 5</text>

    ${CELLS.map((c, i) => cardField(c, i, p)).join('')}

    <rect x="36" y="${H - 16}" width="60" height="6" rx="3" fill="${p.accent}"/>
  </svg>`;
}

function cardField(c, i, p) {
  const x = i * COL;
  const pad = 26;
  const cw = COL - pad * 2;
  const cy0 = 108;
  const ch = H - cy0 - 40;
  return `
    <rect x="${x + pad}" y="${cy0}" width="${cw}" height="${ch}" rx="18" fill="${p.surface}" stroke="${p.border}" stroke-width="2"/>
    <text x="${x + pad + 38}" y="${cy0 + 128}" font-family="CPR" font-size="114" fill="${p.accent}" opacity="0.28">${c.num}</text>
    <text x="${x + pad + 38}" y="${cy0 + 62}" font-family="JM" font-size="16" letter-spacing="2" fill="${p.dim}">REC ${c.num}</text>
    <circle cx="${x + pad + cw - 76}" cy="${cy0 + 92}" r="44" fill="none" stroke="${p.accent}" stroke-opacity="0.7" stroke-width="3"/>
    <g transform="translate(${x + pad + cw - 76 - 40}, ${cy0 + 92 - 40}) scale(3.3)" fill="none" stroke="${p.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.key]}</g>
    <line x1="${x + pad + 38}" y1="${cy0 + ch - 180}" x2="${x + pad + cw - 38}" y2="${cy0 + ch - 180}" stroke="${p.border}" stroke-width="2"/>
    <text x="${x + pad + 38}" y="${cy0 + ch - 102}" font-family="CP" font-size="40" fill="${p.ink}">${c.title}</text>
    <text x="${x + pad + 38}" y="${cy0 + ch - 52}" font-family="JM" font-size="16" letter-spacing="3" fill="${p.accent}">${c.sub}</text>
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
    surface: 'rgba(22,19,16,0.94)',
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
      <radialGradient id="ease" cx="0.5" cy="0.06" r="0.9">
        <stop offset="0" stop-color="${p.accent}" stop-opacity="0.06"/>
        <stop offset="1" stop-color="${p.bg[0]}" stop-opacity="0"/>
      </radialGradient>`)}
    <rect width="${W}" height="${H}" fill="${p.bg[0]}"/>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#ease)"/>
  </svg>`;
}

function editorialOverlay() {
  const p = EDITORIAL.palette;
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs()}

    <text x="36" y="58" font-family="CP" font-weight="700" font-size="26" fill="${p.ink}">STACK<span fill="${p.accent}">//</span>FRAME</text>
    <text x="36" y="90" font-family="JM" font-size="17" letter-spacing="3" fill="${p.dim}">EDIT_01 · WORK MENU</text>
    <text x="${W - 36}" y="58" text-anchor="end" font-family="JM" font-size="17" letter-spacing="4" fill="${p.ink}">2026</text>
    <text x="${W - 36}" y="90" text-anchor="end" font-family="JM" font-size="15" letter-spacing="4" fill="${p.dim}">D / 5</text>

    ${CELLS.map((c, i) => cardEditorial(c, i, p)).join('')}

    <rect x="0" y="${H - 7}" width="${W}" height="7" fill="${p.accent}"/>
  </svg>`;
}

function cardEditorial(c, i, p) {
  const x = i * COL;
  const cx = x + COL / 2;
  const pad = 26;
  const cw = COL - pad * 2;
  const cy0 = 108;
  const ch = H - cy0 - 30;
  return `
    <rect x="${x + pad}" y="${cy0}" width="${cw}" height="${ch}" rx="10" fill="${p.surface}" stroke="${p.border}" stroke-width="3"/>
    <rect x="${x + pad}" y="${cy0}" width="${cw}" height="9" fill="${p.accent}"/>
    <text x="${x + pad + cw - 34}" y="${cy0 + 122}" text-anchor="end" font-family="CPR" font-size="112" fill="${p.accent}">${c.num}</text>
    <g transform="translate(${cx - 43}, ${cy0 + 160}) scale(3.6)" fill="none" stroke="${p.ink}" stroke-width="2.05" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.key]}</g>
    <line x1="${x + pad + 36}" y1="${cy0 + ch - 160}" x2="${x + pad + cw - 36}" y2="${cy0 + ch - 160}" stroke="${p.dim}" stroke-opacity="0.35" stroke-width="2"/>
    <text x="${x + pad + 36}" y="${cy0 + ch - 88}" font-family="CP" font-weight="700" font-size="44" fill="${p.ink}">${c.title}</text>
    <text x="${x + pad + 36}" y="${cy0 + ch - 42}" font-family="JM" font-size="17" letter-spacing="4" fill="${p.accent}">${c.sub}</text>
  `;
}

/* =============================================================================
   E — MONO TYPE : pure black & white, typography-first
   ============================================================================= */
const TYPO = {
  id: 'e-mono',
  name: 'MONO TYPE',
  tag: 'MONOCHROME · BIG TYPE',
  palette: {
    bg: ['#0a0a0a', '#0e0e0e', '#121212'],
    ink: '#f5f5f5',
    dim: '#a3a3a3',
    faint: '#555555',
    hair: '#2b2b2b',
  },
};

function typoBase() {
  const p = TYPO.palette;
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs(`
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${p.bg[0]}"/><stop offset="0.55" stop-color="${p.bg[1]}"/><stop offset="1" stop-color="${p.bg[2]}"/>
      </linearGradient>`)}
    <rect width="${W}" height="${H}" fill="${p.bg[0]}"/>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
  </svg>`;
}

function typoOverlay() {
  const p = TYPO.palette;
  const hairs = [1, 2, 3, 4]
    .map((i) => `<line x1="${i * COL}" y1="120" x2="${i * COL}" y2="${H - 24}" stroke="${p.hair}" stroke-width="2"/>`)
    .join('');
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs()}
    <text x="36" y="64" font-family="CP" font-weight="700" font-size="34" fill="${p.ink}">STACK<span fill="${p.ink}">//</span>FRAME</text>
    <text x="36" y="100" font-family="JM" font-size="20" letter-spacing="6" fill="${p.dim}">WORK MENU — 5 CHANNELS</text>
    <text x="${W - 36}" y="64" text-anchor="end" font-family="JM" font-size="20" letter-spacing="6" fill="${p.dim}">E / MONO</text>
    <line x1="36" y1="114" x2="${W - 36}" y2="114" stroke="${p.hair}" stroke-width="2"/>
    ${hairs}
    ${CELLS.map((c, i) => cardTypo(c, i, p)).join('')}
  </svg>`;
}

function cardTypo(c, i, p) {
  const x = i * COL;
  const cx = x + COL / 2;
  const pad = 26;
  const cw = COL - pad * 2;
  return `
    <text x="${cx}" y="382" text-anchor="middle" font-family="CPR" font-size="250" fill="${p.ink}" opacity="0.08">${c.num}</text>
    <text x="${cx}" y="442" text-anchor="middle" font-family="JM" font-size="21" letter-spacing="8" fill="${p.ink}">— ${c.sub} —</text>
    <text x="${cx}" y="${H - 256}" text-anchor="middle" font-family="CP" font-weight="700" font-size="62" fill="${p.ink}">${c.title}</text>
    <line x1="${x + pad}" y1="${H - 196}" x2="${x + pad + cw}" y2="${H - 196}" stroke="${p.hair}" stroke-width="2"/>
    <text x="${cx}" y="${H - 150}" text-anchor="middle" font-family="JM" font-size="19" letter-spacing="6" fill="${p.dim}">OPEN →</text>
  `;
}

/* =============================================================================
   F — NOIR NIGHTS : crimson neon film-noir on black (AI city art)
   ============================================================================= */
const NOIR = {
  id: 'f-noir',
  name: 'NOIR NIGHTS',
  tag: 'FILM NOIR / CRIMSON NEON',
  bgImg: join(__dirname, 'richmenu-bg/noir.png'),
  palette: {
    accent: '#ff2146',
    accent2: '#ff7aa2',
    surface: 'rgba(13,4,8,0.9)',
    border: '#4a1d2a',
    ink: '#fbf0f2',
    dim: '#c9a3ad',
    faint: '#8a5a66',
  },
};

function noirOverlay() {
  const p = NOIR.palette;
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs(`
      <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#050103" stop-opacity="0.35"/>
        <stop offset="0.55" stop-color="#050103" stop-opacity="0.66"/>
        <stop offset="1" stop-color="#050103" stop-opacity="0.9"/>
      </linearGradient>`)}
    <rect width="${W}" height="${H}" fill="url(#scrim)"/>
    <text x="36" y="58" font-family="CP" font-weight="700" font-size="26" fill="${p.ink}">STACK<span fill="${p.accent}">//</span>FRAME</text>
    <text x="36" y="90" font-family="JM" font-size="17" letter-spacing="4" fill="${p.dim}">NOIR_NIGHT · REEL FIVE</text>
    <text x="${W - 36}" y="58" text-anchor="end" font-family="JM" font-size="17" letter-spacing="4" fill="${p.dim}">F / NOIR</text>

    ${CELLS.map((c, i) => cardNoir(c, i, p)).join('')}
  </svg>`;
}

function cardNoir(c, i, p) {
  const x = i * COL;
  const cx = x + COL / 2;
  const pad = 26;
  const cw = COL - pad * 2;
  const cy0 = 108;
  const ch = H - cy0 - 30;
  const glow = i % 2 === 0 ? p.accent : p.accent2;
  return `
    <rect x="${x + pad}" y="${cy0}" width="${cw}" height="${ch}" rx="16" fill="${p.surface}" stroke="${p.border}" stroke-width="2"/>
    <rect x="${x + pad}" y="${cy0}" width="${cw}" height="6" rx="3" fill="${glow}"/>
    <text x="${x + pad + cw - 36}" y="${cy0 + 138}" text-anchor="end" font-family="CPR" font-size="168" fill="${glow}" opacity="0.14">${c.num}</text>
    <text x="${x + pad + 38}" y="${cy0 + 66}" font-family="JM" font-size="16" letter-spacing="4" fill="${p.faint}">SCENE ${c.num}</text>
    <rect x="${cx - 58}" y="${cy0 + 118}" width="116" height="116" rx="12" fill="#170509" stroke="${glow}" stroke-opacity="0.6" stroke-width="2"/>
    <g transform="translate(${cx - 52}, ${cy0 + 134}) scale(4.3)" fill="none" stroke="${glow}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.key]}</g>
    <line x1="${x + pad + 40}" y1="${cy0 + ch - 176}" x2="${x + pad + cw - 40}" y2="${cy0 + ch - 176}" stroke="${p.border}" stroke-width="2"/>
    <text x="${cx}" y="${cy0 + ch - 104}" text-anchor="middle" font-family="CP" font-size="46" fill="${p.ink}">${c.title}</text>
    <text x="${cx}" y="${cy0 + ch - 56}" text-anchor="middle" font-family="JM" font-size="17" letter-spacing="6" fill="${glow}">${c.sub}</text>
  `;
}

/* =============================================================================
   G — SITE VOLT : industrial amber/yellow, hazard stripes (AI site art)
   ============================================================================= */
const VOLT = {
  id: 'g-volt',
  name: 'SITE VOLT',
  tag: 'INDUSTRIAL / HAZARD',
  bgImg: join(__dirname, 'richmenu-bg/volt.png'),
  palette: {
    accent: '#ffb000',
    accent2: '#ffd60a',
    surface: 'rgba(17,13,5,0.92)',
    border: '#5c4a1f',
    ink: '#fdf6e3',
    dim: '#cbb37c',
    faint: '#8a7447',
  },
};

function voltOverlay() {
  const p = VOLT.palette;
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs(`
      <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0a0602" stop-opacity="0.32"/>
        <stop offset="0.6" stop-color="#0a0602" stop-opacity="0.62"/>
        <stop offset="1" stop-color="#0a0602" stop-opacity="0.9"/>
      </linearGradient>
      <pattern id="hazard" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="13" height="26" fill="#0d0a02"/>
        <rect x="13" width="13" height="26" fill="${p.accent}"/>
      </pattern>`)}
    <rect width="${W}" height="${H}" fill="url(#scrim)"/>
    <text x="36" y="58" font-family="CP" font-weight="700" font-size="26" fill="${p.ink}">STACK<span fill="${p.accent}">//</span>FRAME</text>
    <text x="36" y="90" font-family="JM" font-size="17" letter-spacing="4" fill="${p.dim}">SITE_VOLT · CREW 5</text>
    <text x="${W - 36}" y="58" text-anchor="end" font-family="JM" font-size="17" letter-spacing="4" fill="${p.dim}">G / VOLT</text>

    ${CELLS.map((c, i) => cardVolt(c, i, p)).join('')}
  </svg>`;
}

function cardVolt(c, i, p) {
  const x = i * COL;
  const pad = 26;
  const cw = COL - pad * 2;
  const cy0 = 108;
  const ch = H - cy0 - 30;
  return `
    <rect x="${x + pad}" y="${cy0}" width="${cw}" height="${ch}" rx="16" fill="${p.surface}" stroke="${p.border}" stroke-width="2"/>
    <rect x="${x + pad}" y="${cy0}" width="${cw}" height="26" fill="url(#hazard)"/>
    <rect x="${x + pad}" y="${cy0 + 26}" width="${cw}" height="6" fill="#0d0a02"/>
    <circle cx="${x + pad + 56}" cy="${cy0 + 66}" r="34" fill="#0d0a02" stroke="${p.accent}" stroke-width="3"/>
    <text x="${x + pad + 56}" y="${cy0 + 75}" text-anchor="middle" font-family="JM" font-size="17" fill="${p.accent}">${c.num}</text>
    <text x="${x + pad + 110}" y="${cy0 + 64}" font-family="JM" font-size="16" letter-spacing="4" fill="${p.faint}">SITE-0${i + 1}</text>
    <text x="${x + pad + 110}" y="${cy0 + 88}" font-family="JM" font-size="14" letter-spacing="3" fill="${p.dim}">ACTIVE · CREW</text>
    <g transform="translate(${x + pad + cw - 56 - 40}, ${cy0 + 66 - 40}) scale(3.3)" fill="none" stroke="${p.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.key]}</g>
    <line x1="${x + pad + 40}" y1="${cy0 + ch - 168}" x2="${x + pad + cw - 40}" y2="${cy0 + ch - 168}" stroke="${p.border}" stroke-width="2"/>
    <text x="${x + pad + 40}" y="${cy0 + ch - 98}" font-family="CP" font-size="46" fill="${p.ink}">${c.title}</text>
    <text x="${x + pad + 40}" y="${cy0 + ch - 48}" font-family="JM" font-size="17" letter-spacing="5" fill="${p.accent}">// ${c.sub}</text>
  `;
}

/* =============================================================================
   H — DATA CORE : navy/cyan terminal console (AI server art)
   ============================================================================= */
const CORE = {
  id: 'h-core',
  name: 'DATA CORE',
  tag: 'TERMINAL / CYAN TECH',
  bgImg: join(__dirname, 'richmenu-bg/core.png'),
  palette: {
    accent: '#38bdf8',
    accent2: '#22d3ee',
    surface: 'rgba(3,12,22,0.9)',
    border: '#164e63',
    ink: '#e8f7ff',
    dim: '#83c5e8',
    faint: '#4a7d99',
  },
};

function coreOverlay() {
  const p = CORE.palette;
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs(`
      <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#01060c" stop-opacity="0.36"/>
        <stop offset="0.55" stop-color="#01060c" stop-opacity="0.68"/>
        <stop offset="1" stop-color="#01060c" stop-opacity="0.92"/>
      </linearGradient>
      <linearGradient id="topbar" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${p.accent}"/><stop offset="1" stop-color="${p.accent2}"/>
      </linearGradient>`)}
    <rect width="${W}" height="${H}" fill="url(#scrim)"/>
    <text x="36" y="58" font-family="JM" font-size="22" letter-spacing="4" fill="${p.dim}">STACK<span fill="${p.accent}">//</span>FRAME</text>
    <text x="36" y="90" font-family="JM" font-size="17" letter-spacing="4" fill="${p.accent}">CORE_OS · 5 NODES</text>
    <text x="${W - 36}" y="58" text-anchor="end" font-family="JM" font-size="17" letter-spacing="4" fill="${p.faint}">H / CORE</text>

    ${CELLS.map((c, i) => cardCore(c, i, p)).join('')}
  </svg>`;
}

function cardCore(c, i, p) {
  const x = i * COL;
  const cx = x + COL / 2;
  const pad = 26;
  const cw = COL - pad * 2;
  const cy0 = 108;
  const ch = H - cy0 - 30;
  return `
    <rect x="${x + pad}" y="${cy0}" width="${cw}" height="${ch}" rx="14" fill="${p.surface}" stroke="${p.border}" stroke-width="2"/>
    <rect x="${x + pad}" y="${cy0}" width="${cw}" height="6" fill="url(#topbar)"/>
    <circle cx="${x + pad + 40}" cy="${cy0 + 38}" r="7" fill="${p.accent}" opacity="0.9"/>
    <text x="${x + pad + 58}" y="${cy0 + 46}" font-family="JM" font-size="16" letter-spacing="3" fill="${p.dim}">NODE_0${i + 1} // READY</text>
    <text x="${x + pad + 34}" y="${cy0 + 108}" font-family="JM" font-size="19" fill="${p.accent}">0${i + 1}</text>
    <text x="${x + pad + 34}" y="${cy0 + 140}" font-family="JM" font-size="15" letter-spacing="2" fill="${p.faint}">> OPEN_CHANNEL</text>
    <rect x="${cx - 58}" y="${cy0 + 170}" width="116" height="116" rx="12" fill="#041120" stroke="${p.accent}" stroke-opacity="0.5" stroke-width="2"/>
    <g transform="translate(${cx - 52}, ${cy0 + 186}) scale(4.3)" fill="none" stroke="${p.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.key]}</g>
    <line x1="${x + pad + 40}" y1="${cy0 + ch - 178}" x2="${x + pad + cw - 40}" y2="${cy0 + ch - 178}" stroke="${p.border}" stroke-width="2"/>
    <text x="${cx}" y="${cy0 + ch - 108}" text-anchor="middle" font-family="CP" font-size="46" fill="${p.ink}">${c.title}</text>
    <text x="${cx}" y="${cy0 + ch - 58}" text-anchor="middle" font-family="JM" font-size="17" letter-spacing="5" fill="${p.accent2}">${c.sub}</text>
    <text x="${cx}" y="${cy0 + ch - 26}" text-anchor="middle" font-family="JM" font-size="14" letter-spacing="4" fill="${p.faint}">sys://mcky.space</text>
  `;
}

/* =============================================================================
   I — ROYAL GOLD : luxury gold/cream on black (pure SVG)
   ============================================================================= */
const GOLD = {
  id: 'i-gold',
  name: 'ROYAL GOLD',
  tag: 'LUXURY / GOLD ON BLACK',
  palette: {
    bg: ['#0c0a05', '#0a0804', '#060502'],
    accent: '#d4af37',
    accent2: '#f0e6b0',
    surface: 'rgba(20,17,9,0.94)',
    border: '#3d3518',
    ink: '#f7f1dc',
    dim: '#c9bc8f',
    faint: '#8a7c50',
  },
};

function goldBase() {
  const p = GOLD.palette;
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs(`
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${p.bg[0]}"/><stop offset="0.55" stop-color="${p.bg[1]}"/><stop offset="1" stop-color="${p.bg[2]}"/>
      </linearGradient>
      <radialGradient id="ease" cx="0.5" cy="0.05" r="0.95">
        <stop offset="0" stop-color="${p.accent}" stop-opacity="0.07"/>
        <stop offset="1" stop-color="${p.bg[0]}" stop-opacity="0"/>
      </radialGradient>`)}
    <rect width="${W}" height="${H}" fill="${p.bg[0]}"/>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#ease)"/>
  </svg>`;
}

function goldOverlay() {
  const p = GOLD.palette;
  const hairs = [1, 2, 3, 4]
    .map((i) => `<line x1="${i * COL}" y1="120" x2="${i * COL}" y2="${H - 24}" stroke="${p.accent}" stroke-opacity="0.14" stroke-width="2"/>`)
    .join('');
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs()}
    <text x="36" y="62" font-family="CP" font-weight="700" font-size="30" fill="${p.ink}">STACK<span fill="${p.accent}">//</span>FRAME</text>
    <text x="36" y="98" font-family="JM" font-size="18" letter-spacing="6" fill="${p.dim}">EST 2026 · PREMIUM ACCESS</text>
    <text x="${W - 36}" y="62" text-anchor="end" font-family="JM" font-size="18" letter-spacing="6" fill="${p.dim}">I / GOLD</text>
    <line x1="36" y1="112" x2="${W - 36}" y2="112" stroke="${p.accent}" stroke-opacity="0.35" stroke-width="2"/>
    ${hairs}
    ${CELLS.map((c, i) => cardGold(c, i, p)).join('')}
  </svg>`;
}

function cardGold(c, i, p) {
  const x = i * COL;
  const cx = x + COL / 2;
  const pad = 26;
  const cw = COL - pad * 2;
  const cy0 = 116;
  const ch = H - cy0 - 30;
  return `
    <rect x="${x + pad}" y="${cy0}" width="${cw}" height="${ch}" rx="6" fill="${p.surface}" stroke="${p.border}" stroke-width="2"/>
    <rect x="${x + pad}" y="${cy0}" width="${cw}" height="4" fill="${p.accent}"/>
    <text x="${x + pad + cw - 34}" y="${cy0 + 118}" text-anchor="end" font-family="CPR" font-size="148" fill="${p.accent}" opacity="0.16">${c.num}</text>
    <text x="${x + pad + 36}" y="${cy0 + 56}" font-family="JM" font-size="15" letter-spacing="5" fill="${p.faint}">NO · ${c.num}</text>
    <text x="${x + pad + 36}" y="${cy0 + 84}" font-family="JM" font-size="14" letter-spacing="3" fill="${p.dim}">${p.accent2 === 'x' ? '' : 'MEMBER SERVICE'}</text>
    <circle cx="${x + pad + cw - 62}" cy="${cy0 + 108}" r="42" fill="none" stroke="${p.accent}" stroke-opacity="0.55" stroke-width="3"/>
    <g transform="translate(${x + pad + cw - 62 - 37}, ${cy0 + 108 - 37}) scale(3.05)" fill="none" stroke="${p.accent}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.key]}</g>
    <line x1="${x + pad + 36}" y1="${cy0 + ch - 156}" x2="${x + pad + cw - 36}" y2="${cy0 + ch - 156}" stroke="${p.accent}" stroke-opacity="0.3" stroke-width="1.5"/>
    <text x="${x + pad + 36}" y="${cy0 + ch - 96}" font-family="CP" font-weight="700" font-size="45" fill="${p.ink}">${c.title}</text>
    <text x="${x + pad + 36}" y="${cy0 + ch - 52}" font-family="JM" font-size="16" letter-spacing="5" fill="${p.accent}">${c.sub}</text>
  `;
}

/* =============================================================================
   Render pipeline
   ============================================================================= */
const VARIANTS = [
  { def: NEO, base: null, overlay: neoOverlay },
  { def: STUDIO, base: studioBase, overlay: studioOverlay },
  { def: FIELD, base: null, overlay: fieldOverlay },
  { def: EDITORIAL, base: editorialBase, overlay: editorialOverlay },
  { def: TYPO, base: typoBase, overlay: typoOverlay },
  { def: NOIR, base: null, overlay: noirOverlay },
  { def: VOLT, base: null, overlay: voltOverlay },
  { def: CORE, base: null, overlay: coreOverlay },
  { def: GOLD, base: goldBase, overlay: goldOverlay },
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
   LINE deploy (5 equal tap areas, full height)
   ============================================================================= */
async function deploy(v) {
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN is required to deploy.');
  }
  const client = new Client({ channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN });

  const areas = CELLS.map((c, i) => ({
    bounds: { x: Math.round(i * COL), y: 0, width: Math.round(COL), height: H },
    action: { type: 'uri', uri: c.uri },
  }));

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
  const argPair = (name) => {
    const idx = args.indexOf(name);
    if (idx !== -1) return args[idx + 1] || '';
    const eq = args.find((a) => a.startsWith(`${name}=`));
    return eq ? eq.split('=')[1] : null;
  };
  const onlyArg = argPair('--only');
  const only = onlyArg ? onlyArg.split(',').map((s) => s.trim().toLowerCase()) : null;
  const noSheet = args.includes('--no-sheet');
  const deployId = argPair('--deploy');
  const outDir = argPair('-o') || 'frontend/previews/richmenu';

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
<title>Rich menu redesign · ${results.length} concepts</title>
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
<p>${results.length} concepts, 2500×843, black backgrounds. Tap areas identical in all: 5 ปุ่มเรียงแถวเดียว (ส่งรูปงาน LIFF · บันทึกงาน truck · เปิดหน้าลูกค้า data · เปิด STS oms.cfwenterprise.com/sts · เปิดสมาชิก me.mcky.space)</p></header>
<div class="grid">
${results
  .map(
    (r) => `<div class="card"><img src="${r.v.def.id}-web.jpg" alt="${r.v.def.name}">
<div class="meta"><b>${r.v.def.name}</b><span>${r.v.def.tag}</span></div>
<p class="note">Full size: <a href="${r.v.def.id}.png" style="color:#7db8ff">${r.v.def.id}.png</a></p></div>`
  )
  .join('')}
</div>
<footer>Render: <code>NODE_PATH=backend/node_modules:frontend/node_modules node scripts/richmenu-designs.cjs</code> · Deploy a pick: <code>--deploy e-mono</code></footer>
</body></html>`,
  );
  console.log(`Gallery -> ${gallery}`);
}

main().catch((err) => {
  console.error('FAILED:', err.message || err);
  process.exit(1);
});