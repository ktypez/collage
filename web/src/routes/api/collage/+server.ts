/* =============================================================================
   /api/collage — receives the collage the browser already rendered
   -----------------------------------------------------------------------------
   The client draws the whole image on a <canvas> and uploads the finished JPEG.
   The server never touches pixels: it validates the bytes, stores them in R2 and
   hands back public URLs that LINE can fetch. Two objects per send — the full
   sheet and a smaller copy for LINE's chat bubble.
   ============================================================================= */

import { json } from '@sveltejs/kit';
import { isR2Configured, publicUrl, R2NotConfiguredError, uploadCollage } from '#lib/server/r2';
import type { RequestHandler } from './$types';

const MAX_BYTES = 25 * 1024 * 1024;
/** LINE rejects a previewImageUrl over 1 MB. */
const MAX_PREVIEW_BYTES = 1024 * 1024;
const FILENAME_RE = /^collage-\d+(-preview)?\.jpg$/;

function fail(status: number, error: string) {
	return json({ success: false, error }, { status });
}

const isJpeg = (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

export const POST: RequestHandler = async ({ request, url }) => {
	if (!isR2Configured()) return fail(503, 'Storage not configured');

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

	const stamp = Date.now();
	const filename = `collage-${stamp}.jpg`;
	const previewName = `collage-${stamp}-preview.jpg`;
	if (!FILENAME_RE.test(filename) || !FILENAME_RE.test(previewName)) return fail(500, 'Bad filename');

	try {
		await uploadCollage(bytes, filename);
		if (previewBytes) await uploadCollage(previewBytes, previewName);
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
	});
};
