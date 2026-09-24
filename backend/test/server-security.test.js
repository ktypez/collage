import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { once } from 'events';

process.env.ALLOWED_ORIGINS = 'https://report.mcky.space';
process.env.COLLAGE_RATE_LIMIT_MAX = '3';
process.env.MAX_CONCURRENT_RENDERS = '2';
process.env.CLEANUP_SECRET = 'test-cleanup-secret';
process.env.R2_ENDPOINT = 'http://127.0.0.1:9';
process.env.R2_ACCESS_KEY_ID = 'test';
process.env.R2_SECRET_ACCESS_KEY = 'test';
process.env.R2_BUCKET_NAME = 'test';
process.env.R2_PUBLIC_URL = 'https://example.invalid';
mkdirSync('/tmp/uploads', { recursive: true });

const { app } = await import('../server.js');

async function withServer(run) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

test('invalid upload type returns safe JSON instead of an HTML stack trace', async () => {
  await withServer(async (base) => {
    const form = new FormData();
    form.append('images', new Blob(['not an image'], { type: 'text/plain' }), 'bad.txt');
    const response = await fetch(`${base}/api/collage`, {
      method: 'POST',
      headers: { Origin: 'https://report.mcky.space' },
      body: form,
    });
    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.match(body.error, /JPEG, PNG/);
    assert.doesNotMatch(JSON.stringify(body), /server\.js|at Multer/);
  });
});

test('disallowed browser origins are rejected', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/health`, {
      headers: { Origin: 'https://attacker.example' },
    });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-powered-by'), null);
  });
});

test('unknown style and oversized fields fail before rendering or R2 upload', async () => {
  await withServer(async (base) => {
    const image = await sharp({
      create: { width: 32, height: 32, channels: 3, background: { r: 30, g: 80, b: 140 } },
    }).jpeg().toBuffer();

    const invalidTheme = new FormData();
    invalidTheme.append('images', new Blob([image], { type: 'image/jpeg' }), 'test.jpg');
    invalidTheme.append('theme', 'missing-style');
    invalidTheme.append('date', '2026-09-25');
    const themeResponse = await fetch(`${base}/api/collage`, { method: 'POST', body: invalidTheme });
    assert.equal(themeResponse.status, 400);
    assert.match((await themeResponse.json()).error, /Unknown collage style/);

    const longName = new FormData();
    longName.append('images', new Blob([image], { type: 'image/jpeg' }), 'test.jpg');
    longName.append('name', 'x'.repeat(81));
    longName.append('date', '2026-09-25');
    const nameResponse = await fetch(`${base}/api/collage`, { method: 'POST', body: longName });
    assert.equal(nameResponse.status, 400);
    assert.match((await nameResponse.json()).error, /too long/i);
  });
});

test('collage endpoint rate limits repeated requests by client IP', async () => {
  await withServer(async (base) => {
    const send = () => {
      const form = new FormData();
      form.append('images', new Blob(['bad'], { type: 'text/plain' }), 'bad.txt');
      return fetch(`${base}/api/collage`, {
        method: 'POST',
        headers: { 'X-Forwarded-For': '203.0.113.10' },
        body: form,
      });
    };
    assert.equal((await send()).status, 400);
    assert.equal((await send()).status, 400);
    assert.equal((await send()).status, 400);
    const limited = await send();
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
  });
});

test('cleanup endpoint rejects missing credentials', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/cleanup`, { method: 'POST' });
    assert.equal(response.status, 401);
  });
});
