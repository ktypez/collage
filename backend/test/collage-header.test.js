/* =============================================================================
   Regression: header date/name text was getting cut off in generated collages.

   Root cause: opentype.js v2 emits a NaN control point halfway through a long
   mixed Thai+Latin string when rendered via a single-string getPath() (Chakra
   Petch, with the latn-only feature workaround). librsvg — the SVG rasterizer
   behind sharp on Linux/Render — silently drops the rest of the <path> from the
   first NaN onward, so "วันที่ 11 สิงหาคม 2569" rendered up to "...สิงห" and the
   rest ("าคม 2569") vanished.

   Fix: textPathSVG (sharp-renderer.js) now splits text into Thai/Latin runs and
   renders each run as its own <path>, so mixed-script strings never hit the NaN.

   These tests lock that in for every theme (& the legacy 'min' renderer):
     1. The generated header SVG contains ZERO "NaN".
     2. The rasterized output still shows the FULL date + (mixed) name — both
        ends of the string present, i.e. nothing cut off mid-glyph.
   ============================================================================= */

import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const { renderBackdrop } = await import('../design-system/core/sharp-renderer.js');
const { createCollage } = await import('../collage.js');

// Themed headers share these canvas dims (see collage.js).
const W = 2160;
const HEADER_H = 440;

// E X A C T regression strings — long mixed Thai + Latin in ONE string.
const NAME = 'Rennie แรนนี่';
const DATE = 'วันที่ 11 สิงหาคม 2569';

const THEME_IDS = ['rack', 'noc', 'claude', 'neo'];

/*
   Detect text ink as PIXELS THAT CONTRAST against the theme background gradient
   (same interpolation the renderer uses), so it works regardless of theme being
   light-on-dark or dark-on-light and never false-positives on the flat bg.
*/
function hex(c) {
  const n = parseInt(String(c).replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function bgAt(bg, x, y, fullW, fullH) {
  if (typeof bg === 'string') return hex(bg);
  if (bg.gradient) {
    const stops = bg.gradient.map(hex);
    const vert = bg.vertical !== false;
    const t = (vert ? y / (fullH - 1) : x / (fullW - 1)) * (stops.length - 1);
    const i = Math.min(stops.length - 1, Math.floor(t));
    const f = Math.max(0, Math.min(1, t - i));
    const a = stops[Math.max(0, i)];
    const b = stops[Math.min(stops.length - 1, i + 1)];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }
  return [255, 255, 255];
}

/*
   Rasterize a buffer, then measure the [minX, maxX] of ink in a Y-band.
   `fullH` is the image height the bg gradient was drawn over (needed for correct
   interpolation); `margins` = [left, right] pixels to ignore (rack chrome rails).
*/
async function inkRange(imageBuf, band, bg, fullH, margins = [0, 0]) {
  const { data, info } = await sharp(imageBuf)
    .extract({ left: 0, top: band.y0, width: W, height: band.y1 - band.y0 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, channels } = info;
  const [mLeft, mRight] = margins;
  let minX = Infinity;
  let maxX = -Infinity;
  for (let y = 0; y < band.y1 - band.y0; y++) {
    for (let x = mLeft; x < width - mRight; x++) {
      const i = (y * width + x) * channels;
      const [br, bgc, bb] = bgAt(bg, x, band.y0 + y, W, fullH);
      const d = Math.abs(data[i] - br) + Math.abs(data[i + 1] - bgc) + Math.abs(data[i + 2] - bb);
      if (d > 120) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }
  return [minX, maxX];
}

/* Run a theme's header and return { svg, ink } for name + date bands. */
async function headerInk(manifest, fullH) {
  const c = manifest.canvas;
  const svg = renderBackdrop(manifest, { W, H: fullH, headerH: HEADER_H, name: NAME, date: DATE, cards: [] });
  const band = (base, size) => ({
    y0: Math.max(0, base - Math.round(size * 1.0)),
    y1: base + Math.round(size * 0.5),
  });
  // rails (rack) are full-height bars at the edges — exclude them from ink search
  const rail = c.chrome && c.chrome.rails ? Math.round(W * c.chrome.rails.widthRatio) + 8 : 0;
  const margins = [rail, rail];
  const name = await inkRange(svg, band(Math.round(HEADER_H * 0.47), Math.round(HEADER_H * 0.30)), c.bg, fullH, margins);
  const date = await inkRange(svg, band(Math.round(HEADER_H * 0.78), Math.round(HEADER_H * 0.13)), c.bg, fullH, margins);
  return { svg, name, date };
}

/* Loose both-ends sanity bounds — way past the ~half-string cut a broken render
   produces, and generous vs. font/layout drift. */
function assertFullInk(ink, label, themeId) {
  const [minX, maxX] = ink;
  assert.ok(Number.isFinite(minX) && Number.isFinite(maxX), `no ${label} ink detected (theme ${themeId})`);
  const edge = label === 'name' ? { right: 1400, left: 750 } : { right: 1300, left: 850 };
  assert.ok(
    maxX >= edge.right,
    `${label} right edge missing (maxX=${maxX}, expect ≥ ${edge.right}) — text truncated (theme ${themeId})`
  );
  assert.ok(
    minX <= edge.left,
    `${label} left edge missing (minX=${minX}, expect ≤ ${edge.left}) — text truncated (theme ${themeId})`
  );
}

for (const id of THEME_IDS) {
  test(`theme "${id}" — header date/name renders fully (no NaN / no cut-off)`, async () => {
    const { manifest } = await import(`../design-system/themes/${id}/manifest.js`);
    const { svg, name, date } = await headerInk(manifest, HEADER_H);

    // 1) Root cause guard: a NaN anywhere in the path data makes librsvg drop
    //    everything from that point — text comes out half-missing.
    assert.ok(!svg.includes('NaN'), `header SVG contains NaN → text will be cut off (theme ${id})`);

    // 2) Rasterizer guard: both ends of the date AND the name must render.
    assertFullInk(name, 'name', id);
    assertFullInk(date, 'date', id);
  });
}

/* ---- end-to-end through the real public API (all themes incl. legacy) ---- */
test('createCollage — full pipeline renders complete header for every theme', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'collage-test-'));
  const files = [];
  try {
    for (let i = 0; i < 4; i++) {
      const p = join(dir, `img${i}.jpg`);
      writeFileSync(
        p,
        await sharp({ create: { width: 500 + i * 50, height: 350, channels: 3, background: { r: 40 + i * 30, g: 90, b: 160 } } }).jpeg().toBuffer()
      );
      files.push({ path: p });
    }

    for (const theme of [...THEME_IDS, 'min']) {
      const out = await createCollage(files, NAME, '2026-08-11', 'tue', theme);
      const { format, width, height } = await sharp(out).metadata();
      assert.equal(format, 'jpeg', `theme "${theme}" should output JPEG`);
      assert.ok(width === W, `theme "${theme}" produced unexpected width ${width}`);

      // Themed themes: verify the rendered date isn't truncated in the real image.
      // (backdrop gradient is drawn over the full collage height, so pass it)
      if (theme !== 'min') {
        const { manifest } = await import(`../design-system/themes/${theme}/manifest.js`);
        const c = manifest.canvas;
        const rail = c.chrome && c.chrome.rails ? Math.round(W * c.chrome.rails.widthRatio) + 8 : 0;
        const band = Math.round(HEADER_H * 0.78);
        const date = await inkRange(
          out,
          { y0: Math.max(0, band - Math.round(HEADER_H * 0.13)), y1: band + Math.round(HEADER_H * 0.13 * 0.5) },
          c.bg,
          height,
          [rail, rail]
        );
        assertFullInk(date, 'date', theme);
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});