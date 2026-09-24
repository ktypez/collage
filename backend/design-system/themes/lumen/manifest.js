/* LUMEN: cool gallery print with a warm registration plate. */
export const manifest = {
  id: 'lumen',
  name: 'LUMEN GALLERY',
  dot: '#ff7657',

  ui: {
    heroMeta: 'LUMEN GALLERY // LIGHT',
    genIdle: '> PREPARE PLATE',
    genReady: '> GALLERY READY',
    genHint: '// cool paper, one warm registration',
    outputTitle: 'LUMEN GALLERY · READY',
    outputTag: 'PLATE',
    uploadText: 'วางรูปลงบนแผ่นพิมพ์',
    logIntro: '$ lumen.plate --register',
  },

  canvas: {
    bg: '#f1eff7',
    cell: {
      border: '#2a1b38', width: 3, rounded: 0, bg: '#fffefa',
      backplate: { fill: '#ff7657', dx: 10, dy: 10, rounded: 0 },
      label: 'NO.{n}', labelColor: '#fffefa', labelBg: '#2a1b38',
      labelSize: 24, labelHeight: 42, labelPosition: 'top-left', labelInset: 14,
      labelRounded: 0,
      cropMarks: { color: '#ff7657', size: 28, width: 4, inset: 12 },
    },
    header: {
      text: '', color: '#ff7657', font: 'mono', size: 40, pad: 96, glow: false,
      align: 'left', margin: 108, ink: '#2a1b38',
      stripe: '#ff7657', stripeHeight: 18, stripePos: 'top',
    },
    overlay: 'none',
    photoFx: 'none',
  },

  hooks: { preDraw: null, postDraw: null },
};
