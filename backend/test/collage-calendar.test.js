import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { renderBackdrop, renderForeground } from '../design-system/core/sharp-renderer.js';
import { DAY_PRESETS } from '../design-system/engine/layout.js';
import { manifest } from '../design-system/themes/calendar/manifest.js';

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

async function sample(svg, left, top) {
  const { data } = await sharp(Buffer.from(svg))
    .extract({ left, top, width: 1, height: 1 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return [...data];
}

function assertColor(actual, expected, message) {
  const rgb = hexToRgb(expected);
  for (let i = 0; i < 3; i++) {
    assert.ok(Math.abs(actual[i] - rgb[i]) <= 3, `${message}: expected ${expected}, got ${actual.slice(0, 3)}`);
  }
}

function assertHue(actual, expected, message) {
  const rgb = hexToRgb(expected);
  const dot = actual[0] * rgb[0] + actual[1] * rgb[1] + actual[2] * rgb[2];
  const magnitude = Math.hypot(...actual.slice(0, 3)) * Math.hypot(...rgb);
  const similarity = magnitude ? dot / magnitude : 0;
  assert.ok(similarity > 0.98, `${message}: expected hue ${expected}, got ${actual.slice(0, 3)}`);
}

test('CALENDAR header fill follows the selected day', async () => {
  const W = 1200;
  const HEADER_H = 300;
  for (const preset of ['sun', 'wed', 'fri', 'sat']) {
    const svg = renderBackdrop(manifest, {
      W, H: HEADER_H, headerH: HEADER_H, name: '', date: '', cards: [], preset,
    });
    const pixel = await sample(svg, 20, 120);
    assertColor(pixel, DAY_PRESETS[preset][1], `header for ${preset}`);
  }
});

test('CALENDAR week strip renders all seven day colors and extends the active day', async () => {
  const W = 1400;
  const H = 300;
  const svg = renderForeground(manifest, { W, H, cards: [], preset: 'fri' });
  const keys = Object.keys(DAY_PRESETS);
  const segmentW = W / keys.length;
  for (let i = 0; i < keys.length; i++) {
    const pixel = await sample(svg, Math.round(i * segmentW + segmentW / 2), 8);
    assertHue(pixel, DAY_PRESETS[keys[i]][1], `week strip ${keys[i]}`);
  }
  const activePixel = await sample(svg, Math.round(5.5 * segmentW), 45);
  assertColor(activePixel, DAY_PRESETS.fri[1], 'active day extension');
});
