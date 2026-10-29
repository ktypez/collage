/* Unit tests for the pure parts of the collage engine (layout math + theme
   manifests). Run with `npm test` — node's built-in test runner, no deps.

   These files are imported as .ts on purpose: node strips the types at load
   time, so the tests exercise the exact modules the browser bundle uses. */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
	cols,
	fmtDate,
	masonry,
	parseColor,
	parseCssGradient,
	toRgba,
	W,
} from '../src/lib/collage/layout.ts';
import { DAY_PRESETS, DAYS, THEME_IDS, THEMES } from '../src/lib/collage/themes.ts';

test('cols never exceeds three columns', () => {
	assert.equal(cols(1), 1);
	assert.equal(cols(2), 2);
	assert.equal(cols(3), 3);
	assert.equal(cols(4), 3);
	assert.equal(cols(20), 3);
});

test('masonry keeps every image inside the canvas width', () => {
	const sizes = [
		{ w: 4000, h: 3000 },
		{ w: 3000, h: 4000 },
		{ w: 1000, h: 1000 },
		{ w: 2000, h: 2000 },
	];
	const L = masonry(sizes, { headerH: 440, hasBoth: true });

	assert.equal(L.placements.length, sizes.length);
	for (const p of L.placements) {
		assert.ok(p.x >= 0, 'card starts inside the canvas');
		assert.ok(p.x + L.cardW <= W, 'card ends inside the canvas');
		assert.ok(p.ih > 0, 'image height is a positive number');
		assert.ok(Number.isFinite(p.ch), 'card height is finite');
	}
	assert.ok(L.totalH > L.contentY, 'content starts below the header');
});

test('masonry handles different counts and aspect-ratio mixes without invalid geometry', () => {
	const fixtures = [
		[{ w: 1200, h: 800 }],
		[{ w: 800, h: 1200 }, { w: 1200, h: 800 }],
		[{ w: 1000, h: 1000 }, { w: 600, h: 1200 }, { w: 1200, h: 600 }],
		[{ w: 400, h: 1200 }, { w: 400, h: 1200 }, { w: 1200, h: 400 }, { w: 1200, h: 400 }],
		Array.from({ length: 5 }, (_, i) => ({ w: i % 2 ? 400 : 1200, h: i % 2 ? 1200 : 400 })),
		Array.from({ length: 12 }, (_, i) => ({ w: 500 + i * 80, h: 400 + (i % 4) * 350 })),
	];

	for (const sizes of fixtures) {
		const L = masonry(sizes, { headerH: 440, hasBoth: true });
		assert.equal(L.placements.length, sizes.length);
		assert.ok(L.contentH > 0);
		assert.ok(L.totalH > L.contentY + L.contentH - 1);
		for (const p of L.placements) {
			assert.ok(p.x >= 0 && p.x + L.cardW <= W, 'card stays within canvas width');
			assert.ok(p.y >= 0 && p.ch > 0 && p.ih > 0, 'placement dimensions are positive');
			assert.ok(Number.isFinite(p.x + p.y + p.ch + p.ih), 'geometry remains finite');
		}
	}
});

test('masonry survives a photo with no dimensions', () => {
	const L = masonry([{ w: 0, h: 0 }], { headerH: 440, hasBoth: true });
	assert.ok(Number.isFinite(L.totalH));
	assert.equal(L.placements.length, 1);
	assert.ok(L.placements[0].ih > 0);
});

test('masonry drops the next image into the shortest column', () => {
	const L = masonry(
		[
			{ w: 100, h: 400 },
			{ w: 100, h: 100 },
		],
		{ headerH: 440, hasBoth: true },
	);
	assert.equal(L.placements[0].colIdx, 0);
	assert.equal(L.placements[1].colIdx, 1);
});

test('fmtDate renders the Thai Buddhist year', () => {
	assert.equal(fmtDate('2024-01-05'), 'วันที่ 5 มกราคม 2567');
});

test('parseColor understands hex, short hex and rgba', () => {
	assert.deepEqual(parseColor('#ff0000'), { r: 255, g: 0, b: 0, a: 1 });
	assert.deepEqual(parseColor('#f00'), { r: 255, g: 0, b: 0, a: 1 });
	assert.deepEqual(parseColor('rgba(1, 2, 3, 0.5)'), { r: 1, g: 2, b: 3, a: 0.5 });
});

test('toRgba applies the alpha override', () => {
	assert.equal(toRgba('#ffffff', 0.5), 'rgba(255,255,255,0.5)');
});

test('parseCssGradient reads a linear gradient and ignores plain colours', () => {
	const g = parseCssGradient('linear-gradient(90deg, #000000, #ffffff)');
	assert.ok(g);
	assert.equal(g.deg, 90);
	assert.deepEqual(g.stops, ['#000000', '#ffffff']);
	assert.equal(parseCssGradient('#ff0000'), null);
});

test('every theme has a drawable canvas', () => {
	for (const id of THEME_IDS) {
		const manifest = THEMES[id];
		assert.ok(manifest, `${id} has a manifest`);
		assert.ok(manifest.canvas, `${id} has a canvas`);
		assert.ok(manifest.canvas.bg, `${id} has a background`);
		assert.ok(manifest.canvas.header, `${id} has a header`);
	}
});

test('the day presets cover every weekday with three colours', () => {
	assert.equal(DAYS.length, 7);
	for (const day of DAYS) {
		const stops = DAY_PRESETS[day];
		assert.ok(stops, `${day} has a palette`);
		assert.equal(stops.length, 3);
		for (const c of stops) assert.match(c, /^#[0-9a-f]{6}$/i);
	}
});

test('Polaroid captions use a distinct paper band without covering the photo', () => {
	const cell = THEMES.polar.canvas.cell;
	assert.equal(cell.labelBg, '#fffdf8');
	assert.equal(cell.labelColor, '#1a1a1a');
	assert.equal(cell.labelPosition, 'bottom-center');
	assert.equal(cell.labelHeight, 30);
});

test('theme registry has unique ids matching its manifest keys', () => {
	assert.equal(new Set(THEME_IDS).size, THEME_IDS.length);
	for (const id of THEME_IDS) assert.equal(THEMES[id].id, id);
});
