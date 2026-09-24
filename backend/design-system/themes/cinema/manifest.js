/* CINEMA: restrained blackroom contact sheet with warm film cues. */
export const manifest = {
  id: 'cinema',
  name: 'CINEMA CONTACT',
  dot: '#c89b4b',

  ui: {
    heroMeta: 'CINEMA CONTACT // DARK',
    genIdle: '> LOAD CONTACT SHEET',
    genReady: '> FRAME READY',
    genHint: '// matte black, warm film edge',
    outputTitle: 'CINEMA CONTACT · READY',
    outputTag: 'FRAME',
    uploadText: 'เลือกภาพสำหรับคอนแทกต์ชีต',
    logIntro: '$ cinema.contact --print',
  },

  canvas: {
    bg: '#0b0907',
    cell: {
      border: '#d8c9a6', width: 1, rounded: 0, bg: '#16120e',
      label: 'F{n}', labelColor: '#0b0907', labelBg: '#d8c9a6',
      labelSize: 24, labelHeight: 38, labelPosition: 'bottom-right', labelInset: 12,
      labelRounded: 0,
    },
    header: {
      text: '', color: '#c89b4b', font: 'mono', size: 40, pad: 96, glow: false,
      align: 'right', margin: 108, ink: '#f3ead6',
      stripe: '#c89b4b', stripeHeight: 10, stripePos: 'top',
    },
    overlay: 'none',
    photoFx: 'none',
    presetAccent: false,
    chrome: {
      filmPerforations: {
        width: 28, height: 44, pad: 24, gap: 150, start: 76,
        color: '#d8c9a6', opacity: 0.5, rounded: 3,
      },
    },
  },

  hooks: { preDraw: null, postDraw: null },
};
