/* =============================================================================
   Regression: Thai tone marks (วรรณยุกต์) in ChakraPetch headers.

   Root cause: opentype.js 2.x can't shape ChakraPetch's Thai GSUB (chaining
   substitution type 11). The old latn-only feature workaround dropped GPOS mark
   positioning, so tone marks (่ ้ ๊ ๋) lost their "above the consonant" slot and
   rendered at the baseline — "วันที่" looked like "วันที".

   Fix: textPathSVG (sharp-renderer.js) shapes Thai runs with HarfBuzz
   (hb-shape.js) instead of opentype. HarfBuzz applies Thai GSUB/GPOS the same
   way browsers do, so the tone mark is drawn above the consonant again.

   These tests lock that in:
     1. The generated header SVG is HarfBuzz-shaped (contains the expected
        per-glyph transform, no opentype NaN).
     2. Rasterized ink for a word WITH a tone mark ("ที่", "วันที่") extends
        ABOVE the ink of the same word without it ("ท", "วันที") — i.e. the
        mark is actually drawn in its raised position, not flattened.
   ============================================================================= */

import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const { renderBackdrop } = await import('../design-system/core/sharp-renderer.js');

const W = 800;
const HEADER_H = 300;

// Minimal themed manifest with a ChakraPetch header (non-serif path).
const manifest = {
  canvas: {
    bg: { gradient: ['#16161a', '#0a0a0c'] },
    header: { font: 'display', color: '#ffffff' },
    chrome: {},
    cell: {},
  },
};

/** Rasterize a single-line header and report the vertical ink range (min y). */
async function inkTop(name) {
  const svg = renderBackdrop(manifest, { W, H: HEADER_H, headerH: HEADER_H, name, date: null, cards: [] });
  const { data, info } = await sharp(Buffer.from(svg)).raw().toBuffer({ resolveWithObject: true });
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    if (r > 60 || g > 60 || b > 60) {
      const y = Math.floor(i / 4 / info.width);
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
    }
  }
  assert.ok(Number.isFinite(yMin), `no ink rendered for "${name}"`);
  return { yMin, yMax };
}

test('ChakraPetch Thai tone mark renders ABOVE the consonant (ท vs ที่)', async () => {
  const base = await inkTop('ท');
  const toned = await inkTop('ที่');
  // ่ is a raised mark: its ink must start clearly above the plain consonant's.
  // (baseline ≈ HEADER_H*0.55 = 165; a bare ท tops out ~55px above baseline,
  //  the tone mark must climb higher still.)
  assert.ok(
    toned.yMin < base.yMin - 20,
    `expected "ที่" ink to rise above "ท" (ท top=${base.yMin}, ที่ top=${toned.yMin})`
  );
});

test('ChakraPetch Thai tone mark present in "วันที่" (vs "วันที")', async () => {
  const withMark = await inkTop('วันที่');
  const withoutMark = await inkTop('วันที');
  assert.ok(
    withMark.yMin < withoutMark.yMin - 20,
    `expected "วันที่" ink to rise above "วันที" (วันที่ top=${withMark.yMin}, วันที top=${withoutMark.yMin})`
  );
});

test('header SVG contains no opentype NaN (HarfBuzz shaping is clean)', async () => {
  const svg = renderBackdrop(manifest, { W, H: HEADER_H, headerH: HEADER_H, name: 'วันที่ 11', date: 'สิงหาคม 2569', cards: [] });
  assert.ok(!svg.includes('NaN'), 'header SVG contains NaN — text will be cut off');
  // HarfBuzz path fragments are wrapped in <path d="..."> with scale(1 -1)
  assert.ok(svg.includes('scale(1 -1)'), 'expected HarfBuzz-shaped Thai path (scale flip)');
});

/* =============================================================================
   Same regression for Source Serif 4 + Noto Serif Thai (editorial themes
   claude / moss). opentype.js 2.x silently drops GPOS mark positioning on
   these fonts too — without HarfBuzz shaping, the tone mark falls to the
   baseline. These tests fail loudly if either font regresses to opentype.
   ============================================================================= */

const serifManifest = {
  canvas: {
    bg: { gradient: ['#faf9f5', '#f5f4ed'] },
    header: { font: 'serif', color: '#141413' },
    chrome: {},
    cell: {},
  },
};

async function inkTopSerif(name) {
  const svg = renderBackdrop(serifManifest, { W, H: HEADER_H, headerH: HEADER_H, name, date: null, cards: [] });
  const { data, info } = await sharp(Buffer.from(svg)).raw().toBuffer({ resolveWithObject: true });
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    if (r < 200 || g < 200 || b < 200) {
      const y = Math.floor(i / 4 / info.width);
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
    }
  }
  assert.ok(Number.isFinite(yMin), `no ink rendered for "${name}"`);
  return { yMin, yMax };
}

test('Source Serif 4 Thai tone mark renders ABOVE the consonant (ท vs ที่)', async () => {
  const base = await inkTopSerif('ท');
  const toned = await inkTopSerif('ที่');
  assert.ok(
    toned.yMin < base.yMin - 15,
    `expected "ที่" ink to rise above "ท" (ท top=${base.yMin}, ที่ top=${toned.yMin})`
  );
});

test('Source Serif 4 Thai tone mark present in "วันที่" (vs "วันที")', async () => {
  const withMark = await inkTopSerif('วันที่');
  const withoutMark = await inkTopSerif('วันที');
  assert.ok(
    withMark.yMin < withoutMark.yMin - 15,
    `expected "วันที่" ink to rise above "วันที" (วันที่ top=${withMark.yMin}, วันที top=${withoutMark.yMin})`
  );
});

test('serif header uses HarfBuzz shaping (scale flip), not opentype', async () => {
  const svg = renderBackdrop(serifManifest, { W, H: HEADER_H, headerH: HEADER_H, name: 'วันที่ 11', date: 'สิงหาคม 2569', cards: [] });
  assert.ok(!svg.includes('NaN'), 'header SVG contains NaN — text will be cut off');
  assert.ok(svg.includes('scale(1 -1)'), 'expected HarfBuzz-shaped Thai path (scale flip)');

/* =============================================================================
   STUDIO theme (web edition) — same lock-in: dark surfaces + lime accent,
   the new theme must also raise Thai tone marks correctly (uses ChakraPetch).
   ============================================================================= */

test('STUDIO theme tone mark renders ABOVE the consonant (ท vs ท่์)', async () => {
  const studioManifest = (await import('../design-system/themes/studio/manifest.js')).manifest;
  const text = (n) => renderBackdrop(studioManifest, { W, H: HEADER_H, headerH: HEADER_H, name: n, date: null, cards: [] });
  // Skip the lime accent stripe at the top (y < 14) when measuring ink range.
  async function inkY(svg) {
    const { data, info } = await sharp(Buffer.from(svg)).raw().toBuffer({ resolveWithObject: true });
    let yMin = Infinity, yMax = -Infinity;
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      const y = Math.floor(i / 4 / info.width);
      if (y < 14) continue;
      if (r > 200 && g > 200 && b > 200) { if (y < yMin) yMin = y; if (y > yMax) yMax = y; }
    }
    return { yMin, yMax };
  }
  const base = await inkY(text('ท'));
  const toned = await inkY(text('ท่์'));
  assert.ok(toned.yMin < base.yMin - 15, `STUDIO tone mark not raised (ท top=${base.yMin}, ท่์ top=${toned.yMin})`);
});

test('STUDIO theme — createCollage full pipeline renders the header', async () => {
  const studioManifest = (await import('../design-system/themes/studio/manifest.js')).manifest;
  // Lazy import createCollage to avoid pulling in heavy pipeline unless needed.
  const { createCollage } = await import('../collage.js');
  // Generate two solid-color JPEGs to feed the pipeline.
  const tmp = [];
  for (let i = 0; i < 3; i++) {
    const p = `/tmp/opencode/studio-fixture-${i}.jpg`;
    await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 30 + i*60, g: 80, b: 140 - i*30 } } }).jpeg().toFile(p);
    tmp.push(p);
  }
  const files = tmp.map(p => ({ path: p }));
  try {
    const buf = await createCollage(files, 'สตูดิโอ', '15 ส.ค. 2026', 'mon', 'studio');
    assert.ok(buf && buf.length > 1000, `STUDIO collage buffer empty (got ${buf ? buf.length : 0} bytes)`);
    // Rasterize and confirm ink is present in the header band.
    const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
    let ink = 0;
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      const y = Math.floor(i / 4 / info.width);
      if (y < HEADER_H && (r > 180 && g > 180 && b > 180)) ink++;
    }
    assert.ok(ink > 100, `STUDIO header band has no ink (${ink} bright pixels)`);
  } finally {
    for (const p of tmp) try { require('fs').rmSync(p); } catch {}
  }
});

});
