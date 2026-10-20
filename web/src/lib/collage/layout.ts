/* =============================================================================
   layout.ts — masonry grid math (ported from backend/collage.js)
   -----------------------------------------------------------------------------
   Pure math, no canvas. The server used to run this against sharp metadata;
   now it runs against HTMLImageElement dimensions in the browser, so the exact
   same numbers come out with no upload round-trip.
   ============================================================================= */

export const W = 2160;
export const HEADER_H = 440;
export const DH = 14;
export const PT = 80;
export const PS = 96;
export const PB = 96;
export const G = 48;
export const CP = 24;
export const CR = 36;
export const IR = 28;
export const SY = 14;
export const SB = 36;
export const SA = 0.10;

export interface Placement {
	colIdx: number;
	x: number;
	y: number;
	/** card height */
	ch: number;
	/** inner image width */
	iw: number;
	/** inner image height (derived from source aspect) */
	ih: number;
}

export function cols(n: number): number {
	if (n === 1) return 1;
	if (n <= 3) return n;
	return 3;
}

export interface LayoutResult {
	cardW: number;
	iw: number;
	placements: Placement[];
	contentH: number;
	totalH: number;
	contentY: number;
}

/**
 * Masonry layout (max 3 columns): each image drops into the currently
 * shortest column, so shorter photos naturally fill gaps left by taller ones.
 * Heights are clamped so a zero/unavailable dimension can never poison the
 * tracker into NaN (the old sharp path had a bug here).
 */
export function masonry(
	sizes: Array<{ w: number; h: number }>,
	opts: { headerH: number; hasBoth?: boolean } = { headerH: HEADER_H },
): LayoutResult {
	const count = sizes.length;
	const c = cols(count);
	const topPad = CP;
	const botPad = CP;

	const usable = W - PS * 2;
	const cardW = Math.floor((usable - G * (c - 1)) / c);
	const iw = cardW - CP * 2;

	const dims = sizes.map((s) => {
		const w = s.w > 0 ? s.w : iw;
		const h = s.h > 0 ? s.h : iw;
		const ih = Math.round((iw * h) / w) || iw;
		return { ih, ch: ih + topPad + botPad };
	});

	const colHeights = new Array(c).fill(0);
	const placements: Placement[] = [];

	for (let i = 0; i < count; i++) {
		const colIdx = colHeights.indexOf(Math.min(...colHeights));
		const x = PS + colIdx * (cardW + G);
		const y = colHeights[colIdx];
		placements.push({ colIdx, x, y, ch: dims[i].ch, iw, ih: dims[i].ih });
		colHeights[colIdx] += dims[i].ch + G;
	}

	const contentH = Math.max(...colHeights) - G;

	// themed: content starts exactly 44px below the date baseline (mirrors the
	// date y-position formula in the sharp renderer's renderBackdrop)
	const dateBaseY = Math.round(opts.headerH * ((opts.hasBoth ?? true) ? 0.78 : 0.55));
	const contentY = dateBaseY + 44;
	const totalH = contentY + contentH + PB;

	return { cardW, iw, placements, contentH, totalH, contentY };
}

const MONTHS = [
	'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
	'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export function fmtDate(s: string): string {
	let d = s && s.trim() ? new Date(s + 'T00:00:00') : new Date();
	if (Number.isNaN(d.getTime())) d = new Date();
	return `วันที่ ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

/** Parse a CSS color into canvas paint values. Handles #rgb/#rrggbb/rgb()/rgba(). */
export function parseColor(c: string): { r: number; g: number; b: number; a: number } {
	const s = c.trim();
	if (s.startsWith('#')) {
		let hex = s.slice(1);
		if (hex.length === 3) hex = hex.split('').map((ch) => ch + ch).join('');
		const n = parseInt(hex.slice(0, 6), 16);
		return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1 };
	}
	const m = s.match(/rgba?\(([^)]+)\)/);
	if (m) {
		const parts = m[1].split(',').map((p) => p.trim());
		return {
			r: parseFloat(parts[0]),
			g: parseFloat(parts[1]),
			b: parseFloat(parts[2]),
			a: parts[3] !== undefined ? parseFloat(parts[3]) : 1,
		};
	}
	return { r: 0, g: 0, b: 0, a: 1 };
}

/** linear-gradient(180deg,#a,#b) → { deg, stops }. Returns null for plain colors. */
export function parseCssGradient(css: string): { deg: number; stops: string[] } | null {
	if (!css.startsWith('linear-gradient')) return null;
	const m = css.match(/linear-gradient\(\s*([\d.]+)?deg\s*,(.+)\)/);
	if (!m) return null;
	return { deg: m[1] ? parseFloat(m[1]) : 180, stops: m[2].split(',').map((s) => s.trim()) };
}

export function toRgba(c: string, alphaOverride?: number): string {
	const { r, g, b, a } = parseColor(c);
	return `rgba(${r},${g},${b},${alphaOverride ?? a})`;
}

/** Build a canvas gradient across the given axis. */
export function makeGradient(
	ctx: CanvasRenderingContext2D,
	stops: string[],
	x0: number, y0: number, x1: number, y1: number,
): CanvasGradient {
	const g = ctx.createLinearGradient(x0, y0, x1, y1);
	const span = Math.max(1, stops.length - 1);
	stops.forEach((s, i) => g.addColorStop(i / span, toRgba(s)));
	return g;
}