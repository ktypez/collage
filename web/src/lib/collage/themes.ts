/* =============================================================================
   themes.ts — theme manifest registry (ported from backend/design-system/themes)
   -----------------------------------------------------------------------------
   The manifest is the single source of truth for both the canvas renderer and
   the UI copy. Shapes match the sharp manifests on `main` exactly so the visual
   output stays the same, minus the server round-trip.
   ============================================================================= */

export type DayPreset = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
export const THEME_IDS = ['7days', 'claude', 'lumen', 'post', 'studio', 'cinema', 'velvet', 'glitch', 'anime'] as const;
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
				kicker: 'BREAKING: GROUP CHAT', kickerFont: 'mono', kickerColor: '#b7ff00', kickerSize: 22,
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
				kicker: '♡ FRIENDS / LITTLE MOMENTS ♡', kickerFont: 'display', kickerColor: '#a267a2', kickerSize: 22,
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
	glitch: 'pv-glitch.svg',
	anime: 'pv-anime.svg',
};

export function defaultPreset(): DayPreset {
	return DAYS[new Date().getDay()];
}
