/* =============================================================================
   server/r2.ts — Cloudflare R2 over the S3 API
   -----------------------------------------------------------------------------
   Only four operations are needed (put / get / list / delete), so this uses
   aws4fetch (65 KB, one dependency) instead of @aws-sdk/client-s3 (18 MB).
   Lives under lib/server/ so SvelteKit refuses to bundle it into the client.
   ============================================================================= */

import { AwsClient } from 'aws4fetch';
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

export async function getCollage(filename: string): Promise<Blob> {
	const res = await getClient().fetch(bucketUrl(filename));
	if (res.status === 404) throw new Error('not found');
	if (!res.ok) throw new Error(`R2 GET failed: ${res.status} ${await res.text()}`);
	return res.blob();
}

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

/** Delete collages older than `maxAgeDays`. Returns how many went. */
export async function cleanupOldCollages(maxAgeDays = 15): Promise<{ deleted: number }> {
	const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
	const stale: S3Object[] = [];

	for (const prefix of CLEANUP_PREFIXES) {
		for (const object of await listAll(prefix)) {
			if (new Date(object.LastModified).getTime() < cutoff) stale.push(object);
		}
	}

	if (!stale.length) {
		console.log(`Cleanup: no collages older than ${maxAgeDays} days`);
		return { deleted: 0 };
	}

	// DeleteObjects takes at most 1000 keys per call, and the payload must be a
	// single <Delete> document — R2 rejects bare <Object> fragments as MalformedXML.
	for (let i = 0; i < stale.length; i += 1000) {
		const batch = stale.slice(i, i + 1000);
		const body = `<Delete>${batch
			.map((o) => `<Object><Key>${escapeXml(o.Key)}</Key></Object>`)
			.join('')}</Delete>`;
		const res = await getClient().fetch(`${bucketUrl()}?delete`, {
			method: 'POST',
			body,
			headers: { 'Content-Type': 'application/xml' },
		});
		if (!res.ok) throw new Error(`R2 delete failed: ${res.status} ${await res.text()}`);
	}

	console.log(`Cleanup: deleted ${stale.length} collages older than ${maxAgeDays} days`);
	return { deleted: stale.length };
}
