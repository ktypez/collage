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

test('CALENDAR PRO uses Thai day names', async () => {
  const { manifest } = await import('../design-system/themes/calendar/manifest.js');
  
  // Check Thai day names are defined
  assert.ok(manifest.dayColors, 'manifest should have dayColors');
  assert.equal(manifest.dayColors.mon.name, 'จันทร์', 'Monday should be จันทร์');
  assert.equal(manifest.dayColors.sun.name, 'อาทิตย์', 'Sunday should be อาทิตย์');
});
