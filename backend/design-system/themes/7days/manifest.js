/* 7 DAYS SOFT: Soft & Cute pastel gradient style with Thai day colors */
export const manifest = {
  id: '7days',
  name: '7 DAYS SOFT',
  dot: '#FFCBA4',

  ui: {
    heroMeta: '7 DAYS SOFT // PASTEL WEEK',
    genIdle: '> CHOOSE A DAY',
    genReady: '> READY',
    genHint: '// soft pastel colors for each day',
    outputTitle: '7 DAYS SOFT · READY',
    outputTag: 'SOFT',
    uploadText: 'เลือกรูปสำหรับ 7 วัน',
    logIntro: '$ 7days.soft --pastel',
  },

  canvas: {
    bg: '#fefefe',
    cell: {
      border: '#E0E0E0',
      width: 2,
      rounded: 28,
      bg: '#ffffff',
      shadow: 0.08,
      photoRadius: 20,
    },
    header: {
      text: '',
      color: '#2d2d2d',
      font: 'thai',
      size: 112,
      dateSize: 48,
      pad: 460,
      glow: false,
      align: 'center',
    },
    grid: {
      columns: 2,
      gap: 56,
    },
    dayBadge: {
      size: 28,
      position: 'top-center',
      inset: 16,
    },
    overlay: 'none',
    photoFx: 'none',
  },

  // Day color palette (soft pastels)
  dayColors: {
    mon: { primary: '#FFCBA4', name: 'จันทร์' },
    tue: { primary: '#98D8C8', name: 'อังคาร' },
    wed: { primary: '#C3B1E1', name: 'พุธ' },
    thu: { primary: '#F08080', name: 'พฤหัสบดี' },
    fri: { primary: '#87CEEB', name: 'ศุกร์' },
    sat: { primary: '#DDA0DD', name: 'เสาร์' },
    sun: { primary: '#FFD700', name: 'อาทิตย์' },
  },

  hooks: { preDraw: null, postDraw: null },
};
