/* Unit tests for the upload guards (LINE ID token verification + the durable
   per-user quota). Run with `npm test`.

   Neither module imports SvelteKit, so they can be loaded straight into node;
   LINE's verify endpoint is replaced with a stub fetch and the quota store with
   an in-memory object map that enforces the same ETag precondition R2 does. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { channelIdFromLiffId, verifyIdToken } from '../src/lib/server/lineAuth.ts';
import { checkQuota, QuotaConflictError, quotaKey } from '../src/lib/server/quota.ts';
import { quotaLeftText, quotaRemainingText, quotaWaitText, UPLOAD_QUOTA } from '../src/lib/quota.ts';

const CHANNEL = '2010606328';
const TOKEN = 'header.payload.signature';

/** A fetch stand-in that records what it was asked and answers with `reply`. */
function stubFetch(reply) {
	const calls = [];
	const impl = async (url, init) => {
		calls.push({ url, init });
		if (reply instanceof Error) throw reply;
		return reply;
	};
	impl.calls = calls;
	return impl;
}

const jsonRes = (body, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

test('channelIdFromLiffId takes the channel ID prefix of a LIFF ID', () => {
	assert.equal(channelIdFromLiffId('2010606328-7UnH1Yre'), CHANNEL);
	assert.equal(channelIdFromLiffId(' 2010606328-abc '), CHANNEL);
	assert.equal(channelIdFromLiffId(''), '');
	assert.equal(channelIdFromLiffId(undefined), '');
});

test('verifyIdToken accepts a token LINE issued to our channel', async () => {
	const f = stubFetch(jsonRes({ iss: 'https://access.line.me', sub: 'U1234', aud: CHANNEL, name: 'Ann' }));
	const result = await verifyIdToken(TOKEN, CHANNEL, f);

	assert.deepEqual(result, {
		status: 'ok',
		user: { userId: 'U1234', displayName: 'Ann', pictureUrl: undefined },
	});
	assert.equal(f.calls.length, 1);
	assert.equal(f.calls[0].url, 'https://api.line.me/oauth2/v2.1/verify');
	assert.equal(f.calls[0].init.method, 'POST');
	// The token travels in the body, never in the URL.
	assert.equal(new URLSearchParams(f.calls[0].init.body).get('id_token'), TOKEN);
	assert.equal(new URLSearchParams(f.calls[0].init.body).get('client_id'), CHANNEL);
});

test('verifyIdToken rejects tokens minted for another channel', async () => {
	// LINE would already 400 a wrong client_id; this is the belt-and-braces check.
	const f = stubFetch(jsonRes({ sub: 'U1234', aud: '9999999999' }));
	assert.deepEqual(await verifyIdToken(TOKEN, CHANNEL, f), { status: 'invalid' });
});

test('verifyIdToken rejects an expired token even if LINE answers 200', async () => {
	const past = Math.floor(Date.now() / 1000) - 60;
	const f = stubFetch(jsonRes({ iss: 'https://access.line.me', sub: 'U1', aud: CHANNEL, exp: past }));
	assert.deepEqual(await verifyIdToken(TOKEN, CHANNEL, f), { status: 'invalid' });
});

test('verifyIdToken rejects missing, malformed and failed responses', async () => {
	const silent = () => {};
	const original = console.error;
	console.error = silent;
	try {
		const noToken = stubFetch(jsonRes({ sub: 'U1234', aud: CHANNEL }));
		assert.deepEqual(await verifyIdToken('', CHANNEL, noToken), { status: 'invalid' });
		assert.deepEqual(await verifyIdToken(null, CHANNEL, noToken), { status: 'invalid' });
		assert.equal(noToken.calls.length, 0, 'no network call without a token');

		assert.deepEqual(await verifyIdToken(TOKEN, '', noToken), { status: 'invalid' });

		// LINE reports a bad/expired token as 4xx — the user must log in again.
		const expired = stubFetch(jsonRes({ error: 'invalid_request' }, 400));
		assert.deepEqual(await verifyIdToken(TOKEN, CHANNEL, expired), { status: 'invalid' });

		const noSubject = stubFetch(jsonRes({ aud: CHANNEL }));
		assert.deepEqual(await verifyIdToken(TOKEN, CHANNEL, noSubject), { status: 'invalid' });

		const wrongIssuer = stubFetch(jsonRes({ iss: 'https://evil.example', sub: 'U1', aud: CHANNEL }));
		assert.deepEqual(await verifyIdToken(TOKEN, CHANNEL, wrongIssuer), { status: 'invalid' });

		const notJson = stubFetch(new Response('<html>oops</html>', { status: 200 }));
		assert.deepEqual(await verifyIdToken(TOKEN, CHANNEL, notJson), { status: 'invalid' });

		// LINE itself down / unreachable — tell the caller to retry, not to re-login.
		const lineDown = stubFetch(jsonRes({ error: 'server_error' }, 503));
		assert.deepEqual(await verifyIdToken(TOKEN, CHANNEL, lineDown), { status: 'unavailable' });

		const offline = stubFetch(new Error('ECONNRESET'));
		assert.deepEqual(await verifyIdToken(TOKEN, CHANNEL, offline), { status: 'unavailable' });
	} finally {
		console.error = original;
	}
});

/** Stand-in for R2: one document per key with an ETag that conditional writes check. */
function fakeStore() {
	const objects = new Map();
	let seq = 0;
	const store = {
		objects,
		conflicts: 0,
		/** Runs before each write, so a test can slip another writer in first. */
		beforePut: null,
		async get(key) {
			const object = objects.get(key);
			return object ? { ...object } : null;
		},
		async put(key, value, version) {
			if (store.beforePut) store.beforePut(key);
			const live = objects.get(key)?.version ?? null;
			if (live !== version) {
				store.conflicts += 1;
				throw new QuotaConflictError();
			}
			objects.set(key, { value, version: `etag-${++seq}` });
		},
	};
	return store;
}

test('checkQuota allows the quota, then blocks with a retry hint', async () => {
	let now = 1_000_000;
	const store = fakeStore();
	const quota = { limit: 3, windowMs: 60_000, now: () => now };

	for (let i = 0; i < 3; i++) {
		assert.deepEqual(await checkQuota(store, 'U1', quota), { ok: true, remaining: 2 - i });
	}

	const blocked = await checkQuota(store, 'U1', quota);
	assert.equal(blocked.ok, false);
	assert.equal(blocked.remaining, 0);
	assert.ok(blocked.retryAfter > 0 && blocked.retryAfter <= 60, `retryAfter=${blocked.retryAfter}`);

	// Another user is unaffected — this is a per-user quota.
	assert.deepEqual(await checkQuota(store, 'U2', quota), { ok: true, remaining: 2 });

	// Sliding window: once the first hit ages out, exactly one slot frees up.
	now += 60_001;
	assert.deepEqual(await checkQuota(store, 'U1', quota), { ok: true, remaining: 2 });
	assert.equal((await checkQuota(store, 'U1', quota)).ok, true);
});

test('checkQuota survives a concurrent writer instead of double-counting a slot', async () => {
	let now = 1_000_000;
	const store = fakeStore();
	const quota = { limit: 2, windowMs: 60_000, now: () => now };

	// Simulate another instance committing between our read and our write.
	let interfered = false;
	store.beforePut = (key) => {
		if (interfered) return;
		interfered = true;
		const other = { value: JSON.stringify({ hits: [now] }), version: 'etag-other' };
		store.objects.set(key, other);
	};

	// The retry re-counts against the other writer's hit, so this fills the window.
	assert.deepEqual(await checkQuota(store, 'U1', quota), { ok: true, remaining: 0 });
	assert.equal(store.conflicts, 1, 'the stale write was rejected');

	// The other writer's hit is preserved, so only one slot is left.
	const doc = JSON.parse([...store.objects.values()][0].value);
	assert.equal(doc.hits.length, 2);
	assert.equal((await checkQuota(store, 'U1', quota)).ok, false);
});

test('checkQuota fails closed when writers keep colliding', async () => {
	const store = fakeStore();
	// Every write keeps finding a newer document: never allow on a lost race.
	store.beforePut = (key) => {
		store.objects.set(key, { value: '{"hits":[]}', version: `etag-x${Math.random()}` });
	};

	const result = await checkQuota(store, 'U1', { limit: 5, windowMs: 60_000 });
	assert.deepEqual(result, { ok: false, retryAfter: 1, remaining: 0 });
});

test('checkQuota ignores a corrupt quota document', async () => {
	const store = fakeStore();
	const key = await quotaKey('U1');
	store.objects.set(key, { value: '<html>not json', version: 'etag-1' });

	assert.deepEqual(await checkQuota(store, 'U1', { limit: 1, windowMs: 60_000 }), { ok: true, remaining: 0 });
	assert.equal((await checkQuota(store, 'U1', { limit: 1, windowMs: 60_000 })).ok, false);
});

test('quotaKey is stable, per-user and leaks no user ID', async () => {
	const a = await quotaKey('U1234');
	assert.equal(a, await quotaKey('U1234'));
	assert.notEqual(a, await quotaKey('U5678'));
	assert.match(a, /^quota\/[0-9a-f]{64}$/);
	assert.ok(!a.includes('U1234'));
});

test('quota wording comes from the shared limit and never shortens the wait', () => {
	// The UI copy tracks UPLOAD_QUOTA instead of repeating the numbers.
	assert.match(quotaLeftText(3), new RegExp(`3 จาก ${UPLOAD_QUOTA.limit} ครั้ง`));
	assert.match(quotaLeftText(0), new RegExp(`ครบ ${UPLOAD_QUOTA.limit} ครั้ง`));
	// The persistent note drops the one-off success prefix.
	assert.match(quotaRemainingText(3), new RegExp(`^เหลืออีก 3 จาก ${UPLOAD_QUOTA.limit}`));

	assert.match(quotaWaitText('45'), /45 วินาที/);
	// 61 seconds is rounded up to a minute, never down.
	assert.match(quotaWaitText('61'), /2 นาที/);
	assert.match(quotaWaitText('577'), /10 นาที/);

	// A header we can't trust gets vague wording, not a made-up countdown.
	for (const bad of [null, '', 'soon', '0', '-5']) {
		assert.match(quotaWaitText(bad), /รอสักครู่/, `retry-after=${bad}`);
	}
});
