/* =============================================================================
   themes/moss/manifest.js — MOSS (organic, earth-tone theme)
   -----------------------------------------------------------------------------
   สาย Organic — ตรงข้าม dark techno ตัวอื่นในคลังชัดเจน
   - earth palette: moss green + terracotta + cream/sand
   - blob shapes (organic border-radius) + soft warm shadows
   - Fraunces serif (wonky organic) + ui-monospace fallback
   - motion: springy, อ่อนไหว ไม่ snap
   ============================================================================= */
export const manifest = {
  id: 'moss',
  name: 'MOSS',
  dot: '#6a8c3f',

  /* UI copy — organic / garden tone */
  ui: {
    heroMeta: '~/garden',
    genIdle: '> watering…',
    genReady: '> grown · 6 weeks',
    genHint: '// grow slow, seed plenty.',
    outputTitle: 'MOSS · GARDEN DONE',
    outputTag: 'BLOOMED',
    uploadText: 'drop seeds here',
    logIntro: '$ moss grow --south-facing',
    ach: ['🌱 Grown from seed', '🌿 100% organic', '🍄 Mycelium network', '🌻 6 weeks of sun'],
    heroTitle: 'MOSS<span class="ext">.</span>',
    heroDesc: 'collage ที่เติบโตเองตามธรรมชาติ<br>earth tone · blob shape · <span style="font-family:monospace">spring physics</span>',
  },

  /* Design tokens — single source of truth (warm light) */
  tokens: {
    mode: ['light'],

    bg:          '#f5f1e8',  // warm sand
    surface:     '#fdfbf5',  // cream
    surface2:    '#efe9db',  // deeper sand
    border:      'rgba(46,42,36,0.14)',
    borderBright: 'rgba(46,42,36,0.28)',
    ink:         '#2e2a24',  // warm dark brown
    inkMuted:    '#6b645a',
    inkDim:      'rgba(46,42,36,0.45)',

    accent:      '#6a8c3f',  // moss green
    accentDeep:  '#4f6d2d',
    accentSoft:  'rgba(106,140,63,0.14)',
    terra:       '#c4714a',  // terracotta
    terraSoft:   'rgba(196,113,74,0.12)',
    clay:        '#d9a05b',  // warm clay

    success:     '#5c7a3d',
    warn:        '#b0832f',
    danger:      '#a84d33',
    info:        '#4a6b7a',

    fontSerif:   "'Fraunces', 'Source Serif 4', Georgia, serif",
    fontSans:    "'Fraunces', -apple-system, 'Segoe UI', sans-serif",
    fontMono:    "ui-monospace, 'SF Mono', 'Cascadia Mono', Consolas, monospace",
  },

  /* Canvas manifest — สำหรับ collage output (sand bg, moss cells, rounded) */
  canvas: {
    bg: { gradient: ['#f5f1e8', '#efe9db', '#f5f1e8'], vertical: true },
    cell: {
      border: 'rgba(106,140,63,0.35)', width: 1, rounded: 16,
      bg: '#fdfbf5',
    },
    header: {
      text: 'MOSS · GARDEN',
      color: '#2e2a24', font: 'serif', size: 36, pad: 48, glow: false,
    },
    overlay: 'none',
    photoFx: 'none',
    presetAccent: false,
  },

  hooks: {
    preDraw: null,
    postDraw: null,
  },
};
