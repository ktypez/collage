/* =============================================================================
   server/quota.ts — durable per-user upload quota
   -----------------------------------------------------------------------------
   Each collage is up to 25 MB in a public bucket, so one logged-in user in a
   loop is still a problem. This caps how many a single LINE user can push into
   a sliding window.

   The counter lives in R2 (one small object per user, `quota/<sha256(sub)>`),
   not in module memory: Vercel runs several instances and they share nothing, so
   an in-memory limiter only ever stopped bursts on one warm instance.

   R2 evaluates `If-Match` / `If-None-Match: *` on PutObject atomically at the
   commit point, so read-modify-write is safe: a concurrent upload that read the
   same version gets 412 and retries against the fresh one, instead of both
   counting the same slot. See
   https://developers.cloudflare.com/r2/reference/consistency/#conditional-writes

   No SvelteKit or R2 imports here — the store is injected, so `npm test` can
   exercise the logic against a fake.
   ============================================================================= */

/** Rollover happens after this many retries; a 429 for a second is fairer than a bypass. */
const MAX_ATTEMPTS = 4;
const PREFIX = 'quota/';

export type QuotaResult =
	/** `remaining` is how many more uploads fit in the window after this one. */
	| { ok: true; remaining: number }
	| { ok: false; retryAfter: number; remaining: 0 };

/** One versioned document: `version` is the ETag, null when the key is absent. */
export interface QuotaStore {
	get(key: string): Promise<{ value: string; version: string | null } | null>;
	/** `version === null` means "create only" (If-None-Match: *), otherwise If-Match. */
	put(key: string, value: string, version: string | null): Promise<void>;
}

/** Thrown by a store whose conditional write lost the race. */
export class QuotaConflictError extends Error {
	constructor() {
		super('quota document changed underneath us');
		this.name = 'QuotaConflictError';
	}
}

/**
 * Key for a LINE user, hashed so the bucket listing carries no user IDs and no
 * key ever contains unexpected characters.
 */
export async function quotaKey(userId: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(userId));
	const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
	return PREFIX + hex;
}

/** Timestamps of the attempts still inside the window, oldest first. */
function recentHits(raw: string | undefined, since: number, until: number): number[] {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw) as { hits?: unknown };
		if (!Array.isArray(parsed.hits)) return [];
		return parsed.hits.filter(
			(t): t is number => typeof t === 'number' && t > since && t <= until,
		);
	} catch {
		// A truncated/foreign document must not lock the user out forever.
		return [];
	}
}

export interface QuotaOptions {
	limit: number;
	windowMs: number;
	now?: () => number;
}

/**
 * Count one upload attempt for `userId`. Storage errors are rethrown — the
 * route turns them into a 503 rather than letting a broken counter mean
 * "unlimited".
 */
export async function checkQuota(
	store: QuotaStore,
	userId: string,
	{ limit, windowMs, now = Date.now }: QuotaOptions,
): Promise<QuotaResult> {
	const key = await quotaKey(userId);

	for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
		const current = await store.get(key);
		const t = now();

		const hits = recentHits(current?.value, t - windowMs, t);
		if (hits.length >= limit) {
			return {
				ok: false,
				retryAfter: Math.max(1, Math.ceil((hits[0] + windowMs - t) / 1000)),
				remaining: 0,
			};
		}

		// Never grows past `limit`: hits older than the window are dropped above.
		const next = JSON.stringify({ hits: [...hits, t] });
		try {
			await store.put(key, next, current?.version ?? null);
			return { ok: true, remaining: limit - hits.length - 1 };
		} catch (err) {
			if (!(err instanceof QuotaConflictError)) throw err;
			// Another instance committed first: re-read and count again. Jitter
			// keeps a burst of losers from colliding on the next attempt too.
			await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 40 * (attempt + 1)));
		}
	}

	return { ok: false, retryAfter: 1, remaining: 0 };
}
