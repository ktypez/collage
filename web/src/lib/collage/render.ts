/* =============================================================================
   render.ts — canvas collage renderer (replaces sharp + harfbuzz + opentype.js)
   -----------------------------------------------------------------------------
   Mirrors backend/design-system/core/sharp-renderer.js one-to-one, in three
   passes over a single canvas:
     backdrop   = bg + preset header + stripe + header text + cell chips
     photos     = rounded images (+ photoFx)
     foreground = day strip + borders + crop marks + labels + chrome
   Why canvas instead of sharp: Thai shaping is native (ctx.fillText uses the
   browser's own GSUB/GPOS, so วรรณยุกต์ sit above the consonant — the old stack
   needed harfbuzzjs for exactly this), and there is no upload round-trip.
   ============================================================================= */

import {
	W, HEADER_H, PS, PB, G, CP,
	masonry, fmtDate, makeGradient, toRgba, parseCssGradient,
} from './layout';
import {
	THEMES, DAY_PRESETS, DAYS, DAY_SHORT,
	type DayPreset, type ThemeId, type ThemeManifest,
} from './themes';

type FontKind = 'display' | 'serif' | 'mono' | 'sans';

/* ---------- fonts ---------- */
/* 'display' is a role, not a family: it means the sans face at weight 600.
   Chakra Petch was retired so the collage, the UI and the rich menu all draw
   from the same font set. */
const FONT_DISPLAY = "'Noto Sans Thai', system-ui, sans-serif";
const FONT_SERIF = "'Source Serif 4', 'Noto Serif Thai', Georgia, 'Times New Roman', serif";
const FONT_MONO = "'JetBrains Mono', 'Noto Sans Thai', ui-monospace, Menlo, Consolas, monospace";
const FONT_SANS = "'Noto Sans Thai', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

function fontFor(kind: FontKind, size: number, weight?: number) {
	const family =
		kind === 'mono' ? FONT_MONO : kind === 'serif' ? FONT_SERIF : kind === 'display' ? FONT_DISPLAY : FONT_SANS;
	// Pixel's system text reads chunky because the UI face is drawn at medium
	// weight with a tight tracking. Noto Sans Thai is a variable font
	// (wght 100-900), so these are real weights, not a faux-bold stroke.
	const w = weight ?? (kind === 'display' ? 700 : kind === 'serif' ? 500 : kind === 'sans' ? 500 : 400);
	return `${w} ${size}px ${family}`;
}

/** `ctx.letterSpacing` is Chromium/Safari 18+; older engines ignore it. */
function setLetterSpacing(ctx: CanvasRenderingContext2D, value: string | undefined) {
	if (!value) return;
	try {
		(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = value;
	} catch {
		/* not supported — tracking stays at the default */
	}
}

/* Faces are loaded per group, so a theme only pays for the families it draws,
   and every face is cached: the second render of a session fetches nothing.
   `document.fonts.ready` alone is not enough — a face that has not been
   requested yet is never fetched, and the first render would silently fall
   back to the system font. */
type FaceGroup = 'sans' | 'serif' | 'mono';

const FACE_SPECS: Record<FaceGroup, string[]> = {
	sans: ['400 57px "Noto Sans Thai"', '500 132px "Noto Sans Thai"', '700 132px "Noto Sans Thai"'],
	serif: ['400 132px "Source Serif 4"', '400 57px "Noto Serif Thai"'],
	mono: ['400 57px "JetBrains Mono"', '400 26px "JetBrains Mono"'],
};

const loadedFaces = new Set<string>();
const facePromises = new Map<string, Promise<void>>();

function loadFace(spec: string): Promise<void> {
	if (loadedFaces.has(spec)) return Promise.resolve();
	let pending = facePromises.get(spec);
	if (!pending) {
		pending = document.fonts
			.load(spec)
			.then(() => {
				loadedFaces.add(spec);
			})
			.catch(() => {
				/* a face that fails to load just falls back */
			});
		facePromises.set(spec, pending);
	}
	return pending;
}

async function ensureFonts(groups: FaceGroup[]) {
	if (typeof document === 'undefined' || !document.fonts?.load) return;
	await Promise.all(groups.flatMap((g) => FACE_SPECS[g]).map(loadFace));
	await document.fonts.ready;
}

/** Which families a manifest actually draws with. */
function faceGroupsFor(manifest: ThemeManifest): FaceGroup[] {
	const groups: FaceGroup[] = ['sans'];
	const hd = manifest.canvas.header ?? {};
	if (hd.font === 'serif') groups.push('serif');
	if (hd.font === 'mono') groups.push('mono');
	if (manifest.canvas.cell?.label || manifest.canvas.dayStrip) groups.push('mono');
	return groups;
}

/* ---------- low-level canvas helpers ---------- */

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
	const rad = Math.max(0, Math.min(r, w / 2, h / 2));
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, rad);
}

function fillRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient) {
	roundRectPath(ctx, x, y, w, h, r);
	ctx.fillStyle = fill;
	ctx.fill();
}

function strokeRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, stroke: string, width: number) {
	roundRectPath(ctx, x, y, w, h, r);
	ctx.strokeStyle = stroke;
	ctx.lineWidth = width;
	ctx.stroke();
}

function drawText(
	ctx: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	opts: {
		size: number;
		font: FontKind;
		color: string;
		align?: CanvasTextAlign;
		weight?: number;
		glow?: string | null;
		/** tracking, e.g. '-1.3px' */
		tracking?: string;
	},
) {
	ctx.save();
	ctx.font = fontFor(opts.font, opts.size, opts.weight);
	ctx.textAlign = opts.align ?? 'left';
	ctx.textBaseline = 'alphabetic';
	setLetterSpacing(ctx, opts.tracking);
	if (opts.glow) {
		ctx.shadowColor = opts.glow;
		ctx.shadowBlur = 8;
	}
	ctx.fillStyle = opts.color;
	ctx.fillText(text, x, y);
	ctx.restore();
}

function measureText(ctx: CanvasRenderingContext2D, text: string, size: number, font: FontKind) {
	ctx.save();
	ctx.font = fontFor(font, size);
	const w = ctx.measureText(text).width;
	ctx.restore();
	return w;
}

/* ---------- colour helpers (ported from sharp-renderer.js) ---------- */

function hexToRgba(hex: string, alpha = 1): string {
	const h = hex.replace('#', '');
	const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
	const n = parseInt(full, 16);
	if (Number.isNaN(n)) return hex;
	return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** WCAG-ish pick between black/white ink for a given background. */
function contrastTextOn(hex: string): string {
	const value = String(hex).replace('#', '');
	const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
	const n = parseInt(full, 16);
	if (Number.isNaN(n)) return '#ffffff';
	const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
		const srgb = v / 255;
		return srgb <= 0.04045 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
	});
	const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
	const blackContrast = (luminance + 0.05) / 0.05;
	const whiteContrast = 1.05 / (luminance + 0.05);
	return blackContrast >= whiteContrast ? '#111111' : '#ffffff';
}

/** Detect a light background (channel sum, matching the sharp renderer). */
function isLightBg(c: ThemeManifest['canvas']): boolean {
	let first: string | null = null;
	if (typeof c.bg === 'string') first = c.bg;
	else if (c.bg && c.bg.gradient) first = c.bg.gradient[0];
	if (!first) return false;
	const n = parseInt(String(first).replace('#', ''), 16);
	if (Number.isNaN(n)) return false;
	return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255) > 450;
}

/** Fill the base background (flat colour or CSS-style gradient). */
function fillBackground(ctx: CanvasRenderingContext2D, bg: ThemeManifest['canvas']['bg'], w: number, h: number) {
	if (typeof bg === 'string') {
		ctx.fillStyle = bg;
	} else {
		const vertical = bg.vertical !== false;
		ctx.fillStyle = makeGradient(ctx, bg.gradient, 0, 0, vertical ? 0 : w, vertical ? h : 0);
	}
	ctx.fillRect(0, 0, w, h);
}

/* ---------- image loading ---------- */

/* Decoded photos are cached per File: regenerating with the same photos (the
   common case when only the name, date or style changed) must not decode
   20 megapixel JPEGs again. */
const decodedImages = new WeakMap<File, HTMLImageElement>();

export function loadImage(file: File | Blob): Promise<HTMLImageElement> {
	if (file instanceof File) {
		const hit = decodedImages.get(file);
		if (hit) return Promise.resolve(hit);
	}
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		const done = () => {
			URL.revokeObjectURL(url);
			if (file instanceof File) decodedImages.set(file, img);
			resolve(img);
		};
		img.onload = () => {
			// decode() hands the bitmap to the compositor off the main thread;
			// onload only means the bytes are parsed.
			if (typeof img.decode === 'function') {
				img.decode().then(done, done);
			} else {
				done();
			}
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Could not decode image'));
		};
		img.src = url;
	});
}

export async function loadImages(files: Array<File | Blob>): Promise<HTMLImageElement[]> {
	return Promise.all(files.map(loadImage));
}

/** Draw a photo into a card cell, clipped to a rounded rect. */
function drawPhoto(ctx: CanvasRenderingContext2D, img: CanvasImageSource, x: number, y: number, w: number, h: number, radius: number) {
	ctx.save();
	roundRectPath(ctx, x, y, w, h, radius);
	ctx.clip();
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(img, x, y, w, h);
	ctx.restore();
}

/* ---------- photoFx ---------- */

function parsePhotoFx(fx: string) {
	const sat = fx.match(/saturate\(([\d.]+)\)/);
	const bri = fx.match(/brightness\(([\d.]+)\)/);
	return { saturation: sat ? parseFloat(sat[1]) : 1, brightness: bri ? parseFloat(bri[1]) : 1 };
}

let filterSupport: boolean | null = null;
function supportsFilter(): boolean {
	if (filterSupport !== null) return filterSupport;
	const probe = document.createElement('canvas').getContext('2d');
	if (!probe) return (filterSupport = false);
	probe.filter = 'saturate(0.5)';
	filterSupport = probe.filter === 'saturate(0.5)';
	return filterSupport;
}

/** Fallback for engines without ctx.filter: transform pixels on a card-sized
 *  scratch canvas (cheap — one card, never the full 2160px sheet). */
function drawPhotoFx(
	ctx: CanvasRenderingContext2D,
	img: CanvasImageSource,
	x: number, y: number, w: number, h: number, radius: number,
	saturation: number, brightness: number,
) {
	const cw = Math.max(1, Math.round(w));
	const chh = Math.max(1, Math.round(h));
	const tmp = document.createElement('canvas');
	tmp.width = cw;
	tmp.height = chh;
	const tctx = tmp.getContext('2d')!;
	tctx.drawImage(img, 0, 0, cw, chh);
	const data = tctx.getImageData(0, 0, cw, chh);
	const px = data.data;
	for (let i = 0; i < px.length; i += 4) {
		const lum = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
		let r = lum + (px[i] - lum) * saturation;
		let g = lum + (px[i + 1] - lum) * saturation;
		let b = lum + (px[i + 2] - lum) * saturation;
		r *= brightness; g *= brightness; b *= brightness;
		px[i] = r < 0 ? 0 : r > 255 ? 255 : r;
		px[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
		px[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
	}
	tctx.putImageData(data, 0, 0);
	drawPhoto(ctx, tmp, x, y, w, h, radius);
}

/* ---------- public API ---------- */

/** Hand the frame back to the browser so the UI can paint mid-render. */
function nextFrame(): Promise<void> {
	return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export interface RenderOpts {
	name: string;
	date: string;
	preset: DayPreset;
	theme: ThemeId;
}

export async function renderCollage(images: HTMLImageElement[], opts: RenderOpts): Promise<HTMLCanvasElement> {
	const manifest = THEMES[opts.theme] ?? THEMES['7days'];
	await ensureFonts(faceGroupsFor(manifest));
	return renderThemed(images, opts, manifest);
}

export function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.95): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(b) => (b ? resolve(b) : reject(new Error('Canvas encoding failed'))),
			'image/jpeg',
			quality,
		);
	});
}

/** Width of the chat-bubble copy handed to LINE. Half the sheet: still crisp
 *  at bubble size on a 3x screen, a quarter of the pixels to fetch. */
export const PREVIEW_WIDTH = 1080;

/** The preview LINE shows in the chat. The full sheet is what opens on tap.
 *  `createImageBitmap` with a resize is much cheaper than redrawing the
 *  2160px sheet into a second canvas — it scales in the decoder. */
export async function makePreview(canvas: HTMLCanvasElement, width = PREVIEW_WIDTH): Promise<HTMLCanvasElement> {
	const scale = Math.min(1, width / canvas.width);
	const out = document.createElement('canvas');
	out.width = Math.max(1, Math.round(canvas.width * scale));
	out.height = Math.max(1, Math.round(canvas.height * scale));
	const ctx = out.getContext('2d');
	if (!ctx) throw new Error('Could not create preview canvas');
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';

	if (typeof createImageBitmap === 'function') {
		try {
			const bitmap = await createImageBitmap(canvas, {
				resizeWidth: out.width,
				resizeHeight: out.height,
				resizeQuality: 'high',
			});
			ctx.drawImage(bitmap, 0, 0);
			bitmap.close?.();
			return out;
		} catch {
			/* resize options unsupported — fall through to the plain draw */
		}
	}

	ctx.drawImage(canvas, 0, 0, out.width, out.height);
	return out;
}

/* =============================================================================
   Manifest renderer — one pass for every theme
   ============================================================================= */
async function renderThemed(
	images: HTMLImageElement[],
	opts: RenderOpts,
	manifest: ThemeManifest,
): Promise<HTMLCanvasElement> {
	const date = fmtDate(opts.date);
	const c = manifest.canvas;
	const cell = c.cell ?? {};
	const topPad = CP;

	const sizes = images.map((im) => ({ w: im.naturalWidth || im.width, h: im.naturalHeight || im.height }));
	const hasBoth = !!opts.name;
	const L = masonry(sizes, { headerH: HEADER_H, hasBoth });

	const H = L.totalH;
	const canvas = document.createElement('canvas');
	canvas.width = W;
	canvas.height = H;
	const ctx = canvas.getContext('2d')!;

	const cards = L.placements.map((p) => ({ x: p.x, y: L.contentY + p.y, w: L.cardW, h: p.ch }));
	const preset = c.dayStrip ? opts.preset : null;

	/* ---------------- 1. backdrop ---------------- */
	fillBackground(ctx, c.bg, W, H);

	const hd = c.header ?? {};
	const presetStops = preset ? DAY_PRESETS[preset] : null;
	const presetHeaderColor =
		hd.presetHeader && presetStops ? presetStops[hd.presetHeaderStop ?? 1] : null;
	if (presetHeaderColor) {
		ctx.fillStyle = presetHeaderColor;
		ctx.fillRect(0, 0, W, HEADER_H);
	}

	// header stripe
	if (hd.stripe) {
		const sh = hd.stripeHeight || Math.round(HEADER_H * 0.06);
		ctx.fillStyle = hd.stripe;
		ctx.fillRect(0, hd.stripePos === 'top' ? 0 : HEADER_H, W, sh);
	}

	// header text
	const useSerif = hd.font === 'serif';
	const nameFont: FontKind = useSerif
		? 'serif'
		: hd.font === 'mono'
			? 'mono'
			: hd.font === 'sans'
				? 'sans'
				: 'display';
	const textColor = presetHeaderColor
		? contrastTextOn(presetHeaderColor)
		: isLightBg(c)
			? '#16161a'
			: '#ffffff';
	const ink = hd.ink || textColor;
	const align: CanvasTextAlign = hd.align === 'left' || hd.align === 'right' ? hd.align : 'center';
	const margin = Math.max(72, hd.margin || 96);
	const textX = align === 'left' ? margin : align === 'right' ? W - margin : W / 2;

	if (hd.kicker) {
		const kickerFont: FontKind =
			hd.kickerFont === 'serif'
				? 'serif'
				: hd.kickerFont === 'display'
					? 'display'
					: hd.kickerFont === 'mono'
						? 'mono'
						: 'sans';
		const kickerSize = hd.kickerSize || 18;
		const kickerY = hd.kickerY || Math.round(HEADER_H * 0.18);
		const kickerColor = hd.kickerColor || hd.color || '#ffffff';
		const kickerFill = String(kickerColor).startsWith('#') ? hexToRgba(kickerColor, 0.78) : kickerColor;
		drawText(ctx, String(hd.kicker), textX, kickerY, { size: kickerSize, font: kickerFont, color: kickerFill, align });
	}

	const glow = hd.glow && hd.color ? hexToRgba(hd.color, 0.9) : null;
	if (opts.name) {
		const nameSize = Math.round(HEADER_H * (hasBoth ? 0.3 : 0.34));
		drawText(ctx, opts.name, textX, Math.round(HEADER_H * (hasBoth ? 0.47 : 0.55)), {
			size: nameSize,
			font: nameFont,
			color: hexToRgba(ink, 0.9),
			align,
			glow,
			// tight tracking is what makes the display face read like a system
			// UI font instead of a wide book face
			tracking: `${(-nameSize * 0.012).toFixed(2)}px`,
		});
	}
	{
		const dateSize = Math.round(HEADER_H * 0.13);
		drawText(ctx, date, textX, Math.round(HEADER_H * (hasBoth ? 0.78 : 0.55)), {
			size: dateSize,
			font: nameFont,
			color: hexToRgba(ink, 0.8),
			align,
			tracking: `${(-dateSize * 0.008).toFixed(2)}px`,
		});
	}

	// cell backplate (offset colour plate behind each card)
	if (cell.backplate) {
		const plate = cell.backplate;
		const radius = plate.rounded ?? cell.rounded ?? 0;
		for (const card of cards) {
			fillRoundRect(ctx, card.x + (plate.dx || 0), card.y + (plate.dy || 0), card.w, card.h, radius, plate.fill);
		}
	}

	// cell chip background
	if (cell.bg) {
		const grad = parseCssGradient(cell.bg);
		for (const card of cards) {
			const fill = grad
				? makeGradient(
						ctx,
						grad.stops,
						card.x,
						card.y,
						grad.deg >= 135 && grad.deg <= 225 ? card.x : card.x + card.w,
						grad.deg >= 135 && grad.deg <= 225 ? card.y + card.h : card.y,
					)
				: cell.bg;
			if (cell.shadow) {
				ctx.save();
				ctx.shadowColor = `rgba(0,0,0,${cell.shadow})`;
				ctx.shadowBlur = 16;
				ctx.shadowOffsetY = 8;
				fillRoundRect(ctx, card.x, card.y, card.w, card.h, cell.rounded || 0, fill);
				ctx.restore();
			} else {
				fillRoundRect(ctx, card.x, card.y, card.w, card.h, cell.rounded || 0, fill);
			}
		}
	}

	/* ---------------- 2. photos ---------------- */
	// A 2160px sheet takes seconds of main-thread time; handing the frame back
	// between phases lets the loading state paint instead of freezing.
	await nextFrame();

	const fx = c.photoFx && c.photoFx !== 'none' ? c.photoFx : null;
	const photoRadius = cell.rounded ? Math.min(14, cell.rounded) : 0;
	if (fx && supportsFilter()) {
		ctx.filter = fx;
		for (let i = 0; i < cards.length; i++) {
			const p = L.placements[i];
			const card = cards[i];
			drawPhoto(ctx, images[i], card.x + CP, card.y + topPad, p.iw, p.ih, photoRadius);
		}
		ctx.filter = 'none';
	} else if (fx) {
		const { saturation, brightness } = parsePhotoFx(fx);
		for (let i = 0; i < cards.length; i++) {
			const p = L.placements[i];
			const card = cards[i];
			drawPhotoFx(ctx, images[i], card.x + CP, card.y + topPad, p.iw, p.ih, photoRadius, saturation, brightness);
		}
	} else {
		for (let i = 0; i < cards.length; i++) {
			const p = L.placements[i];
			const card = cards[i];
			drawPhoto(ctx, images[i], card.x + CP, card.y + topPad, p.iw, p.ih, photoRadius);
		}
	}

	/* ---------------- 3. foreground ---------------- */
	await nextFrame();

	// day strip (7 DAYS only)
	if (c.dayStrip && preset && DAY_PRESETS[preset]) {
		const strip = c.dayStrip;
		const height = strip.height || 30;
		const activeHeight = strip.activeHeight || Math.round(height * 1.7);
		const gap = strip.gap ?? 4;
		const segmentW = W / DAYS.length;
		ctx.fillStyle = strip.background || '#111111';
		ctx.fillRect(0, 0, W, activeHeight);
		DAYS.forEach((key, i) => {
			const colors = DAY_PRESETS[key];
			const active = key === preset;
			const blockH = active ? activeHeight : height;
			const blockW = segmentW - gap;
			const x = i * segmentW + gap / 2;
			ctx.fillStyle = toRgba(colors[1], active ? 1 : (strip.inactiveOpacity ?? 0.62));
			ctx.fillRect(x, 0, blockW, blockH);
			if (active && strip.label !== false) {
				const size = strip.labelSize || 18;
				drawText(ctx, DAY_SHORT[key], x + blockW / 2, Math.round(activeHeight / 2 + size * 0.35), {
					size, font: 'mono', color: contrastTextOn(colors[1]), align: 'center',
				});
			}
		});
	}

	// cell borders
	if (cell.border && cell.width) {
		for (const card of cards) {
			strokeRoundRect(ctx, card.x, card.y, card.w, card.h, cell.rounded || 0, cell.border, cell.width);
		}
	}

	// registration / crop marks
	if (cell.cropMarks) {
		const marks = typeof cell.cropMarks === 'object' ? cell.cropMarks : {};
		const color = marks.color || cell.border || '#111111';
		const size = marks.size || 30;
		const width = marks.width || 3;
		const inset = marks.inset ?? 10;
		for (const card of cards) {
			const left = card.x + inset;
			const right = card.x + card.w - inset;
			const top = card.y + inset;
			const bottom = card.y + card.h - inset;
			ctx.strokeStyle = color;
			ctx.lineWidth = width;
			ctx.lineCap = 'square';
			ctx.beginPath();
			ctx.moveTo(left, top + size); ctx.lineTo(left, top); ctx.lineTo(left + size, top);
			ctx.moveTo(right - size, top); ctx.lineTo(right, top); ctx.lineTo(right, top + size);
			ctx.moveTo(left, bottom - size); ctx.lineTo(left, bottom); ctx.lineTo(left + size, bottom);
			ctx.moveTo(right - size, bottom); ctx.lineTo(right, bottom); ctx.lineTo(right, bottom - size);
			ctx.stroke();
		}
	}

	// labels
	if (cell.label) {
		const ls = cell.labelSize || 26;
		const pad = cell.labelPad || 12;
		const baseH = cell.labelHeight || 34;
		const inset = cell.labelInset ?? 12;
		const position = cell.labelPosition || 'bottom-right';
		cards.forEach((card, i) => {
			const text =
				cell.label === true
					? String(i + 1).padStart(2, '0')
					: String(cell.label).replace('{n}', String(i + 1).padStart(2, '0'));
			const labelBg = cell.labelBg ?? 'rgba(0,0,0,0.55)';
			const labelColor = cell.labelColor ?? '#fff';
			const textW = measureText(ctx, text, ls, 'mono');
			const boxW = textW + pad * 2;
			const isCircle = cell.labelShape === 'circle';
			const boxH = isCircle ? Math.max(baseH, boxW) : baseH;
			let x = card.x + inset;
			let y = card.y + card.h - boxH;
			if (position.includes('top')) y = card.y + inset;
			if (position.includes('left')) x = card.x + inset;
			if (position.includes('right')) x = card.x + card.w - boxW - inset;
			if (position.includes('center')) x = card.x + (card.w - boxW) / 2;

			if (isCircle) {
				const cx = x + boxW / 2;
				const cy = y + boxH / 2;
				ctx.beginPath();
				ctx.arc(cx, cy, boxH / 2, 0, Math.PI * 2);
				ctx.fillStyle = labelBg;
				ctx.fill();
				drawText(ctx, text, cx - textW / 2, cy + Math.round(ls * 0.35), { size: ls, font: 'mono', color: labelColor });
			} else {
				const radius = cell.labelRounded ?? (cell.rounded ? Math.min(14, cell.rounded / 2) : 0);
				fillRoundRect(ctx, x, y, boxW, boxH, radius, labelBg);
				drawText(ctx, text, x + pad, y + boxH - Math.round(ls * 0.3), { size: ls, font: 'mono', color: labelColor });
			}
		});
	}

	// chrome: frame + film perforations
	const ch = c.chrome;
	if (ch) {
		if (ch.frame) {
			const f = ch.frame;
			const inset = f.inset ?? 24;
			ctx.save();
			ctx.globalAlpha = f.opacity ?? 1;
			strokeRoundRect(ctx, inset, inset, W - inset * 2, H - inset * 2, f.rounded ?? 0, f.color, f.width || 2);
			ctx.restore();
		}
		if (ch.filmPerforations) {
			const p = ch.filmPerforations;
			const holeW = p.width || 30;
			const holeH = p.height || 48;
			const pad = p.pad ?? 24;
			const gap = p.gap || 150;
			const color = p.color || '#f2ead8';
			ctx.save();
			ctx.globalAlpha = p.opacity ?? 0.72;
			for (let y = Math.round(p.start ?? 72); y < H - holeH; y += gap) {
				fillRoundRect(ctx, pad, y, holeW, holeH, p.rounded ?? 4, color);
				fillRoundRect(ctx, W - pad - holeW, y, holeW, holeH, p.rounded ?? 4, color);
			}
			ctx.restore();
		}
	}

	return canvas;
}
