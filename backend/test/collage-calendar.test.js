import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { createCollage } from '../collage.js';

// NEW CALENDAR tests - Professional week view with Thai day names

test('CALENDAR PRO creates a valid collage image', async () => {
  // Create test images for 7 days (2 photos per day expected)
  const testFiles = [];
  for (let i = 1; i <= 7; i++) {
    const img = await sharp({
      create: { width: 1920, height: 1080, channels: 3, background: { r: 100, g: 150, b: 200 } }
    }).jpeg().toBuffer();
    testFiles.push({ 
      path: `test-temp-${i}.jpg`,
      buffer: img,
    });
    await sharp(img).toFile(`test-temp-${i}.jpg`);
  }

  const buffer = await createCollage(testFiles, 'มกราคม 2569', '', 'wed', 'calendar');
  const meta = await sharp(buffer).metadata();
  
  // Calendar should be 2160px wide
  assert.equal(meta.width, 2160, 'Width should be 2160px');
  
  // Should have header + day columns
  assert.ok(meta.height >= 400, 'Height should include header and day columns');
  
  // Clean up
  for (let i = 1; i <= 7; i++) {
    try {
      await import('fs').then(fs => fs.promises.unlink(`test-temp-${i}.jpg`));
    } catch {}
  }
});

test('CALENDAR takes its colour from the chosen day, not the photo order', async () => {
  const { manifest } = await import('../design-system/themes/calendar/manifest.js');

  // The manifest must not invent its own per-day palette. Colour is the preset's
  // job — a manifest carrying dayColors is how a 7-photo upload ends up
  // rendering seven different colours instead of the day the user picked.
  assert.equal(manifest.dayColors, undefined, 'manifest must not carry per-day colours');
  assert.equal(manifest.canvas.header.presetHeader, true, 'header must take the preset colour');
  assert.ok(manifest.canvas.dayStrip, 'week strip must highlight the active day');

  const temps = [];
  const build = async (preset) => {
    const files = [];
    for (let i = 0; i < 3; i++) {
      const p = `test-temp-${preset}-${i}.jpg`;
      await sharp({
        create: { width: 800, height: 800, channels: 3, background: { r: 120, g: 140, b: 160 } },
      }).jpeg().toFile(p);
      temps.push(p);
      files.push({ path: p });
    }
    return createCollage(files, 'ทดสอบ', '2026-01-07', preset, 'calendar');
  };

  // Average colour of a patch inside the header band (HEADER_H is 440).
  const headerColour = async (buf) => {
    const { data } = await sharp(buf)
      .extract({ left: 60, top: 200, width: 8, height: 8 })
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
