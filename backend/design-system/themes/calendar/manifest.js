/* CALENDAR — a paper grid for the week, drawn in the chosen day's colour.
 *
 * Restored to the manifest-driven design (the original intent) with the hard
 * blacks softened to warm greys so it sits alongside 7 DAYS. As before,
 * `presetHeader` colours the header and `dayStrip` lifts the active day; the
 * grid itself carries no per-day colour and no photo gets a day name.
 */
export const manifest = {
  id: 'calendar',
  name: 'CALENDAR WEEK',
  dot: '#9aa7b8',

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
    bg: '#f7f4ee',
    cell: {
      border: '#d6cfc2', width: 2, rounded: 10, bg: '#fffdf9',
      label: '{n}', labelColor: '#fffdf9', labelBg: '#b9b0a1',
      labelSize: 24, labelHeight: 38, labelPosition: 'top-center', labelInset: 12,
      labelRounded: 10,
    },
    header: {
      text: '', color: '#ffffff', font: 'mono', size: 40, pad: 72, glow: false,
      align: 'center', presetHeader: true, presetHeaderStop: 1,
    },
    dayStrip: {
      background: '#e6ded1', height: 30, activeHeight: 58, gap: 4,
      inactiveOpacity: 0.34, label: true, labelSize: 18,
    },
    overlay: 'none',
    photoFx: 'none',
  },

  hooks: { preDraw: null, postDraw: null },
};