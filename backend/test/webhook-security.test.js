import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'stream';

process.env.LINE_CHANNEL_ACCESS_TOKEN = 'test-token';
process.env.LINE_CHANNEL_SECRET = 'test-secret';
process.env.LIFF_ID = 'test-liff';
const { getRawBody } = await import('../../frontend/api/webhook.js');

function request(chunks, headers = {}) {
  const req = Readable.from(chunks);
  req.headers = headers;
  return req;
}

test('LINE webhook raw body reader returns valid UTF-8', async () => {
  const raw = await getRawBody(request([Buffer.from('{"events":'), Buffer.from('[]}')]));
  assert.equal(raw, '{"events":[]}');
});

test('LINE webhook rejects oversized bodies before buffering them', async () => {
  await assert.rejects(
    getRawBody(request([Buffer.alloc(32)], { 'content-length': '64' }), 16),
    (error) => error.code === 'BODY_TOO_LARGE',
  );
  await assert.rejects(
    getRawBody(request([Buffer.alloc(32)]), 16),
    (error) => error.code === 'BODY_TOO_LARGE',
  );
});
