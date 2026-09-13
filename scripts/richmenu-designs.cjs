/**
 * Rich menu design showcase + deploy.
 *
 * Renders 9 distinct 2500x1686 rich menu designs for the collage LINE bot and
 * composites them into preview images. Layout: two rows of tappable buttons
 * (top 2, bottom 3) — see ROW_COLS.
 *
 *   A. STUDIO 03  — clean "web edition" (lime on black, mirrors frontend)
 *   B. NEO GRID   — neon cyan/magenta tech (AI art bg + bezel + corner LEDs)
 *   C. FIELD 01   — cinematic work-site art (amber on dark, docu captions)
 *   D. EDITORIAL  — dark poster style (cream ink + orange, high contrast)
 *   E. MONO TYPE  — pure black & white, typography-first (big type)
 *   F. NOIR NIGHTS — crimson neon film-noir on black (AI night city art)
 *   G. SITE VOLT   — industrial amber/yellow, hazard stripes (AI site art)
 *   H. DATA CORE   — navy/cyan terminal console (AI server art)
 *   I. ROYAL GOLD  — bright gold/cream on black, luxury (pure SVG)
 *
 * All designs use near-black (never pure #000) backgrounds.
 *
 * Layout: 2 rows / 5 buttons. Tap areas IDENTICAL in every design:
 *   Top  row:  1. ส่งรูปงาน (LIFF)     2. ไรเดอร์ (rider.ezzytransporter.com)
 *   Bottom row:3. บันทึกงาน (truck)    4. เปิดหน้าลูกค้า (data)   5. เปิดสมาชิก (me)
 *
 * Usage:
 *   NODE_PATH=backend/node_modules:frontend/node_modules node scripts/richmenu-designs.cjs
 *       [-o <outdir>]        default: frontend/previews/richmenu
 *       [--only a,b]         render a subset (by first letter of id)
 *       [--no-sheet]         skip the contact sheet
 *       [--deploy <id>]      render <id>, then create+upload+set-default on LINE
 *
 * LINE deploy needs LINE_CHANNEL_ACCESS_TOKEN=xxx (also read from backend/.env).
 */
const sharp = require('sharp');
const { Client } = require('@line/bot-sdk');
const { join, resolve } = require('path');
const { readFileSync, writeFileSync, mkdirSync, rmSync } = require('fs');

const LIFF_ID = process.env.LIFF_ID || '2010606328-7UnH1Yre';
const TRUCK_URL = 'https://truck.mcky.space';
const DATA_URL = 'https://data.mcky.space';
const PORTAL_URL = 'https://me.mcky.space';
const RIDER_URL = 'https://rider.ezzytransporter.com';

const W = 2500;
const H = 1686;
const ROW_COLS = [2, 3]; // top row 2 buttons, bottom row 3 buttons

const FONT_CP = resolve(__dirname, '../backend/design-system/fonts/ChakraPetch-SemiBold.ttf');
const FONT_CP_R = resolve(__dirname, '../backend/design-system/fonts/ChakraPetch-Regular.ttf');
const FONT_MONO = resolve(__dirname, '../backend/design-system/fonts/JetBrainsMono-Regular.ttf');

const CELLS = [
  { key: 'collage', num: '01', title: 'ส่งรูปงาน', sub: 'COLLAGE', uri: `https://liff.line.me/${LIFF_ID}` },
  { key: 'rider', num: '02', title: 'ไรเดอร์', sub: 'RIDER', uri: RIDER_URL },
  { key: 'truck', num: '03', title: 'บันทึกงาน', sub: 'TRUCK', uri: TRUCK_URL },
  { key: 'data', num: '04', title: 'เปิดหน้าลูกค้า', sub: 'CLIENT DATA', uri: DATA_URL },
  { key: 'portal', num: '05', title: 'เปิดสมาชิก', sub: 'PORTAL', uri: PORTAL_URL },
];

const ICONS = {
  collage:
    '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/>',
  rider:
    '<circle cx="5.5" cy="17.5" r="2.6"/><circle cx="18.5" cy="17.5" r="2.6"/><path d="M5.5 14.9l1.8-3.6h3.3l1.6 2.4 2.3-.1"/><path d="M8 15.6h9.5"/><path d="M14.5 15.6l3-2.2"/><path d="M3 17.5h2.5"/><path d="M16 17.5h2.5"/>',
  truck:
    '<path d="M1 8h12v9H1z"/><path d="M13 11h5l3 3v3h-8"/><circle cx="5.5" cy="19" r="1.8"/><circle cx="16.5" cy="19" r="1.8"/>',
  data:
    '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  portal: '<rect x="8" y="6" width="8" height="12" rx="4"/><circle cx="11" cy="11" r="1.2"/>',
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

/** Cell geometry for render + tap areas (top row 2 cols, bottom row 3 cols). */
function cellGeom(i) {
  let idx = 0;
  const rowH = H / 2;
  for (let r = 0; r < ROW_COLS.length; r++) {
    const cols = ROW_COLS[r];
    const colW = W / cols;
    for (let c = 0; c < cols; c++) {
      if (idx === i) {
        const x = Math.round(c * colW);
        const y = Math.round(r * rowH);
        const w = Math.round(colW);
        const h = Math.round(rowH);
        const pad = Math.round(Math.min(w, h) * 0.06);
        return {
          i, row: r, col: c, x, y, w, h,
          cx: x + w / 2, cy: y + h / 2,
          pad, bx: x + pad, by: y + pad,
          bw: w - pad * 2, bh: h - pad * 2,
        };
      }
      idx++;
    }
  }
  throw new Error(`cell ${i} out of range`);
}

/* =============================================================================
   B — NEO GRID
   ============================================================================= */
const NEO = {
  id: 'b-neo',
  name: 'NEO GRID',
  tag: 'NEON CYAN x MAGENTA',
  bgImg: join(__dirname, 'richmenu-bg/neo.png'),
  palette: {
    accent: '#00ffd0',
    accent2: '#ff3be8',
    surface: 'rgba(5,8,15,0.9)',
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
        <stop offset="0" stop-color="#020308" stop-opacity="0.36"/>
        <stop offset="0.5" stop-color="#020308" stop-opacity="0.68"/>
        <stop offset="1" stop-color="#020308" stop-opacity="0.9"/>
      </linearGradient>`)}
    <rect width="${W}" height="${H}" fill="url(#scrim)"/>
    ${gridLines.join('')}

    ${CELLS.map((c, i) => cardNeo(c, i, p)).join('')}

    <rect x="10" y="10" width="${W - 20}" height="${H - 20}" rx="12" fill="none" stroke="${p.accent}" stroke-opacity="0.32" stroke-width="3"/>
    <rect x="22" y="22" width="${W - 44}" height="${H - 44}" rx="8" fill="none" stroke="${p.accent2}" stroke-opacity="0.2" stroke-width="2"/>
    ${[
      ['6', '6', p.accent], ['6', H - 26, p.accent2], [W - 26, '6', p.accent2], [W - 26, H - 26, p.accent],
    ]
      .map(([lx, ly, col]) => `<rect x="${lx}" y="${ly}" width="20" height="20" rx="4" fill="${col}"/>`)
      .join('')}
    <rect width="${W}" height="${H}" fill="#0d1018" opacity="0.09"/>
  </svg>`;
}

function cardNeo(c, i, p) {
  const g = cellGeom(i);
  const ic = i % 2 === 0 ? p.accent : p.accent2;
  const bars = [p.accent, p.accent2, p.accent, p.accent2, p.accent][i];
  const t = 84;
  return `
    <clipPath id="clip${i}"><rect x="${g.bx}" y="${g.by}" width="${g.bw}" height="${g.bh}" rx="24"/></clipPath>
    <rect x="${g.bx}" y="${g.by}" width="${g.bw}" height="${g.bh}" rx="24" fill="${p.surface}" stroke="${p.border}" stroke-width="2"/>
    <rect x="${g.bx}" y="${g.by}" width="${g.bw}" height="8" rx="4" fill="${bars}"/>
    <g clip-path="url(#clip${i})">
      <g transform="translate(${g.cx - 12 * 26}, ${g.cy - 12 * 26}) scale(26)" fill="none" stroke="${p.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.1">${ICONS[c.key]}</g>
    </g>
    <rect x="${g.bx + 40}" y="${g.by + 36}" width="72" height="34" rx="6" fill="none" stroke="${p.border}" stroke-width="2"/>
    <text x="${g.bx + 76}" y="${g.by + 60}" text-anchor="middle" font-family="JM" font-size="19" fill="${ic}">${c.num}</text>
    <rect x="${g.cx - 70}" y="${g.by + 94}" width="140" height="140" rx="14" fill="#0a0f22" stroke="${ic}" stroke-opacity="0.55" stroke-width="2"/>
    <g transform="translate(${g.cx - 61}, ${g.by + 112}) scale(5.05)" fill="none" stroke="${p.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.key]}</g>
    <text x="${g.cx}" y="${g.cy + 78}" text-anchor="middle" font-family="CP" font-size="${t}" fill="${p.ink}">${c.title}</text>
    <text x="${g.cx}" y="${g.cy + 170}" text-anchor="middle" font-family="JM" font-size="21" letter-spacing="6" fill="${ic}">// ${c.sub}</text>
    <rect x="${g.bx}" y="${g.by + g.bh - 22}" width="${g.bw}" height="6" rx="3" fill="${ic}"/>
  `;
}

/* =============================================================================
   A — STUDIO 03
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
    ${CELLS.map((c, i) => cardStudio(c, i, p)).join('')}
  </svg>`;
}

function cardStudio(c, i, p) {
  const g = cellGeom(i);
  const isPrimary = i === 0;
  return `
    <clipPath id="clip${i}"><rect x="${g.bx}" y="${g.by}" width="${g.bw}" height="${g.bh}" rx="28"/></clipPath>
    <rect x="${g.bx}" y="${g.by}" width="${g.bw}" height="${g.bh}" rx="28" fill="${p.surface}" stroke="${p.border}" stroke-width="3"/>
    ${isPrimary
      ? `<rect x="${g.bx}" y="${g.by}" width="${g.bw}" height="9" fill="${p.accent}"/>`
      : `<rect x="${g.bx + 36}" y="${g.by}" width="64" height="9" rx="4" fill="${p.accent}"/>`}
    <g clip-path="url(#clip${i})">
      <g transform="translate(${g.cx - 12 * 26}, ${g.cy - 12 * 26}) scale(26)" fill="none" stroke="${p.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.09">${ICONS[c.key]}</g>
    </g>
    <text x="${g.bx + 46}" y="${g.by + 74}" font-family="JM" font-size="20" letter-spacing="3" fill="${p.faint}">${c.num}</text>
    <text x="${g.cx}" y="${g.by + 170}" text-anchor="middle" font-family="JM" font-size="22" letter-spacing="10" fill="${p.accent}">${c.sub}</text>
    <g transform="translate(${g.cx - 50}, ${g.by + 210}) scale(4.15)" fill="none" stroke="${p.accent}" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.key]}</g>
    <line x1="${g.bx + 60}" y1="${g.cy + 30}" x2="${g.bx + g.bw - 60}" y2="${g.cy + 30}" stroke="${p.border}" stroke-width="3"/>
    <text x="${g.cx}" y="${g.cy + 122}" text-anchor="middle" font-family="CP" font-size="${84}" fill="${p.ink}">${c.title}</text>
    <text x="${g.cx}" y="${g.bh - g.by + g.cy + 8}" text-anchor="middle" font-family="JM" font-size="16" letter-spacing="6" fill="${p.faint}">TAP</text>
  `;
}

/* =============================================================================
   C — FIELD 01
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
        <stop offset="0" stop-color="#090604" stop-opacity="0.26"/>
        <stop offset="0.5" stop-color="#090604" stop-opacity="0.62"/>
        <stop offset="1" stop-color="#090604" stop-opacity="0.9"/>
      </linearGradient>`)}
    <rect width="${W}" height="${H}" fill="url(#scrim)"/>
    ${CELLS.map((c, i) => cardField(c, i, p)).join('')}
    <rect width="${W}" height="${H}" fill="#0f0c08" opacity="0.07"/>
    <rect x="40" y="${H - 18}" width="70" height="7" rx="3" fill="${p.accent}"/>
  </svg>`;
}

function cardField(c, i, p) {
  const g = cellGeom(i);
  return `
    <clipPath id="clip${i}"><rect x="${g.bx}" y="${g.by}" width="${g.bw}" height="${g.bh}" rx="26"/></clipPath>
    <rect x="${g.bx}" y="${g.by}" width="${g.bw}" height="${g.bh}" rx="26" fill="${p.surface}" stroke="${p.border}" stroke-width="2"/>
    <g clip-path="url(#clip${i})">
      <g transform="translate(${g.cx - 12 * 26}, ${g.cy - 12 * 26}) scale(26)" fill="none" stroke="${p.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.1">${ICONS[c.key]}</g>
    </g>
    <text x="${g.bx + 48}" y="${g.by + 140}" font-family="CPR" font-size="150" fill="${p.accent}" opacity="0.26">${c.num}</text>
    <text x="${g.bx + 48}" y="${g.by + 64}" font-family="JM" font-size="18" letter-spacing="2" fill="${p.dim}">REC ${c.num}</text>
    <circle cx="${g.bx + g.bw - 84}" cy="${g.by + 92}" r="52" fill="none" stroke="${p.accent}" stroke-opacity="0.7" stroke-width="3"/>
    <g transform="translate(${g.bx + g.bw - 84 - 47}, ${g.by + 92 - 47}) scale(3.9)" fill="none" stroke="${p.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.key]}</g>
    <line x1="${g.bx + 48}" y1="${g.cy - 8}" x2="${g.bx + g.bw - 48}" y2="${g.cy - 8}" stroke="${p.border}" stroke-width="2"/>
    <text x="${g.bx + 48}" y="${g.cy + 92}" font-family="CP" font-size="${84}" fill="${p.ink}">${c.title}</text>
    <text x="${g.bx + 48}" y="${g.cy + 168}" font-family="JM" font-size="21" letter-spacing="5" fill="${p.accent}">${c.sub}</text>
  `;
}

/* =============================================================================
   D — EDITORIAL
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
        <stop offset="0" stop-color="${p.accent}" stop-opacity="0.07"/>
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
    ${CELLS.map((c, i) => cardEditorial(c, i, p)).join('')}
    <rect x="0" y="${H - 7}" width="${W}" height="7" fill="${p.accent}"/>
  </svg>`;
}

function cardEditorial(c, i, p) {
  const g = cellGeom(i);
  return `
    <clipPath id="clip${i}"><rect x="${g.bx}" y="${g.by}" width="${g.bw}" height="${g.bh}" rx="16"/></clipPath>
    <rect x="${g.bx}" y="${g.by}" width="${g.bw}" height="${g.bh}" rx="16" fill="${p.surface}" stroke="${p.border}" stroke-width="3"/>
    <rect x="${g.bx}" y="${g.by}" width="${g.bw}" height="10" fill="${p.accent}"/>
    <g clip-path="url(#clip${i})">
      <g transform="translate(${g.cx - 12 * 26}, ${g.cy - 12 * 26}) scale(26)" fill="none" stroke="${p.ink}" stroke-width="2.05" stroke-linecap="round" stroke-linejoin="round" opacity="0.1">${ICONS[c.key]}</g>
    </g>
    <text x="${g.bx + g.bw - 40}" y="${g.by + 130}" text-anchor="end" font-family="CPR" font-size="140" fill="${p.accent}">${c.num}</text>
    <g transform="translate(${g.cx - 52}, ${g.by + 230}) scale(4.3)" fill="none" stroke="${p.ink}" stroke-width="2.05" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.key]}</g>
    <line x1="${g.bx + 44}" y1="${g.cy - 12}" x2="${g.bx + g.bw - 44}" y2="${g.cy - 12}" stroke="${p.dim}" stroke-opacity="0.35" stroke-width="2"/>
    <text x="${g.bx + 44}" y="${g.cy + 96}" font-family="CP" font-weight="700" font-size="${84}" fill="${p.ink}">${c.title}</text>
    <text x="${g.bx + 44}" y="${g.cy + 168}" font-family="JM" font-size="21" letter-spacing="6" fill="${p.accent}">${c.sub}</text>
  `;
}

/* =============================================================================
   E — MONO TYPE
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
  const rulings = `
    <line x1="${W / 2}" y1="${H * 0.08}" x2="${W / 2}" y2="${H / 2}" stroke="${p.hair}" stroke-width="2"/>
    <line x1="${W / 3}" y1="${H / 2}" x2="${W / 3}" y2="${H - H * 0.08}" stroke="${p.hair}" stroke-width="2"/>
    <line x1="${(W / 3) * 2}" y1="${H / 2}" x2="${(W / 3) * 2}" y2="${H - H * 0.08}" stroke="${p.hair}" stroke-width="2"/>
    <line x1="${W * 0.03}" y1="${H / 2}" x2="${W * 0.97}" y2="${H / 2}" stroke="${p.hair}" stroke-width="2"/>`;
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs()}
    ${rulings}
    ${CELLS.map((c, i) => cardTypo(c, i, p)).join('')}
  </svg>`;
}

function cardTypo(c, i, p) {
  const g = cellGeom(i);
  return `
    <text x="${g.cx}" y="${g.cy + 8}" text-anchor="middle" font-family="CPR" font-size="330" fill="${p.ink}" opacity="0.06">${c.num}</text>
    <text x="${g.cx}" y="${g.by + 96}" text-anchor="middle" font-family="JM" font-size="24" letter-spacing="12" fill="${p.ink}">— ${c.sub} —</text>
    <text x="${g.cx}" y="${g.cy - 110}" text-anchor="middle" font-family="CP" font-weight="700" font-size="96" fill="${p.ink}">${c.title}</text>
    <line x1="${g.cx - 170}" y1="${g.cy + 150}" x2="${g.cx + 170}" y2="${g.cy + 150}" stroke="${p.faint}" stroke-width="2"/>
    <text x="${g.cx}" y="${g.cy + 212}" text-anchor="middle" font-family="JM" font-size="22" letter-spacing="8" fill="${p.dim}">OPEN →</text>
  `;
}

/* =============================================================================
   F — NOIR NIGHTS
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
        <stop offset="0" stop-color="#050103" stop-opacity="0.36"/>
        <stop offset="0.5" stop-color="#050103" stop-opacity="0.66"/>
        <stop offset="1" stop-color="#050103" stop-opacity="0.9"/>
      </linearGradient>`)}
    <rect width="${W}" height="${H}" fill="url(#scrim)"/>
    ${CELLS.map((c, i) => cardNoir(c, i, p)).join('')}
    <rect width="${W}" height="${H}" fill="#0b0406" opacity="0.08"/>
  </svg>`;
}

function cardNoir(c, i, p) {
  const g = cellGeom(i);
  const glow = i % 2 === 0 ? p.accent : p.accent2;
  return `
    <clipPath id="clip${i}"><rect x="${g.bx}" y="${g.by}" width="${g.bw}" height="${g.bh}" rx="24"/></clipPath>
    <rect x="${g.bx}" y="${g.by}" width="${g.bw}" height="${g.bh}" rx="24" fill="${p.surface}" stroke="${p.border}" stroke-width="2"/>
    <rect x="${g.bx}" y="${g.by}" width="${g.bw}" height="8" rx="4" fill="${glow}"/>
    <g clip-path="url(#clip${i})">
      <g transform="translate(${g.cx - 12 * 26}, ${g.cy - 12 * 26}) scale(26)" fill="none" stroke="${glow}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.12">${ICONS[c.key]}</g>
    </g>
    <text x="${g.bx + 42}" y="${g.by + 70}" font-family="JM" font-size="18" letter-spacing="5" fill="${p.faint}">SCENE ${c.num}</text>
    <text x="${g.bx + g.bw - 42}" y="${g.by + 120}" text-anchor="end" font-family="CPR" font-size="130" fill="${glow}" opacity="0.16">${c.num}</text>
    <rect x="${g.cx - 70}" y="${g.by + 90}" width="140" height="140" rx="12" fill="#170509" stroke="${glow}" stroke-opacity="0.6" stroke-width="2"/>
    <g transform="translate(${g.cx - 61}, ${g.by + 108}) scale(5.05)" fill="none" stroke="${glow}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.key]}</g>
    <text x="${g.cx}" y="${g.cy + 80}" text-anchor="middle" font-family="CP" font-size="${84}" fill="${p.ink}">${c.title}</text>
    <text x="${g.cx}" y="${g.cy + 172}" text-anchor="middle" font-family="JM" font-size="21" letter-spacing="8" fill="${glow}">${c.sub}</text>
  `;
}

/* =============================================================================
   G — SITE VOLT
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
        <stop offset="0" stop-color="#0a0602" stop-opacity="0.34"/>
        <stop offset="0.55" stop-color="#0a0602" stop-opacity="0.64"/>
        <stop offset="1" stop-color="#0a0602" stop-opacity="0.9"/>
      </linearGradient>
      <pattern id="hazard" width="30" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="15" height="30" fill="#14100a"/>
        <rect x="15" width="15" height="30" fill="${p.accent}"/>
      </pattern>`)}
    <rect width="${W}" height="${H}" fill="url(#scrim)"/>
    ${CELLS.map((c, i) => cardVolt(c, i, p)).join('')}
    <rect width="${W}" height="${H}" fill="#0f0c06" opacity="0.07"/>
  </svg>`;
}

function cardVolt(c, i, p) {
  const g = cellGeom(i);
  const isBottom = g.row === 1;
  return `
    <clipPath id="clip${i}"><rect x="${g.bx}" y="${g.by}" width="${g.bw}" height="${g.bh}" rx="24"/></clipPath>
    <rect x="${g.bx}" y="${g.by}" width="${g.bw}" height="${g.bh}" rx="24" fill="${p.surface}" stroke="${p.border}" stroke-width="2"/>
    <rect x="${g.bx}" y="${g.by}" width="${g.bw}" height="34" fill="url(#hazard)"/>
    <rect x="${g.bx}" y="${g.by + 34}" width="${g.bw}" height="7" fill="#14100a"/>
    <g clip-path="url(#clip${i})">
      <g transform="translate(${g.cx - 12 * 26}, ${g.cy - 12 * 26}) scale(26)" fill="none" stroke="${p.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.1">${ICONS[c.key]}</g>
    </g>
    <circle cx="${g.bx + 62}" cy="${g.by + 84}" r="40" fill="#14100a" stroke="${p.accent}" stroke-width="3"/>
    <text x="${g.bx + 62}" y="${g.by + 95}" text-anchor="middle" font-family="JM" font-size="19" fill="${p.accent}">${c.num}</text>
    <text x="${g.bx + 128}" y="${g.by + 82}" font-family="JM" font-size="18" letter-spacing="4" fill="${p.faint}">SITE-0${i + 1}</text>
    <text x="${g.bx + 128}" y="${g.by + 112}" font-family="JM" font-size="16" letter-spacing="3" fill="${p.dim}">ACTIVE · CREW</text>
    <g transform="translate(${g.bx + g.bw - 92 - 45}, ${g.by + 84 - 45}) scale(3.7)" fill="none" stroke="${p.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.key]}</g>
    <line x1="${g.bx + 46}" y1="${g.cy - 10}" x2="${g.bx + g.bw - 46}" y2="${g.cy - 10}" stroke="${p.border}" stroke-width="2"/>
    <text x="${g.bx + 46}" y="${g.cy + 94}" font-family="CP" font-size="${isBottom ? 76 : 84}" fill="${p.ink}">${c.title}</text>
    <text x="${g.bx + 46}" y="${g.cy + 168}" font-family="JM" font-size="21" letter-spacing="6" fill="${p.accent}">// ${c.sub}</text>
  `;
}

/* =============================================================================
   H — DATA CORE
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
        <stop offset="0" stop-color="#01060c" stop-opacity="0.38"/>
        <stop offset="0.55" stop-color="#01060c" stop-opacity="0.68"/>
        <stop offset="1" stop-color="#01060c" stop-opacity="0.92"/>
      </linearGradient>
      <linearGradient id="topbar" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${p.accent}"/><stop offset="1" stop-color="${p.accent2}"/>
      </linearGradient>`)}
    <rect width="${W}" height="${H}" fill="url(#scrim)"/>
    ${CELLS.map((c, i) => cardCore(c, i, p)).join('')}
    <rect width="${W}" height="${H}" fill="#05090f" opacity="0.07"/>
  </svg>`;
}

function cardCore(c, i, p) {
  const g = cellGeom(i);
  return `
    <clipPath id="clip${i}"><rect x="${g.bx}" y="${g.by}" width="${g.bw}" height="${g.bh}" rx="22"/></clipPath>
    <rect x="${g.bx}" y="${g.by}" width="${g.bw}" height="${g.bh}" rx="22" fill="${p.surface}" stroke="${p.border}" stroke-width="2"/>
    <rect x="${g.bx}" y="${g.by}" width="${g.bw}" height="8" fill="url(#topbar)"/>
    <g clip-path="url(#clip${i})">
      <g transform="translate(${g.cx - 12 * 26}, ${g.cy - 12 * 26}) scale(26)" fill="none" stroke="${p.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.11">${ICONS[c.key]}</g>
    </g>
    <circle cx="${g.bx + 42}" cy="${g.by + 46}" r="7" fill="${p.accent}" opacity="0.95"/>
    <text x="${g.bx + 62}" y="${g.by + 54}" font-family="JM" font-size="17" letter-spacing="4" fill="${p.dim}">NODE_0${i + 1} // READY</text>
    <text x="${g.bx + 40}" y="${g.by + 120}" font-family="JM" font-size="21" fill="${p.accent}">0${i + 1} &gt; OPEN_CHANNEL</text>
    <rect x="${g.cx - 70}" y="${g.by + 86}" width="140" height="140" rx="12" fill="#041120" stroke="${p.accent}" stroke-opacity="0.5" stroke-width="2"/>
    <g transform="translate(${g.cx - 61}, ${g.by + 104}) scale(5.05)" fill="none" stroke="${p.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.key]}</g>
    <line x1="${g.bx + 42}" y1="${g.cy - 10}" x2="${g.bx + g.bw - 42}" y2="${g.cy - 10}" stroke="${p.border}" stroke-width="2"/>
    <text x="${g.cx}" y="${g.cy + 94}" text-anchor="middle" font-family="CP" font-size="${84}" fill="${p.ink}">${c.title}</text>
    <text x="${g.cx}" y="${g.cy + 160}" text-anchor="middle" font-family="JM" font-size="21" letter-spacing="7" fill="${p.accent2}">${c.sub}</text>
    <text x="${g.cx}" y="${g.by + g.bh - 28}" text-anchor="middle" font-family="JM" font-size="17" letter-spacing="5" fill="${p.faint}">sys://mcky.space</text>
  `;
}

/* =============================================================================
   I — ROYAL GOLD (bright gold, luxury)
   ============================================================================= */
const GOLD = {
  id: 'i-gold',
  name: 'ROYAL GOLD',
  tag: 'BRIGHT GOLD / LUXURY',
  palette: {
    bg: ['#110d06', '#0d0a05', '#080604'],
    accent: '#ffce3a',
    accent2: '#fff3b0',
    surface: 'rgba(28,22,9,0.92)',
    border: '#8a6d1f',
    ink: '#fffdf4',
    dim: '#e8d9a4',
    faint: '#a9935d',
  },
};

function goldBase() {
  const p = GOLD.palette;
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs(`
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${p.bg[0]}"/><stop offset="0.55" stop-color="${p.bg[1]}"/><stop offset="1" stop-color="${p.bg[2]}"/>
      </linearGradient>
      <radialGradient id="ease" cx="0.5" cy="0.08" r="0.95">
        <stop offset="0" stop-color="${p.accent}" stop-opacity="0.09"/>
        <stop offset="1" stop-color="${p.bg[0]}" stop-opacity="0"/>
      </radialGradient>`)}
    <rect width="${W}" height="${H}" fill="${p.bg[0]}"/>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#ease)"/>
  </svg>`;
}

function goldOverlay() {
  const p = GOLD.palette;
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs()}
    ${CELLS.map((c, i) => cardGold(c, i, p)).join('')}
  </svg>`;
}

function cardGold(c, i, p) {
  const g = cellGeom(i);
  const t = g.row === 0 ? 84 : 78;
  return `
    <clipPath id="clip${i}"><rect x="${g.bx}" y="${g.by}" width="${g.bw}" height="${g.bh}" rx="30"/></clipPath>
    <rect x="${g.bx}" y="${g.by}" width="${g.bw}" height="${g.bh}" rx="30" fill="${p.surface}" stroke="${p.border}" stroke-width="3"/>
    <rect x="${g.bx}" y="${g.by}" width="${g.bw}" height="7" fill="${p.accent}"/>
    <g clip-path="url(#clip${i})">
      <g transform="translate(${g.cx - 12 * 28}, ${g.cy - 12 * 28}) scale(28)" fill="none" stroke="${p.accent}" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round" opacity="0.16">${ICONS[c.key]}</g>
    </g>
    <text x="${g.bx + 44}" y="${g.by + 74}" font-family="JM" font-size="19" letter-spacing="5" fill="${p.faint}">NO · ${c.num}</text>
    <text x="${g.cx}" y="${g.cy - 8}" text-anchor="middle" font-family="CP" font-weight="700" font-size="${t}" fill="${p.ink}">${c.title}</text>
    <text x="${g.cx}" y="${g.cy + 74}" text-anchor="middle" font-family="JM" font-size="22" letter-spacing="10" fill="${p.accent}">${c.sub}</text>
    <line x1="${g.cx - 160}" y1="${g.by + g.bh - 76}" x2="${g.cx + 160}" y2="${g.by + g.bh - 76}" stroke="${p.accent}" stroke-opacity="0.4" stroke-width="2"/>
    <text x="${g.cx}" y="${g.by + g.bh - 26}" text-anchor="middle" font-family="JM" font-size="18" letter-spacing="9" fill="${p.faint}">OPEN →</text>
  `;
}

/* =============================================================================
   J — BRIGHT BLOCKS : vivid full-bleed color blocks per button
   ============================================================================= */
const BRIGHT = {
  id: 'j-bright',
  name: 'BRIGHT BLOCKS',
  tag: 'VIVID COLOR / FULL BLEED',
  palette: {
    gap: '#0d0d12',
    ink: '#14171f',
    chips: ['#d9ff4b', '#41e8ff', '#ffc233', '#b18bff', '#ff6ea8'],
    deeps: ['#a8e600', '#00b4d8', '#ff9800', '#7c4dff', '#f23aa0'],
  },
};

function brightBase() {
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="#0d0d12"/></svg>`;
}

function brightOverlay() {
  const p = BRIGHT.palette;
  const divs = `
    <line x1="${W / 2}" y1="0" x2="${W / 2}" y2="${H / 2}" stroke="${p.gap}" stroke-width="6"/>
    <line x1="${W / 3}" y1="${H / 2}" x2="${W / 3}" y2="${H}" stroke="${p.gap}" stroke-width="6"/>
    <line x1="${(W / 3) * 2}" y1="${H / 2}" x2="${(W / 3) * 2}" y2="${H}" stroke="${p.gap}" stroke-width="6"/>
    <line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" stroke="${p.gap}" stroke-width="6"/>`;
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs()}
    ${CELLS.map((c, i) => cardBright(c, i, p)).join('')}
    ${divs}
  </svg>`;
}

function cardBright(c, i, p) {
  const g = cellGeom(i);
  const t = g.row === 0 ? 86 : 80;
  return `
    <defs><linearGradient id="blk${i}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${p.chips[i]}"/><stop offset="1" stop-color="${p.deeps[i]}"/>
    </linearGradient></defs>
    <rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" fill="url(#blk${i})"/>
    <g transform="translate(${g.cx - 12 * 26}, ${g.cy - 12 * 26}) scale(26)" fill="none" stroke="${p.ink}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.13">${ICONS[c.key]}</g>
    <text x="${g.x + 50}" y="${g.y + 80}" font-family="JM" font-size="20" letter-spacing="5" fill="${p.ink}" opacity="0.8">${c.num}</text>
    <text x="${g.cx}" y="${g.cy - 8}" text-anchor="middle" font-family="CP" font-weight="700" font-size="${t}" fill="${p.ink}">${c.title}</text>
    <text x="${g.cx}" y="${g.cy + 74}" text-anchor="middle" font-family="JM" font-size="22" letter-spacing="10" fill="${p.ink}" opacity="0.75">${c.sub}</text>
    <text x="${g.cx}" y="${g.y + g.h - 34}" text-anchor="middle" font-family="JM" font-size="18" letter-spacing="9" fill="${p.ink}" opacity="0.5">OPEN →</text>
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
  { def: BRIGHT, base: brightBase, overlay: brightOverlay },
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
  const tileImgH = Math.round((tileW / W) * H); // ~742
  const tileH = tileImgH + labelH;
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
   LINE deploy (5 tap areas, 2 rows: 2 top + 3 bottom)
   ============================================================================= */
async function deploy(v) {
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN is required to deploy.');
  }
  const client = new Client({ channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN });

  const areas = CELLS.map((c, i) => {
    const g = cellGeom(i);
    return { bounds: { x: g.x, y: g.y, width: g.w, height: g.h }, action: { type: 'uri', uri: c.uri } };
  });

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

  // sanity log — verify what we're about to upload actually looks like the variant
  {
    const raw = await sharp(tmpPng).raw().toBuffer({ resolveWithObject: true });
    const { data, info } = raw;
    const cc = info.channels;
    const at = (x, y) => `[${data[(y * info.width + x) * cc]},${data[(y * info.width + x) * cc + 1]},${data[(y * info.width + x) * cc + 2]}]`;
    const fsize = (await import('fs')).statSync(tmpPng).size;
    console.log(
      `  pre-upload sanity ${info.width}x${info.height} bytes=${fsize} ` +
      `(625,421)=${at(625, 421)} (1875,421)=${at(1875, 421)} (1250,1264)=${at(1250, 1264)} (2083,1264)=${at(2083, 1264)}`
    );
  }

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
    const v = VARIANTS.find((x) => x.def.id === deployId || x.def.name.toLowerCase() === deployId);
    if (!v) throw new Error(`Unknown design: ${deployId}. Available: ${VARIANTS.map((x) => x.def.id).join(', ')}`);
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
  :root{--bg:#0d0d10;--ink:#f4f4f0;--dim:#a1a1a8;--line:#2a2a32;--acc:#ffce3a}
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
<p>${results.length} concepts, 2500×1686, dark backgrounds, 2 rows (top 2 / bottom 3) · ส่งรูปงาน LIFF · ไรเดอร์ rider.ezzytransporter.com · บันทึกงาน truck · เปิดหน้าลูกค้า data · เปิดสมาชิก me.mcky.space</p></header>
<div class="grid">
${results
  .map(
    (r) => `<div class="card"><img src="${r.v.def.id}-web.jpg" alt="${r.v.def.name}">
<div class="meta"><b>${r.v.def.name}</b><span>${r.v.def.tag}</span></div>
<p class="note">Full size: <a href="${r.v.def.id}.png" style="color:#7db8ff">${r.v.def.id}.png</a></p></div>`
  )
  .join('')}
</div>
<footer>Render: <code>NODE_PATH=backend/node_modules:frontend/node_modules node scripts/richmenu-designs.cjs</code> · Deploy a pick: <code>--deploy i-gold</code></footer>
</body></html>`,
  );
  console.log(`Gallery -> ${gallery}`);
}

main().catch((err) => {
  console.error('FAILED:', err.message || err);
  process.exit(1);
});