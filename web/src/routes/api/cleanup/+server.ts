/* =============================================================================
   /api/cleanup — deletes collages older than 7 days.
   -----------------------------------------------------------------------------
   Two callers:
     • Vercel Cron (vercel.json) issues a GET with `Authorization: Bearer $CRON_SECRET`
     • Anything else can POST with the same value in `x-cleanup-key`
   Both are checked against CLEANUP_SECRET — set Vercel's CRON_SECRET to the same
   string so one value covers both.
   ============================================================================= */

import { json } from '@sveltejs/kit';
import { CLEANUP_SECRET } from '$app/env/private';
import { cleanupOldCollages } from '#lib/server/r2';
import type { RequestHandler } from './$types';

const MAX_AGE_DAYS = 7;

function authorized(request: Request): boolean {
	if (!CLEANUP_SECRET) return false;
	if (request.headers.get('x-cleanup-key') === CLEANUP_SECRET) return true;
	return request.headers.get('authorization') === `Bearer ${CLEANUP_SECRET}`;
}

const run: RequestHandler = async ({ request }) => {
	if (!authorized(request)) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { deleted } = await cleanupOldCollages(MAX_AGE_DAYS);
		return json({ success: true, deleted });
	} catch (err) {
		console.error('Cleanup error:', err);
		return json({ success: false, error: (err as Error).message }, { status: 500 });
	}
};

export const GET = run;
export const POST = run;