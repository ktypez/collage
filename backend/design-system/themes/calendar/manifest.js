/* CALENDAR PRO: Professional week view with Thai day names */
export const manifest = {
  id: 'calendar',
  name: 'CALENDAR PRO',
  dot: '#008080',

  ui: {
    heroMeta: 'CALENDAR PRO // WEEK VIEW',
    genIdle: '> CHOOSE A DAY',
    genReady: '> WEEK READY',
    genHint: '// professional calendar grid with Thai day names',
    outputTitle: 'CALENDAR PRO · READY',
    outputTag: 'WEEK',
    uploadText: 'เลือกรูปสำหรับสัปดาห์นี้',
    logIntro: '$ calendar.pro --week',
  },

  canvas: {
    bg: '#f8f9fa',
    cell: {
      border: '#E0E0E0',
      width: 1,
      rounded: 0,
      bg: '#ffffff',
      dayHeaderHeight: 80,
      photoAspect: '1:1',
      photosPerDay: 2,
    },
    header: {
      text: '',
      color: '#1a1a1a',
      font: 'thai',
      size: 64,
      weight: 600,
      pad: 480,
      glow: false,
      align: 'center',
    },
    grid: {
      columns: 7,
      columnWidth: 308,
      gap: 2,
    },
    overlay: 'none',
    photoFx: 'none',
  },

  // Professional day colors
  dayColors: {
    mon: { primary: '#008080', name: 'จันทร์' },
    tue: { primary: '#000080', name: 'อังคาร' },
    wed: { primary: '#228B22', name: 'พุธ' },
    thu: { primary: '#FFA500', name: 'พฤหัสบดี' },
    fri: { primary: '#0000FF', name: 'ศุกร์' },
    sat: { primary: '#800080', name: 'เสาร์' },
    sun: { primary: '#DC143C', name: 'อาทิตย์' },
  },

  hooks: { preDraw: null, postDraw: null },
};
