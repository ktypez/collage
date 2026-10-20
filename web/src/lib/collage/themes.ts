/* =============================================================================
   themes.ts — theme manifest registry (ported from backend/design-system/themes)
   -----------------------------------------------------------------------------
   The manifest is the single source of truth for both the canvas renderer and
   the UI copy. Shapes match the sharp manifests on `main` exactly so the visual
   output stays the same, minus the server round-trip.
   ============================================================================= */

export type DayPreset = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
export const THEME_IDS = ['7days', 'claude', 'lumen', 'post', 'studio', 'cinema', 'velvet', 'glitch', 'anime', 'tape', 'polar', 'press', 'mono', 'film', 'scrap'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const DAY_PRESETS: Record<DayPreset, [string, string, string]> = {
	sun: ['#DC2626', '#EF4444', '#F87171'],
	mon: ['#854D0E', '#CA8A04', '#FACC15'],
	tue: ['#BE185D', '#EC4899', '#F472B6'],
	wed: ['#047857', '#059669', '#34D399'],
	thu: ['#C2410C', '#EA580C', '#FB923C'],
	fri: ['#1D4ED8', '#3B82F6', '#60A5FA'],
	sat: ['#7C3AED', '#8B5CF6', '#A78BFA'],
};

export const DAY_NAMES: Record<DayPreset, string> = {
	sun: 'อาทิตย์',
	mon: 'จันทร์',
	tue: 'อังคาร',
	wed: 'พุธ',
	thu: 'พฤหัสบดี',
	fri: 'ศุกร์',
	sat: 'เสาร์',
};

export const DAYS: DayPreset[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const DAY_LABELS = [
	'อาทิตย์',
	'จันทร์',
	'อังคาร',
	'พุธ',
	'พฤหัสบดี',
	'ศุกร์',
	'เสาร์',
];

/** Short weekday tags used inside the 7 DAYS strip. */
export const DAY_SHORT: Record<DayPreset, string> = {
	sun: 'SUN', mon: 'MON', tue: 'TUE', wed: 'WED', thu: 'THU', fri: 'FRI', sat: 'SAT',
};

/** Fixed swatch colours for the day preset picker (matches frontend/style.css). */
export const SWATCHES: Record<DayPreset, string> = {
	sun: '#E5484D',
	mon: '#D9A400',
	tue: '#D6336C',
	wed: '#12A07A',
	thu: '#E8681A',
	fri: '#3B6FE0',
	sat: '#7C5CE6',
};

/* ---------- manifest types ---------- */

export interface CropMarks {
	color?: string;
	size?: number;
	width?: number;
	inset?: number;
}

export interface Backplate {
	dx?: number;
	dy?: number;
	rounded?: number;
	fill: string;
}

export interface CellManifest {
	border?: string;
	width?: number;
	rounded?: number;
	bg?: string;
	shadow?: number;
	backplate?: Backplate;
	label?: true | string;
	labelColor?: string;
	labelBg?: string;
	labelSize?: number;
	labelHeight?: number;
	labelPad?: number;
	labelPosition?: 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center';
	labelInset?: number;
	labelRounded?: number;
	labelShape?: 'circle';
	cropMarks?: CropMarks;
}

export interface HeaderManifest {
	text?: string;
	color?: string;
	font?: 'mono' | 'serif' | 'display' | 'sans';
	size?: number;
	pad?: number;
	glow?: boolean;
	kicker?: string;
	kickerFont?: 'sans' | 'serif' | 'display' | 'mono';
	kickerColor?: string;
	kickerSize?: number;
	kickerY?: number;
	align?: 'left' | 'right' | 'center';
	margin?: number;
	ink?: string;
	stripe?: string;
	stripeHeight?: number;
	stripePos?: 'top' | 'bottom';
	presetHeader?: boolean;
	presetHeaderStop?: 0 | 1 | 2;
}

export interface DayStrip {
	background?: string;
	height?: number;
	activeHeight?: number;
	gap?: number;
	inactiveOpacity?: number;
	label?: boolean;
	labelSize?: number;
}

export interface Chrome {
	frame?: { inset?: number; color: string; width?: number; opacity?: number; rounded?: number };
	filmPerforations?: {
		width?: number; height?: number; pad?: number; gap?: number; start?: number;
		color?: string; opacity?: number; rounded?: number;
	};
}

export interface ThemeManifest {
	id: ThemeId;
	name: string;
	dot: string;
	ui: {
		heroMeta: string;
		genIdle: string;
		genReady: string;
		genHint: string;
		outputTitle: string;
		outputTag: string;
		uploadText: string;
		logIntro: string;
	};
	canvas: {
		bg: string | { gradient: string[]; vertical?: boolean };
		cell: CellManifest;
		header: HeaderManifest;
		dayStrip?: DayStrip;
		overlay?: string | string[];
		photoFx?: string;
		chrome?: Chrome;
	};
}

/* ---------- the 7 themes ---------- */

export const THEMES = {
	'7days': {
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
	},
	claude: {
		id: 'claude',
		name: 'CLAUDE PAPER',
		dot: '#d97757',
		ui: {
			heroMeta: '~/notes',
			genIdle: '> reading…',
			genReady: '> saved · warm',
			genHint: '// paper over pixels.',
			outputTitle: 'CLAUDE PAPER · VAULT',
			outputTag: 'DONE',
			uploadText: 'drop a note here',
			logIntro: '$ obsidian --vault notes',
		},
		canvas: {
			bg: { gradient: ['#f4efe5', '#e9e1d4', '#f8f3eb'], vertical: true },
			cell: {
				backplate: { dx: 10, dy: 12, rounded: 12, fill: '#d5c7b4' },
				border: '#c76b4a', width: 2, rounded: 12,
				bg: '#fffdf8',
				label: '{n}', labelColor: '#fffaf4', labelBg: '#a65336',
				labelSize: 16, labelHeight: 22, labelPad: 10,
				labelPosition: 'top-left', labelInset: 2, labelRounded: 4,
			},
			header: {
				kicker: 'FIELD NOTES / 01', kickerFont: 'sans', kickerColor: '#a65336', kickerSize: 22,
				text: 'CLAUDE PAPER · NOTES',
				color: '#2a241e', font: 'serif', size: 40, pad: 48, glow: false,
				align: 'left', margin: 120, ink: '#2a241e',
				stripe: '#c76b4a', stripeHeight: 10, stripePos: 'top',
			},
			overlay: 'none',
			photoFx: 'saturate(0.94) brightness(1.01)',
			chrome: {
				frame: { inset: 26, color: '#c76b4a', width: 2, opacity: 0.28, rounded: 0 },
			},
		},
	},
	lumen: {
		id: 'lumen',
		name: 'LUMEN GALLERY',
		dot: '#ff7657',
		ui: {
			heroMeta: 'LUMEN GALLERY // LIGHT',
			genIdle: '> PREPARE PLATE',
			genReady: '> GALLERY READY',
			genHint: '// cool paper, one warm registration',
			outputTitle: 'LUMEN GALLERY · READY',
			outputTag: 'PLATE',
			uploadText: 'วางรูปลงบนแผ่นพิมพ์',
			logIntro: '$ lumen.plate --register',
		},
		canvas: {
			bg: '#f1eff7',
			cell: {
				border: '#2a1b38', width: 3, rounded: 0, bg: '#fffefa',
				backplate: { fill: '#ff7657', dx: 10, dy: 10, rounded: 0 },
				label: 'NO.{n}', labelColor: '#fffefa', labelBg: '#2a1b38',
				labelSize: 24, labelHeight: 42, labelPosition: 'top-left', labelInset: 14,
				labelRounded: 0,
				cropMarks: { color: '#ff7657', size: 28, width: 4, inset: 12 },
			},
			header: {
				text: '', color: '#ff7657', font: 'mono', size: 40, pad: 96, glow: false,
				align: 'left', margin: 108, ink: '#2a1b38',
				stripe: '#ff7657', stripeHeight: 18, stripePos: 'top',
			},
			overlay: 'none',
			photoFx: 'none',
		},
	},
	post: {
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
		},
	},
	studio: {
		id: 'studio',
		name: 'COLLAGE STUDIO',
		dot: '#c7f464',
		ui: {
			heroMeta: 'COLLAGE STUDIO // WEB EDITION',
			genIdle: '> ADD PHOTOS TO START',
			genReady: '> RENDER & EXPORT',
			genHint: '// section-labelled, lime accent',
			outputTitle: 'COLLAGE STUDIO // READY',
			outputTag: 'READY',
			uploadText: 'เชิญอัปโหลดที่นี่',
			logIntro: '$ studio.render',
		},
		canvas: {
			bg: { gradient: ['#111318', '#181b21', '#0b0c0f'], vertical: true },
			cell: {
				backplate: { dx: 10, dy: 12, rounded: 18, fill: '#08090b' },
				border: '#454852', width: 2, rounded: 18,
				bg: '#1b1d22',
				label: '{n}', labelColor: '#0a0a0c', labelBg: '#c7f464',
				labelSize: 16, labelHeight: 22, labelPad: 10,
				labelPosition: 'top-left', labelInset: 2, labelRounded: 4,
			},
			header: {
				kicker: 'STUDIO / 01', kickerFont: 'display', kickerColor: '#c7f464', kickerSize: 26,
				text: 'COLLAGE STUDIO',
				color: '#c7f464', font: 'display', size: 40, pad: 60, glow: false,
				align: 'left', margin: 120, ink: '#f4f4f0',
				stripe: '#c7f464', stripeHeight: 10, stripePos: 'top',
			},
			overlay: 'none',
			photoFx: 'saturate(1.08) brightness(1.02)',
		},
	},
	cinema: {
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
			chrome: {
				filmPerforations: {
					width: 28, height: 44, pad: 24, gap: 150, start: 76,
					color: '#d8c9a6', opacity: 0.5, rounded: 3,
				},
			},
		},
	},
	velvet: {
		id: 'velvet',
		name: 'VELVET SLEEVE',
		dot: '#f2a6a2',
		ui: {
			heroMeta: 'VELVET SLEEVE // DARK',
			genIdle: '> PRESS THE SLEEVE',
			genReady: '> SIDE A READY',
			genHint: '// deep plum, soft rose, serif title',
			outputTitle: 'VELVET SLEEVE · READY',
			outputTag: 'SIDE A',
			uploadText: 'เลือกภาพสำหรับปกอัลบั้ม',
			logIntro: '$ velvet.sleeve --press',
		},
		canvas: {
			bg: { gradient: ['#25131f', '#160b14'], vertical: true },
			cell: {
				border: '#6f405b', width: 2, rounded: 36, bg: '#321a2a',
				label: 'S{n}', labelColor: '#25131f', labelBg: '#f2a6a2',
				labelSize: 24, labelHeight: 40, labelPosition: 'bottom-center', labelInset: 12,
				labelRounded: 20,
			},
			header: {
				text: '', color: '#f2a6a2', font: 'serif', size: 40, pad: 76, glow: false,
				align: 'center', ink: '#f6d7d2',
				stripe: '#f2a6a2', stripeHeight: 12, stripePos: 'top',
			},
			overlay: 'none',
			photoFx: 'none',
			chrome: {
				frame: { inset: 24, width: 2, color: '#f2a6a2', opacity: 0.5, rounded: 52 },
			},
		},
	},
	glitch: {
		id: 'glitch',
		name: 'GLITCH MEME',
		dot: '#00e5ff',
		ui: {
			heroMeta: '404: SERIOUSNESS NOT FOUND',
			genIdle: '> DROP THE RECEIPTS',
			genReady: '> DEPLOY THE MEMES',
			genHint: '// chaotic energy, questionable decisions',
			outputTitle: 'GLITCH MODE · NO CONTEXT',
			outputTag: 'LOLWUT',
			uploadText: 'โยนหลักฐานความปั่นมาเลย',
			logIntro: '$ chaos.exe --send-it',
		},
		canvas: {
			bg: { gradient: ['#100b24', '#17102b', '#080713'], vertical: true },
			cell: {
				backplate: { dx: 12, dy: 10, rounded: 3, fill: '#ff2b6d' },
				border: '#00e5ff', width: 4, rounded: 3, bg: '#171124',
				label: '?? {n}', labelColor: '#100b24', labelBg: '#b7ff00',
				labelSize: 22, labelHeight: 38, labelPosition: 'top-left', labelInset: 12,
				labelRounded: 2,
				cropMarks: { color: '#ff2b6d', size: 24, width: 4, inset: 8 },
			},
			header: {
				text: '', color: '#00e5ff', font: 'mono', size: 40, pad: 76, glow: true,
				align: 'center', ink: '#f7f1ff',
				stripe: '#ff2b6d', stripeHeight: 12, stripePos: 'top',
			},
			photoFx: 'saturate(1.18) brightness(1.03)',
		},
	},
	anime: {
		id: 'anime',
		name: 'KAWAII CLUB',
		dot: '#f29ac2',
		ui: {
			heroMeta: 'KAWAII CLUB // AFTER SCHOOL',
			genIdle: '> PICK YOUR FAVORITE MOMENTS',
			genReady: '> SPARKLES, ACTIVATE!',
			genHint: '// pastel skies, tiny heart energy',
			outputTitle: 'KAWAII CLUB · BESTIES FOREVER',
			outputTag: 'SWEET!',
			uploadText: 'เลือกรูปน่ารักๆ มาใส่เลย ♡',
			logIntro: '$ sparkle.mode --on',
		},
		canvas: {
			bg: { gradient: ['#fff3f8', '#f8f1ff', '#eefaff'], vertical: true },
			cell: {
				backplate: { dx: 8, dy: 9, rounded: 28, fill: '#d8c5f4' },
				border: '#f29ac2', width: 3, rounded: 28, bg: '#fffafd', shadow: 0.08,
				label: '♡ {n}', labelColor: '#7d568a', labelBg: '#ffe0ee',
				labelSize: 22, labelHeight: 40, labelPosition: 'bottom-right', labelInset: 12,
				labelRounded: 20,
			},
			header: {
				text: '', color: '#c24c88', font: 'serif', size: 40, pad: 76, glow: false,
				align: 'center', ink: '#743d77',
				stripe: '#f9c6dc', stripeHeight: 12, stripePos: 'top',
			},
			photoFx: 'saturate(1.08) brightness(1.03)',
			chrome: {
				frame: { inset: 26, color: '#f29ac2', width: 3, opacity: 0.42, rounded: 48 },
			},
		},
	},
	tape: {
		id: 'tape',
		name: 'CLEAR TAPE',
		dot: '#d9c9a0',
		ui: {
			heroMeta: 'TAPE // CLEAR',
			genIdle: '> TAPE IT',
			genReady: '> TAPED',
			genHint: '// clear tape, torn edges',
			outputTitle: 'CLEAR TAPE · READY',
			outputTag: 'MEMO',
			uploadText: 'วางรูปลงบนกระดาษโน้ต',
			logIntro: '$ tape.clear --stick',
		},
		canvas: {
			bg: '#f2ebdc',
			cell: {
				border: '#d9c9a0', width: 1, rounded: 4, bg: '#fffdf7', shadow: 0.12,
				backplate: { dx: 8, dy: 10, rounded: 4, fill: '#d9c9a0' },
				label: '{n}', labelColor: '#3a3226', labelBg: '#d9c9a0',
				labelSize: 16, labelHeight: 22, labelPad: 10,
				labelPosition: 'top-left', labelInset: 2, labelRounded: 4,
			},
			header: {
				kicker: 'TAPE / 01', kickerFont: 'serif', kickerColor: '#8a7a55', kickerSize: 22,
				text: '', color: '#3a3226', font: 'serif', size: 40, pad: 48, glow: false,
				align: 'left', margin: 120, ink: '#3a3226',
				stripe: '#d9c9a0', stripeHeight: 8, stripePos: 'top',
			},
			overlay: 'none',
			photoFx: 'none',
			chrome: {
				frame: { inset: 16, color: '#d9c9a0', width: 1, opacity: 0.9, rounded: 6 },
			},
		},
	},
	mono: {
		id: 'mono',
		name: 'MONO INK',
		dot: '#1a1a1a',
		ui: {
			heroMeta: 'MONO // INK',
			genIdle: '> INK IT',
			genReady: '> PRINTED',
			genHint: '// black ink on cream',
			outputTitle: 'MONO INK · READY',
			outputTag: 'INK',
			uploadText: 'เลือกรูปสำหรับหมึกดำ',
			logIntro: '$ mono.ink --print',
		},
		canvas: {
			bg: '#f5f1e8',
			cell: {
				border: '#1a1a1a', width: 2, rounded: 0, bg: '#ffffff', shadow: 0,
				cropMarks: { color: '#1a1a1a', size: 22, width: 2, inset: 8 },
				label: 'NO.{n}', labelColor: '#ffffff', labelBg: '#1a1a1a',
				labelSize: 16, labelHeight: 26, labelPad: 8,
				labelPosition: 'top-left', labelInset: 8, labelRounded: 0,
			},
			header: {
				kicker: 'MONO / 01', kickerFont: 'mono', kickerColor: '#5a5a5a', kickerSize: 20,
				text: '', color: '#1a1a1a', font: 'mono', size: 40, pad: 60, glow: false,
				align: 'left', margin: 120, ink: '#1a1a1a',
				stripe: '#1a1a1a', stripeHeight: 2, stripePos: 'top',
			},
			overlay: 'none',
			photoFx: 'grayscale',
			chrome: {
				frame: { inset: 20, color: '#1a1a1a', width: 2, opacity: 0.9, rounded: 0 },
			},
		},
	},
	film: {
		id: 'film',
		name: 'FILM STRIP',
		dot: '#3a2a1a',
		ui: {
			heroMeta: 'FILM STRIP // 35MM',
			genIdle: '> EXPOSE',
			genReady: '> DEVELOPED',
			genHint: '// 35mm film, sprocket holes',
			outputTitle: 'FILM STRIP · READY',
			outputTag: '35MM',
			uploadText: 'เลือกรูปสำหรับฟิล์ม 35 มม.',
			logIntro: '$ film.expose --ready',
		},
		canvas: {
			bg: '#1a1410',
			cell: {
				border: '#3a2a1a', width: 2, rounded: 0, bg: '#2a1f18', shadow: 0.2,
				label: 'FR.{n}', labelColor: '#f4e4c1', labelBg: '#3a2a1a',
				labelSize: 16, labelHeight: 26, labelPad: 8,
				labelPosition: 'bottom-right', labelInset: 10, labelRounded: 0,
			},
			header: {
				kicker: '35MM / 01', kickerFont: 'mono', kickerColor: '#d4a373', kickerSize: 20,
				text: '', color: '#d4a373', font: 'mono', size: 40, pad: 60, glow: false,
				align: 'left', margin: 120, ink: '#f4e4c1',
				stripe: '#d4a373', stripeHeight: 4, stripePos: 'top',
			},
			overlay: 'none',
			photoFx: 'saturate(0.9) brightness(0.95) contrast(1.05)',
			chrome: {
				frame: { inset: 16, color: '#d4a373', width: 2, opacity: 0.6, rounded: 0 },
				filmPerforations: { width: 16, height: 26, gap: 70, pad: 12, color: '#f4e4c1', opacity: 0.5, rounded: 2, start: 40 },
			},
		},
	},
	scrap: {
		id: 'scrap',
		name: 'SCRAPBOOK',
		dot: '#c9a227',
		ui: {
			heroMeta: 'SCRAPBOOK // MIXED',
			genIdle: '> SCRAP IT',
			genReady: '> SCRAPBOOK READY',
			genHint: '// torn paper, mixed fonts',
			outputTitle: 'SCRAPBOOK · READY',
			outputTag: 'SCRAP',
			uploadText: 'เลือกรูปสำหรับสมุดตัดปะ',
			logIntro: '$ scrapbook.mix --ready',
		},
		canvas: {
			bg: { gradient: ['#f0e6d2', '#e8d9b8', '#f5ecd6'], vertical: true },
			cell: {
				border: '#b8956a', width: 2, rounded: 8, bg: '#fffaf0', shadow: 0.12,
				backplate: { dx: 6, dy: 8, rounded: 8, fill: '#c9a227' },
				label: '{n}', labelColor: '#fffaf0', labelBg: '#c9a227',
				labelSize: 18, labelHeight: 26, labelPad: 10,
				labelPosition: 'bottom-right', labelInset: 10, labelRounded: 12,
			},
			header: {
				kicker: 'SCRAP / 01', kickerFont: 'serif', kickerColor: '#8b6f47', kickerSize: 22,
				text: '', color: '#5a3e2b', font: 'serif', size: 44, pad: 60, glow: false,
				align: 'center', ink: '#5a3e2b',
				stripe: '#c9a227', stripeHeight: 8, stripePos: 'top',
			},
			overlay: 'none',
			photoFx: 'saturate(0.95) brightness(1.03)',
			chrome: {
				frame: { inset: 18, color: '#b8956a', width: 2, opacity: 0.6, rounded: 12 },
			},
		},
	},
	polar: {
		id: 'polar',
		name: 'POLAROID',
		dot: '#f5f1ea',
		ui: {
			heroMeta: 'POLAROID // SNAPSHOT',
			genIdle: '> FRAME IT',
			genReady: '> POLAROID READY',
			genHint: '// white border, bottom caption',
			outputTitle: 'POLAROID · READY',
			outputTag: 'SNAP',
			uploadText: 'เลือกรูปสำหรับโพลารอยด์',
			logIntro: '$ polaroid.snap --ready',
		},
		canvas: {
			bg: '#e9e6e1',
			cell: {
				border: '#f5f1ea', width: 1, rounded: 4, bg: '#ffffff', shadow: 0.14,
				label: '{n}', labelColor: '#1a1a1a', labelBg: 'rgba(0,0,0,0.06)',
				labelSize: 18, labelHeight: 120, labelPad: 12,
				labelPosition: 'bottom-center', labelInset: 14, labelRounded: 0,
			},
			header: {
				kicker: 'SNAPSHOT / 01', kickerFont: 'sans', kickerColor: '#6b6b6b', kickerSize: 20,
				text: '', color: '#1a1a1a', font: 'sans', size: 40, pad: 72, glow: false,
				align: 'center', ink: '#1a1a1a',
				stripe: '#1a1a1a', stripeHeight: 4, stripePos: 'top',
			},
			overlay: 'none',
			photoFx: 'saturate(0.92) brightness(1.02)',
			chrome: {},
		},
	},
	press: {
		id: 'press',
		name: 'PRESS',
		dot: '#1a1a1a',
		ui: {
			heroMeta: 'PRESS // EDITORIAL',
			genIdle: '> SET TYPE',
			genReady: '> PRINTED',
			genHint: '// ink on newsprint',
			outputTitle: 'PRESS · READY',
			outputTag: 'PRINT',
			uploadText: 'เลือกรูปสำหรับหน้าหนังสือพิมพ์',
			logIntro: '$ press.print --ready',
		},
		canvas: {
			bg: '#f4efe6',
			cell: {
				border: '#1a1a1a', width: 2, rounded: 0, bg: '#faf7f0', shadow: 0,
				cropMarks: { color: '#1a1a1a', size: 24, width: 3, inset: 10 },
				label: 'NO.{n}', labelColor: '#faf7f0', labelBg: '#1a1a1a',
				labelSize: 18, labelHeight: 30, labelPad: 10,
				labelPosition: 'top-left', labelInset: 12, labelRounded: 0,
			},
			header: {
				kicker: 'VOL. 01 · EDITION', kickerFont: 'mono', kickerColor: '#5a5a5a', kickerSize: 20,
				text: '', color: '#1a1a1a', font: 'serif', size: 48, pad: 60, glow: false,
				align: 'left', margin: 120, ink: '#1a1a1a',
				stripe: '#1a1a1a', stripeHeight: 3, stripePos: 'top',
			},
			overlay: 'none',
			photoFx: 'saturate(0.85) brightness(0.96)',
			chrome: {
				frame: { inset: 24, color: '#1a1a1a', width: 3, opacity: 0.85, rounded: 0 },
			},
		},
	},
} satisfies Record<string, ThemeManifest>;

/** Chip label + preview caption for each style. */
export const THEME_LABELS: Record<ThemeId, string> = {
	'7days': '7 DAYS',
	claude: 'CLAUDE',
	lumen: 'LUMEN',
	post: 'POST',
	studio: 'STUDIO',
	cinema: 'CINEMA',
	velvet: 'VELVET',
	glitch: 'GLITCH',
	anime: 'ANIME',
	mono: 'MONO INK',
	film: 'FILM STRIP',
	scrap: 'SCRAPBOOK',
	tape: 'CLEAR TAPE',
	polar: 'POLAROID',
	press: 'PRESS',
};

/** Chip sub-label. */
export const THEME_SUBS: Record<ThemeId, string> = {
	'7days': 'สีตามวัน',
	claude: 'paper',
	lumen: 'gallery',
	post: 'postcard',
	studio: 'web',
	cinema: 'film',
	velvet: 'album',
	glitch: 'meme',
	anime: 'kawaii',
	mono: 'ink',
	film: 'strip',
	scrap: 'collage',
	tape: 'clear',
	polar: 'snapshot',
	press: 'print',
};

/** Preview thumbnail for each style — one image per theme. */
export const THEME_PREVIEW: Record<ThemeId, string> = {
	'7days': 'pv-7days.jpg',
	claude: 'pv-claude.jpg',
	lumen: 'pv-lumen.jpg',
	post: 'pv-post.jpg',
	studio: 'pv-studio.jpg',
	cinema: 'pv-cinema.jpg',
	velvet: 'pv-velvet.jpg',
	glitch: 'pv-glitch.jpg',
	anime: 'pv-anime.jpg',
	mono: 'pv-mono.jpg',
	film: 'pv-film.jpg',
	scrap: 'pv-scrap.jpg',
	tape: 'pv-tape.jpg',
	polar: 'pv-polar.jpg',
	press: 'pv-press.jpg',
};

export function defaultPreset(): DayPreset {
	return DAYS[new Date().getDay()];
}
