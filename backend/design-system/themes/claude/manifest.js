/* =============================================================================
   themes/claude/manifest.js — CLAUDE PAPER (warm editorial theme)
   -----------------------------------------------------------------------------
   Unofficial Obsidian theme inspired by Claude/Anthropic visual language.
   แกะ DNA จาก https://github.com/law-of-cycles/claude-paper-obsidian
   - clay accent + layered paper surfaces + unified bilingual serif
   - folio-style offset plates, compact sequence markers, and a quiet outer rule
   - dual mode: warm light + purpose-built dark (ธีมแรกในคลังที่มี light/dark)
   - SF Mono → ui-monospace fallback (ไม่ฝังไฟล์ฟอนต์)
   ============================================================================= */
export const manifest = {
  id: 'claude',
  name: 'CLAUDE PAPER',
  dot: '#d97757',

  /* UI copy — editorial / note-taking tone */
  ui: {
    heroMeta: '~/notes',
    genIdle: '> reading…',
    genReady: '> saved · warm',
    genHint: '// paper over pixels.',
    outputTitle: 'CLAUDE PAPER · VAULT',
    outputTag: 'DONE',
    uploadText: 'drop a note here',
    logIntro: '$ obsidian --vault notes',
    ach: ['🏆 Keep it warm', '🏆 Serif is the new sans', '🏆 780px and proud', '🏆 No telemetry, ever'],
    heroTitle: 'Claude <span class="ext">Paper</span>',
    heroDesc: 'warm editorial สำหรับ <span style="font-family:monospace">.md</span><br>clay accent · bilingual serif · light/dark ที่ใจเย็นเท่ากัน',
  },

  /* Design tokens — single source of truth, dual mode */
  tokens: {
    mode: ['light', 'dark'],
    light: {
      bg:          '#faf9f5',  // editor paper
      sidebar:     '#f5f4ed',
      surface:     '#ffffff',  // raised
      code:        '#f1efe8',
      border:      'rgba(20,20,19,0.12)',
      ink:         '#141413',
      inkMuted:    '#3d3d3a',
      inkDim:      'rgba(20,20,19,0.45)',
      accent:      '#d97757',  // clay
      accentSoft:  'rgba(217,119,87,0.12)',
      success:     '#3d7a4e',
      warn:        '#a06a00',
      danger:      '#b03a2e',
      info:        '#3a5f8a',
    },
    dark: {
      bg:          '#30302e',  // editor
      sidebar:     '#262624',
      surface:     '#383835',  // raised
      code:        '#242422',
      border:      'rgba(250,249,245,0.14)',
      ink:         '#faf9f5',
      inkMuted:    '#c2c0b6',
      inkDim:      'rgba(250,249,245,0.45)',
      accent:      '#e38b6b',  // clay (dark)
      accentSoft:  'rgba(227,139,107,0.16)',
      success:     '#7fb98e',
      warn:        '#d9a441',
      danger:      '#e0806f',
      info:        '#8fb0d8',
    },

    fontSerif:   "'Source Serif 4', 'Source Han Serif SC', 'Georgia', serif",
    fontSans:    "'Source Serif 4', -apple-system, 'Segoe UI', sans-serif",
    fontMono:    "ui-monospace, 'SF Mono', 'Cascadia Mono', Consolas, monospace",
  },

  /* Canvas manifest — สำหรับ collage output (paper folio, serif header) */
  canvas: {
    bg: { gradient: ['#f4efe5', '#e9e1d4', '#f8f3eb'], vertical: true },
    cell: {
      backplate: { dx: 10, dy: 12, rounded: 12, fill: '#d5c7b4' },
      border: '#c76b4a', width: 2, rounded: 12,
      bg: '#fffdf8',
      label: '{n}', labelColor: '#fffaf4', labelBg: '#a65336',
      labelSize: 16, labelHeight: 22, labelPad: 10,
      labelPosition: 'top-left', labelInset: 2, labelRounded: 4,
    },
    header: {
      kicker: 'FIELD NOTES / 01', kickerFont: 'sans', kickerColor: '#a65336', kickerSize: 22,
      text: 'CLAUDE PAPER · NOTES',
      color: '#2a241e', font: 'serif', size: 40, pad: 48, glow: false,
      align: 'left', margin: 120, ink: '#2a241e',
      stripe: '#c76b4a', stripeHeight: 10, stripePos: 'top',
    },
    overlay: 'none',
    photoFx: 'saturate(0.94) brightness(1.01)',
    chrome: {
      frame: { inset: 26, color: '#c76b4a', width: 2, opacity: 0.28, rounded: 0 },
    },
  },

  hooks: {
    preDraw: null,
    postDraw: null,
  },
};
