import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { readImageMetadata } from '../collage.js';

test('rejects extreme image aspect ratios before layout allocation', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'collage-limits-'));
  const path = join(dir, 'extreme.jpg');
  try {
    await sharp({
      create: { width: 100, height: 500, channels: 3, background: { r: 20, g: 80, b: 120 } },
    }).jpeg().toFile(path);
    await assert.rejects(
      readImageMetadata([{ path }]),
      (error) => error.code === 'IMAGE_ASPECT_RATIO',
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
