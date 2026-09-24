/* VELVET: dark album-sleeve treatment with a soft rose accent. */
export const manifest = {
  id: 'velvet',
  name: 'VELVET SLEEVE',
  dot: '#f2a6a2',

  ui: {
    heroMeta: 'VELVET SLEEVE // DARK',
    genIdle: '> PRESS THE SLEEVE',
    genReady: '> SIDE A READY',
    genHint: '// deep plum, soft rose, serif title',
    outputTitle: 'VELVET SLEEVE · READY',
    outputTag: 'SIDE A',
    uploadText: 'เลือกภาพสำหรับปกอัลบั้ม',
    logIntro: '$ velvet.sleeve --press',
  },

  canvas: {
    bg: { gradient: ['#25131f', '#160b14'], vertical: true },
    cell: {
      border: '#6f405b', width: 2, rounded: 36, bg: '#321a2a',
      label: 'S{n}', labelColor: '#25131f', labelBg: '#f2a6a2',
      labelSize: 24, labelHeight: 40, labelPosition: 'bottom-center', labelInset: 12,
      labelRounded: 20,
    },
    header: {
      text: '', color: '#f2a6a2', font: 'serif', size: 40, pad: 76, glow: false,
      align: 'center', ink: '#f6d7d2',
      stripe: '#f2a6a2', stripeHeight: 12, stripePos: 'top',
    },
    overlay: 'none',
    photoFx: 'none',
    chrome: {
      frame: { inset: 24, width: 2, color: '#f2a6a2', opacity: 0.5, rounded: 52 },
    },
  },

  hooks: { preDraw: null, postDraw: null },
};
