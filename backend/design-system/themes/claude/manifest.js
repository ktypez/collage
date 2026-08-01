/* =============================================================================
   themes/claude/manifest.js — CLAUDE PAPER (warm editorial theme)
   -----------------------------------------------------------------------------
   Unofficial Obsidian theme inspired by Claude/Anthropic visual language.
   แกะ DNA จาก https://github.com/law-of-cycles/claude-paper-obsidian
   - clay accent + paper surfaces + unified bilingual serif
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

  /* Canvas manifest — สำหรับ collage output (paper grid, serif header) */
  canvas: {
    bg: { gradient: ['#faf9f5', '#f5f4ed', '#faf9f5'], vertical: true },
    cell: {
      border: 'rgba(20,20,19,0.14)', width: 1, rounded: 8,
      label: 'note {n}', labelColor: 'rgba(20,20,19,0.5)', labelBg: 'rgba(250,249,245,0.9)',
      bg: '#ffffff',
    },
    header: {
      text: 'CLAUDE PAPER · NOTES',
      color: '#141413', font: 'serif', size: 36, pad: 48, glow: false,
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
