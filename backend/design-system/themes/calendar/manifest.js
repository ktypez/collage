/* CALENDAR: a week strip and day-colored header with a precise paper grid. */
export const manifest = {
  id: 'calendar',
  name: 'CALENDAR WEEK',
  dot: '#1d4ed8',

  ui: {
    heroMeta: 'CALENDAR WEEK // DAY PRESET',
    genIdle: '> CHOOSE A DAY',
    genReady: '> WEEK READY',
    genHint: '// active day colors the header and week strip',
    outputTitle: 'CALENDAR WEEK · READY',
    outputTag: 'WEEK',
    uploadText: 'เลือกรูปสำหรับสัปดาห์นี้',
    logIntro: '$ calendar.week --today',
  },

  canvas: {
    bg: '#f1eee5',
    cell: {
      border: '#171717', width: 3, rounded: 0, bg: '#fffefa',
      label: '{n}', labelColor: '#fffefa', labelBg: '#171717',
      labelSize: 24, labelHeight: 38, labelPosition: 'top-center', labelInset: 12,
      labelRounded: 0,
    },
    header: {
      text: '', color: '#171717', font: 'mono', size: 40, pad: 72, glow: false,
      align: 'center', presetHeader: true, presetHeaderStop: 1,
    },
    dayStrip: {
      background: '#171717', height: 30, activeHeight: 58, gap: 4,
      inactiveOpacity: 0.68, label: true, labelSize: 18,
    },
    overlay: 'none',
    photoFx: 'none',
  },

  hooks: { preDraw: null, postDraw: null },
};
