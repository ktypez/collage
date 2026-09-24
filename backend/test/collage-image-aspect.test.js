import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { roundImage } from '../collage.js';

async function fixture(width, height) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 40 + width % 120, g: 80 + height % 90, b: 150 },
    },
  }).jpeg().toBuffer();
}

for (const [width, height] of [[800, 400], [400, 800], [100, 50]]) {
  test(`roundImage preserves ${width}x${height} source ratio`, async () => {
    const source = await fixture(width, height);
    const result = await roundImage(source, width, height, 640);
    const sourceRatio = width / height;
    const outputRatio = result.w / result.h;
    assert.ok(
      Math.abs(sourceRatio - outputRatio) < 0.002,
      `source ratio ${sourceRatio} changed to ${outputRatio}`,
    );
  });
}
