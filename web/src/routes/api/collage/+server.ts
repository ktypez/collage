/* =============================================================================
   /api/collage — receives the collage the browser already rendered
   -----------------------------------------------------------------------------
   The client draws the whole image on a <canvas> and uploads the finished JPEG.
   The server never touches pixels: it validates the bytes, stores them in R2 and
   hands back public URLs that LINE can fetch. Two objects per send — the full
   sheet and a smaller copy for LINE's chat bubble.

   Only the /liff page uploads, and by then LIFF has logged the user in, so the
   request must carry that user's LINE ID token (`Authorization: Bearer …`).
   Objects are named with a random UUID: a timestamp was both guessable (anyone
   could enumerate the bucket) and colliding (two sends in the same millisecond
   overwrote each other).

   Per-user quota lives in R2 (`quota/<sha256>`), not in module memory, so it
   holds across Vercel instances; see lib/server/quota.ts.
   ============================================================================= */

import { json } from '@sveltejs/kit';
import { LIFF_ID } from '$app/env/private';
import {
	isR2Configured,
	publicUrl,
	R2NotConfiguredError,
	r2QuotaStore,
	uploadCollage,
} from '#lib/server/r2';
import { channelIdFromLiffId, verifyIdToken } from '#lib/server/lineAuth';
import { checkQuota } from '#lib/server/quota';
import { UPLOAD_QUOTA } from '#lib/quota';
import type { RequestHandler } from './$types';

const MAX_BYTES = 25 * 1024 * 1024;
/** LINE rejects a previewImageUrl over 1 MB. */
const MAX_PREVIEW_BYTES = 1024 * 1024;
const FILENAME_RE =
	/^collage-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-preview)?\.jpg$/;

/** The OIDC client_id is the channel ID inside the LIFF ID. */
const CHANNEL_ID = channelIdFromLiffId(LIFF_ID);

function bearerToken(request: Request): string | null {
	const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization')?.trim() ?? '');
	return match ? match[1] : null;
}

function fail(status: number, error: string) {
	return json({ success: false, error }, { status });
}

const isJpeg = (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

export const POST: RequestHandler = async ({ request }) => {
	if (!isR2Configured()) return fail(503, 'Storage not configured');
	if (!CHANNEL_ID) return fail(503, 'LINE login not configured');

	// Identity before body: an unauthenticated caller should never make us read
	// a 25 MB upload off the wire.
	const verified = await verifyIdToken(bearerToken(request), CHANNEL_ID);
	if (verified.status === 'unavailable') {
		return fail(503, 'ไม่สามารถยืนยันตัวตนกับ LINE ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
	}
	if (verified.status !== 'ok') return fail(401, 'Please sign in with LINE again');
	const { user } = verified;

	// Validate the upload before spending a quota slot — a rejected file must not
	// cost the user one of their sends. Reading the body still happens only after
	// auth above, so strangers can't force us to pull bytes off the wire.
	const form = await request.formData();
	const file = form.get('image');

	if (!(file instanceof File) || file.size === 0) return fail(400, 'No image uploaded');
	if (file.size > MAX_BYTES) return fail(413, 'Image too large (max 25MB)');

	const bytes = new Uint8Array(await file.arrayBuffer());
	// Check the magic bytes rather than trusting the declared MIME type —
	// content-type is client-controlled and sharp is gone, so this is the only gate.
	if (!isJpeg(bytes)) return fail(400, 'Only JPEG images are allowed');

	// Optional smaller copy for LINE's chat bubble.
	const previewFile = form.get('preview');
	let previewBytes: Uint8Array | null = null;
	if (previewFile instanceof File && previewFile.size > 0) {
		if (previewFile.size > MAX_PREVIEW_BYTES) return fail(413, 'Preview too large (max 1MB)');
		const raw = new Uint8Array(await previewFile.arrayBuffer());
		if (!isJpeg(raw)) return fail(400, 'Only JPEG previews are allowed');
		previewBytes = raw;
	}

	let quota;
	try {
		quota = await checkQuota(r2QuotaStore, user.userId, UPLOAD_QUOTA);
	} catch (err) {
		// Fail closed: an unreadable counter must not mean "unlimited", and the
		// image itself could not be stored either while R2 is unreachable.
		console.error('Quota error:', err);
		return fail(503, 'Could not check your upload quota — please try again');
	}
	if (!quota.ok) {
		return json(
			{ success: false, error: 'Too many collages — please wait a few minutes' },
			{ status: 429, headers: { 'retry-after': String(quota.retryAfter) } },
		);
	}

	// 122 random bits per send: unguessable URLs, and two simultaneous sends can
	// never land on the same key. Keep the `collage-` prefix — /api/cleanup
	// sweeps by it.
	const key = crypto.randomUUID();
	const filename = `collage-${key}.jpg`;
	const previewName = `collage-${key}-preview.jpg`;
	if (!FILENAME_RE.test(filename) || !FILENAME_RE.test(previewName)) return fail(500, 'Bad filename');

	try {
		// Both objects go up at the same time — the two round trips are the
		// slowest part of the send, and they don't depend on each other.
		await Promise.all([
			uploadCollage(bytes, filename),
			previewBytes ? uploadCollage(previewBytes, previewName) : Promise.resolve(),
		]);
	} catch (err) {
		console.error('Upload error:', err);
		if (err instanceof R2NotConfiguredError) return fail(503, 'Storage not configured');
		return fail(500, 'Upload failed');
	}

	return json({
		success: true,
		filename,
		imageUrl: publicUrl(filename),
		previewUrl: publicUrl(previewBytes ? previewName : filename),
		// So the UI can warn about the limit before it hits, not after.
		remaining: quota.remaining,
	});
};
