import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { createCollage } from '../collage.js';

// The chosen weekday — not the photo order — decides the palette. A previous
// renderer cycled THAI_DAYS[i % 7], so a 7-photo upload came out in seven
// different colours; these tests pin the real contract.

const HEADER_H = 440;

test('7 DAYS renders in the chosen day colour, not one colour per photo', async () => {
  const { manifest } = await import('../design-system/themes/7days/manifest.js');

  assert.equal(manifest.dayColors, undefined, 'manifest must not carry per-day colours');
  assert.equal(manifest.canvas.header.presetHeader, true, 'header must take the preset colour');
  assert.ok(manifest.canvas.dayStrip, 'week strip must highlight the active day');

  const temps = [];
  const build = async (preset) => {
    const files = [];
    // Four deliberately identical photos: any per-photo colour variation would
    // show up in the header sample below.
    for (let i = 0; i < 4; i++) {
      const p = `test-temp-7d-${preset}-${i}.jpg`;
      await sharp({
        create: { width: 800, height: 800, channels: 3, background: { r: 120, g: 140, b: 160 } },
      }).jpeg().toFile(p);
      temps.push(p);
      files.push({ path: p });
    }
    return createCollage(files, 'ทดสอบ', '2026-01-07', preset, '7days');
  };

  // Average colour of a patch inside the header band, clear of the week strip.
  const headerColour = async (buf) => {
    const { data } = await sharp(buf)
      .extract({ left: 60, top: Math.round(HEADER_H * 0.45), width: 8, height: 8 })
      .raw()
      .toBuffer({ resolveWithObject: true });
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < data.length; i += 3) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
    const n = data.length / 3;
    return [r / n, g / n, b / n];
  };

  try {
    const mon = await headerColour(await build('mon'));
    const sat = await headerColour(await build('sat'));
    const distance = Math.abs(mon[0] - sat[0]) + Math.abs(mon[1] - sat[1]) + Math.abs(mon[2] - sat[2]);

    assert.ok(
      distance > 60,
      `header colour must follow the preset — mon and sat rendered too similar (distance ${distance.toFixed(1)})`,
    );
  } finally {
    const fs = await import('fs');
    for (const p of temps) { try { await fs.promises.unlink(p); } catch {} }
  }
});

test('7 DAYS no longer accepts the retired calendar theme id', async () => {
  const { SUPPORTED_THEME_IDS } = await import('../collage.js');
  assert.ok(!SUPPORTED_THEME_IDS.includes('calendar'), 'calendar must no longer be a supported theme');
});