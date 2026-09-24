/* POST: playful postcard print with stamp-like sequence markers. */
export const manifest = {
  id: 'post',
  name: 'POST CARD',
  dot: '#e85d3f',

  ui: {
    heroMeta: 'POST CARD // LIGHT',
    genIdle: '> ADD MEMORIES',
    genReady: '> READY TO POST',
    genHint: '// bright paper, stamped order',
    outputTitle: 'POST CARD · READY',
    outputTag: 'SENT',
    uploadText: 'เลือกภาพสำหรับโปสต์การ์ด',
    logIntro: '$ postcard.stamp --ready',
  },

  canvas: {
    bg: '#f2d35e',
    cell: {
      border: '#742437', width: 5, rounded: 2, bg: '#fff7df',
      backplate: { fill: '#e85d3f', dx: 10, dy: 10, rounded: 2 },
      label: 'P{n}', labelColor: '#25131f', labelBg: '#e85d3f',
      labelSize: 27, labelHeight: 48, labelShape: 'circle',
      labelPosition: 'top-right', labelInset: 14,
    },
    header: {
      text: '', color: '#e85d3f', font: 'mono', size: 40, pad: 72, glow: false,
      align: 'center', ink: '#742437',
      stripe: '#742437', stripeHeight: 14, stripePos: 'top',
    },
    overlay: 'none',
    photoFx: 'none',
    presetAccent: false,
  },

  hooks: { preDraw: null, postDraw: null },
};
