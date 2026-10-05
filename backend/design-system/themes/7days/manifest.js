/* 7 DAYS — soft rounded masonry in the colour of the chosen weekday.
 *
 * The palette comes from `preset` (one day, one palette), never from the photo
 * order: `presetHeader` fills the header with that day's tone and `dayStrip`
 * lifts the active day while the other six stay muted. Photos are only laid
 * out — the renderer decides the grid, this file only sets the treatment.
 */
export const manifest = {
  id: '7days',
  name: '7 DAYS',
  dot: '#e0b9a4',

  ui: {
    heroMeta: '7 DAYS // SOFT WEEK',
    genIdle: '> CHOOSE A DAY',
    genReady: '> WEEK READY',
    genHint: '// the chosen day colours the header and week strip',
    outputTitle: '7 DAYS · READY',
    outputTag: 'WEEK',
    uploadText: 'เลือกรูปสำหรับสัปดาห์นี้',
    logIntro: '$ 7days.soft --week',
  },

  canvas: {
    bg: '#faf7f3',
    cell: {
      border: '#e9e1d7', width: 2, rounded: 32, bg: '#ffffff', shadow: 0.06,
    },
    header: {
      text: '', color: '#ffffff', font: 'display', size: 40, pad: 76, glow: false,
      align: 'center', presetHeader: true, presetHeaderStop: 2,
    },
    // Week strip at the very top: active day full height + labelled, rest muted
    dayStrip: {
      background: '#f0e8dd', height: 26, activeHeight: 52, gap: 4,
      inactiveOpacity: 0.34, label: true, labelSize: 18,
    },
    overlay: 'none',
    photoFx: 'none',
    chrome: {
      frame: { inset: 20, width: 2, color: '#e9e1d7', opacity: 0.75, rounded: 44 },
    },
  },

  hooks: { preDraw: null, postDraw: null },
};