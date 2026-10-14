/* =============================================================================
   /api/collage — receives the collage the browser already rendered
   -----------------------------------------------------------------------------
   The client draws the whole image on a <canvas> and uploads the finished JPEG.
   The server never touches pixels: it validates the bytes, stores them in R2 and
   hands back a public URL that LINE can fetch.
   ============================================================================= */

import { json } from '@sveltejs/kit';
import { isR2Configured, publicUrl, R2NotConfiguredError, uploadCollage } from '#lib/server/r2';
import type { RequestHandler } from './$types';

const MAX_BYTES = 25 * 1024 * 1024;
const FILENAME_RE = /^collage-\d+\.jpg$/;

function fail(status: number, error: string) {
	return json({ success: false, error }, { status });
}

export const POST: RequestHandler = async ({ request, url }) => {
	if (!isR2Configured()) return fail(503, 'Storage not configured');

	const form = await request.formData();
	const file = form.get('image');

	if (!(file instanceof File) || file.size === 0) return fail(400, 'No image uploaded');
	if (file.size > MAX_BYTES) return fail(413, 'Image too large (max 25MB)');

	const bytes = new Uint8Array(await file.arrayBuffer());
	// Check the magic bytes rather than trusting the declared MIME type —
	// content-type is client-controlled and sharp is gone, so this is the only gate.
	if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
		return fail(400, 'Only JPEG images are allowed');
	}

	const filename = `collage-${Date.now()}.jpg`;
	if (!FILENAME_RE.test(filename)) return fail(500, 'Bad filename');

	try {
		await uploadCollage(bytes, filename);
	} catch (err) {
		console.error('Upload error:', err);
		if (err instanceof R2NotConfiguredError) return fail(503, 'Storage not configured');
		return fail(500, 'Upload failed');
	}

	return json({ success: true, filename, imageUrl: publicUrl(filename) });
};
