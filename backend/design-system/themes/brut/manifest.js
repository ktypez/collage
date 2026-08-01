/* =============================================================================
   themes/brut/manifest.js — BRUT (brutalist theme)
   -----------------------------------------------------------------------------
   สาย Brutalist — "ไม่ขออนุญาตสวย"
   - raw palette: black + white + red, ไม่มี gradient ฟุ้ง
   - Anton (impact-type display) + IBM Plex Mono heavy
   - 1px border หนา 2-4px ดำ / border-radius 0 ทุกจุด / ไม่มี shadow
   - hover = invert ฉับพลัน (ไม่ transition นุ่ม ๆ)
   ============================================================================= */
export const manifest = {
  id: 'brut',
  name: 'BRUT',
  dot: '#ff2e00',

  /* UI copy — raw / no-mercy tone */
  ui: {
    heroMeta: '~/brut',
    genIdle: '> BUILD RAW',
    genReady: '> SHIPPED · UNPOLISHED',
    genHint: '// beauty is not requested.',
    outputTitle: 'BRUT · RAW OUTPUT',
    outputTag: 'RAW',
    uploadText: 'drop files here. no mercy.',
    logIntro: '$ brut build --no-design',
    ach: ['🏆 No shadows used', '🏆 0% border-radius', '🏆 Impact fonts only', '🏆 Ugly on purpose'],
    heroTitle: 'BRUT<span class="ext">.</span>',
    heroDesc: 'collage ที่ไม่ขออนุญาตสวย<br><span style="font-family:monospace">1px border · 0px radius · 100% attitude</span>',
  },

  /* Design tokens — single source of truth (raw) */
  tokens: {
    mode: ['light'],

    bg:          '#e8e4da',  // raw concrete
    surface:     '#ffffff',  // flat white
    surface2:    '#d8d4ca',  // concrete dark
    ink:         '#0d0d0d',  // near black
    inkMuted:    '#3d3d3a',
    inkDim:      'rgba(13,13,13,0.55)',
    border:      '#0d0d0d',  // borders = ink, 2px+

    accent:      '#ff2e00',  // signal red
    accentDeep:  '#c91f00',
    accentSoft:  'rgba(255,46,0,0.1)',
    white:       '#ffffff',

    success:     '#0d0d0d',
    warn:        '#ff2e00',
    danger:      '#ff2e00',
    info:        '#0d0d0d',

    fontDisp:    "'Anton', 'Impact', sans-serif",
    fontBody:    "'IBM Plex Mono', 'JetBrains Mono', ui-monospace, monospace",
    fontMono:    "'IBM Plex Mono', ui-monospace, monospace",
  },

  /* Canvas manifest — สำหรับ collage output (raw black/white/red) */
  canvas: {
    bg: { gradient: ['#e8e4da', '#d8d4ca', '#e8e4da'], vertical: true },
    cell: {
      border: '#0d0d0d', width: 2, rounded: 0,
      bg: '#ffffff',
    },
    header: {
      text: 'BRUT · RAW OUTPUT',
      color: '#0d0d0d', font: 'mono', size: 36, pad: 48, glow: false,
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
