/* Serves a stored collage back. LINE fetches these URLs, so they must be
   cacheable — the filename is a timestamp, so the bytes never change. */

import { error } from '@sveltejs/kit';
import { getCollage, isR2Configured } from '#lib/server/r2';
import type { RequestHandler } from './$types';

const FILENAME_RE = /^collage-\d+\.jpg$/;

export const GET: RequestHandler = async ({ params }) => {
	if (!isR2Configured()) error(503, 'Storage not configured');
	if (!FILENAME_RE.test(params.filename)) error(400, 'Invalid filename');

	let blob: Blob;
	try {
		blob = await getCollage(params.filename);
	} catch (err) {
		console.error('Image fetch error:', err);
		error(404, 'Image not found');
	}

	return new Response(blob, {
		headers: {
			'Content-Type': 'image/jpeg',
			'Content-Length': String(blob.size),
			'Cache-Control': 'public, max-age=86400, immutable',
		},
	});
};
