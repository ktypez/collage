/* =============================================================================
   engine/layout.js — theme-agnostic layout computation
   -----------------------------------------------------------------------------
   Pure math: grid layouts, cover-fit rects. No DOM, no canvas, no theme.
   ============================================================================= */

/** Named layouts (normalized cells in 0..1 space) */
export const LAYOUTS = {
  '1x1': [{ x: 0, y: 0, w: 1, h: 1 }],
  '1x2': [{ x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 1 }],
  '2x1': [{ x: 0, y: 0, w: 1, h: 0.5 }, { x: 0, y: 0.5, w: 1, h: 0.5 }],
  '2x2': [
    { x: 0, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 },
    { x: 0, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
  ],
  '1+2': [
    { x: 0, y: 0, w: 0.5, h: 1 },
    { x: 0.5, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
  ],
  '3x1': [{ x: 0, y: 0, w: 1, h: 1 / 3 }, { x: 0, y: 1 / 3, w: 1, h: 1 / 3 }, { x: 0, y: 2 / 3, w: 1, h: 1 / 3 }],
  '1x3': [{ x: 0, y: 0, w: 1 / 3, h: 1 }, { x: 1 / 3, y: 0, w: 1 / 3, h: 1 }, { x: 2 / 3, y: 0, w: 1 / 3, h: 1 }],
  '3x2': [
    { x: 0, y: 0, w: 1 / 3, h: 0.5 }, { x: 1 / 3, y: 0, w: 1 / 3, h: 0.5 }, { x: 2 / 3, y: 0, w: 1 / 3, h: 0.5 },
    { x: 0, y: 0.5, w: 1 / 3, h: 0.5 }, { x: 1 / 3, y: 0.5, w: 1 / 3, h: 0.5 }, { x: 2 / 3, y: 0.5, w: 1 / 3, h: 0.5 },
  ],
  '3x3': Array.from({ length: 9 }, (_, i) => ({
    x: (i % 3) / 3, y: Math.floor(i / 3) / 3, w: 1 / 3, h: 1 / 3,
  })),
};

/** Smart auto-layout for N photos — always fills 100% of canvas */
export function autoLayout(count) {
  if (count === 1) return LAYOUTS['1x1'];
  if (count === 2) return LAYOUTS['1x2'];
  if (count === 3) return LAYOUTS['1+2'];
  if (count === 4) return LAYOUTS['2x2'];
  if (count <= 6) return LAYOUTS['3x2'];
  if (count <= 9) return LAYOUTS['3x3'];
  // 10+: pick cols ∈ [2..5] for a nice square-ish grid
  const MAX_COLS = 5;
  let best = { score: Infinity };
  for (let cols = 2; cols <= MAX_COLS; cols++) {
    const rows = Math.ceil(count / cols);
    const empty = cols * rows - count;
    const aspectDev = Math.abs(cols - rows) / Math.max(cols, rows);
    const score = empty * 5 + aspectDev;
    if (score < best.score) best = { score, cols, rows };
  }
  const { cols, rows } = best;
  const cells = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const isLastInRow = (i + 1 === count) || (Math.floor((i + 1) / cols) !== row);
    let w = 1 / cols;
    if (isLastInRow && col < cols - 1) w = 1 - col / cols; // stretch to fill partial row
    cells.push({ x: col / cols, y: row / rows, w, h: 1 / rows });
  }
  return cells;
}

/** Resolve chosen layout name ('auto' → smart) into concrete cells */
export function pickLayout(count, chosen = 'auto') {
  if (chosen === 'auto') return autoLayout(count);
  if (LAYOUTS[chosen]) {
    const base = LAYOUTS[chosen];
    if (base.length >= count) return base.slice(0, count);
    return [...base, ...autoLayout(count - base.length)];
  }
  return autoLayout(count);
}

/**
 * Cover-fit source rect from an image into a target cell.
 * Returns { sx, sy, sw, sh } to pass to ctx.drawImage(img, sx, sy, sw, sh, ...)
 */
export function coverRect(img, cellW, cellH) {
  const imgA = img.width / img.height;
  const cellA = cellW / cellH;
  if (imgA > cellA) {
    // image wider than cell — crop sides
    const sw = img.height * cellA;
    return { sx: (img.width - sw) / 2, sy: 0, sw, sh: img.height };
  }
  const sh = img.width / cellA;
  return { sx: 0, sy: (img.height - sh) / 2, sw: img.width, sh };
}

/** 7 day-of-week accent gradients (used by min theme presetAccent) */
export const DAY_PRESETS = {
  sun: ['#DC2626', '#EF4444', '#F87171'],
  mon: ['#854D0E', '#CA8A04', '#FACC15'],
  tue: ['#BE185D', '#EC4899', '#F472B6'],
  wed: ['#047857', '#059669', '#34D399'],
  thu: ['#C2410C', '#EA580C', '#FB923C'],
  fri: ['#1D4ED8', '#3B82F6', '#60A5FA'],
  sat: ['#7C3AED', '#8B5CF6', '#A78BFA'],
};

export const DAY_NAMES = {
  sun: 'อาทิตย์', mon: 'จันทร์', tue: 'อังคาร', wed: 'พุธ',
  thu: 'พฤหัสบดี', fri: 'ศุกร์', sat: 'เสาร์',
};
