/* =============================================================================
   server/r2.ts — Cloudflare R2 over the S3 API
   -----------------------------------------------------------------------------
   Only a handful of operations are needed (put / get / list / delete), so this
   uses aws4fetch (65 KB, one dependency) instead of @aws-sdk/client-s3 (18 MB).
   Reads of collages are deliberately absent: the bucket is public and LINE
   fetches those from R2_PUBLIC_URL directly. The one read here is the upload
   quota document (`quota/`), which is never public.
   Lives under lib/server/ so SvelteKit refuses to bundle it into the client.
   ============================================================================= */

import { AwsClient } from 'aws4fetch';
import { QuotaConflictError, type QuotaStore } from './quota';
import {
	R2_ACCESS_KEY_ID,
	R2_BUCKET_NAME,
	R2_ENDPOINT,
	R2_PUBLIC_URL,
	R2_SECRET_ACCESS_KEY,
} from '$app/env/private';

let client: AwsClient | null = null;

export class R2NotConfiguredError extends Error {
	constructor() {
		super('R2 storage is not configured');
		this.name = 'R2NotConfiguredError';
	}
}

function getClient(): AwsClient {
	if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
		throw new R2NotConfiguredError();
	}
	client ??= new AwsClient({
		accessKeyId: R2_ACCESS_KEY_ID,
		secretAccessKey: R2_SECRET_ACCESS_KEY,
		service: 's3',
		// R2 ignores the region but SigV4 still requires one
		region: 'auto',
	});
	return client;
}

/** R2's S3 endpoint is a bare host; aws4fetch needs a full base URL. */
function bucketUrl(key = ''): string {
	const base = R2_ENDPOINT.replace(/\/+$/, '');
	return key ? `${base}/${R2_BUCKET_NAME}/${key}` : `${base}/${R2_BUCKET_NAME}`;
}

export function isR2Configured(): boolean {
	return Boolean(R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME);
}

/** Public URL of a stored collage — this is what LINE needs. */
export function publicUrl(filename: string): string {
	return `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${filename}`;
}

export async function uploadCollage(body: Uint8Array, filename: string): Promise<void> {
	const res = await getClient().fetch(bucketUrl(filename), {
		method: 'PUT',
		body: body as BodyInit,
		headers: { 'Content-Type': 'image/jpeg' },
	});
	if (!res.ok) {
		throw new Error(`R2 PUT failed: ${res.status} ${await res.text()}`);
	}
}

export class R2PreconditionError extends Error {
	constructor() {
		super('conditional write lost the race');
		this.name = 'R2PreconditionError';
	}
}

/** Read a text object plus its ETag, or null when the key is absent. */
export async function getObject(key: string): Promise<{ body: string; etag: string | null } | null> {
	const res = await getClient().fetch(bucketUrl(key));
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(`R2 GET failed: ${res.status} ${await res.text()}`);
	return { body: await res.text(), etag: res.headers.get('etag') };
}

interface PutCondition {
	/** Only write if the object still has this ETag (optimistic concurrency). */
	ifMatch?: string;
	/** Only write if the key does not exist yet. */
	onlyIfAbsent?: boolean;
}

/**
 * PUT with a precondition. R2 evaluates these atomically at the commit point and
 * answers 412 when another writer got there first.
 */
async function putObject(key: string, body: string, condition: PutCondition): Promise<void> {
	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	if (condition.ifMatch) headers['If-Match'] = condition.ifMatch;
	else if (condition.onlyIfAbsent) headers['If-None-Match'] = '*';

	const res = await getClient().fetch(bucketUrl(key), {
		method: 'PUT',
		body: new TextEncoder().encode(body) as BodyInit,
		headers,
	});
	if (res.status === 412) throw new R2PreconditionError();
	if (!res.ok) throw new Error(`R2 PUT failed: ${res.status} ${await res.text()}`);
}

/** The upload quota, stored beside the collages so it needs no extra service. */
export const r2QuotaStore: QuotaStore = {
	async get(key) {
		const object = await getObject(key);
		return object ? { value: object.body, version: object.etag } : null;
	},
	async put(key, value, version) {
		try {
			await putObject(key, value, version ? { ifMatch: version } : { onlyIfAbsent: true });
		} catch (err) {
			if (err instanceof R2PreconditionError) throw new QuotaConflictError();
			throw err;
		}
	},
};

interface S3Object {
	Key: string;
	LastModified: string;
}

/**
 * Keys the sweeper is allowed to delete. The second one is legacy: the old
 * Express backend wrote `<bucket>/collage-<uuid>.jpg`, so those 300-ish files
 * sit under a prefix and would never be reached by a `collage-` prefix alone.
 */
const CLEANUP_PREFIXES = ['collage-', `${R2_BUCKET_NAME}/collage-`];

const escapeXml = (s: string) =>
	s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** Every key under `prefix`, following continuation tokens to the end. */
async function listAll(prefix: string): Promise<S3Object[]> {
	const found: S3Object[] = [];
	let token: string | undefined;

	do {
		const query = new URLSearchParams({ 'list-type': '2', prefix });
		if (token) query.set('continuation-token', token);

		const res = await getClient().fetch(`${bucketUrl()}?${query}`);
		if (!res.ok) throw new Error(`R2 list failed: ${res.status} ${await res.text()}`);

		const xml = await res.text();
		for (const entry of xml.matchAll(/<Contents>(.*?)<\/Contents>/gs)) {
			const key = entry[1].match(/<Key>(.*?)<\/Key>/s)?.[1];
			const stamp = entry[1].match(/<LastModified>(.*?)<\/LastModified>/s)?.[1];
			if (key && stamp) found.push({ Key: key, LastModified: stamp });
		}
		token = xml.match(/<NextContinuationToken>(.*?)<\/NextContinuationToken>/s)?.[1];
	} while (token);

	return found;
}

/**
 * DeleteObjects takes at most 1000 keys per call, and the payload must be a
 * single <Delete> document — R2 rejects bare <Object> fragments as MalformedXML.
 */
async function deleteKeys(keys: string[]): Promise<void> {
	for (let i = 0; i < keys.length; i += 1000) {
		const body = `<Delete>${keys
			.slice(i, i + 1000)
			.map((key) => `<Object><Key>${escapeXml(key)}</Key></Object>`)
			.join('')}</Delete>`;
		const res = await getClient().fetch(`${bucketUrl()}?delete`, {
			method: 'POST',
			body,
			headers: { 'Content-Type': 'application/xml' },
		});
		if (!res.ok) throw new Error(`R2 delete failed: ${res.status} ${await res.text()}`);
	}
}

/** Keys under any of `prefixes` that were last written more than `maxAgeDays` ago. */
async function sweep(prefixes: string[], maxAgeDays: number): Promise<number> {
	const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
	const stale: string[] = [];

	for (const prefix of prefixes) {
		for (const object of await listAll(prefix)) {
			if (new Date(object.LastModified).getTime() < cutoff) stale.push(object.Key);
		}
	}

	if (stale.length) await deleteKeys(stale);
	return stale.length;
}

/** Delete collages older than `maxAgeDays`. Returns how many went. */
export async function cleanupOldCollages(maxAgeDays = 7): Promise<{ deleted: number }> {
	const deleted = await sweep(CLEANUP_PREFIXES, maxAgeDays);
	console.log(
		deleted
			? `Cleanup: deleted ${deleted} collages older than ${maxAgeDays} days`
			: `Cleanup: no collages older than ${maxAgeDays} days`,
	);
	return { deleted };
}

/**
 * Quota documents are one tiny object per user and are never deleted by the
 * upload path, so the daily cron sweeps the ones nobody has touched in a month.
 * A returning user just starts from an empty (already expired) window.
 */
export async function cleanupStaleQuotas(maxAgeDays = 30): Promise<{ deleted: number }> {
	return { deleted: await sweep(['quota/'], maxAgeDays) };
}
