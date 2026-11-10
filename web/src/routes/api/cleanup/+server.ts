/* =============================================================================
   /api/cleanup — deletes collages older than 7 days, plus upload-quota documents
   nobody has touched in 30 days (one tiny object per user otherwise piles up).
   -----------------------------------------------------------------------------
   Two callers:
     • Vercel Cron (vercel.json) issues a GET with `Authorization: Bearer $CRON_SECRET`
     • Anything else can POST with the same value in `x-cleanup-key`
   Both are checked against CLEANUP_SECRET — set Vercel's CRON_SECRET to the same
   string so one value covers both.
   ============================================================================= */

import { json } from '@sveltejs/kit';
import { CLEANUP_SECRET } from '$app/env/private';
import { cleanupOldCollages, cleanupStaleQuotas } from '#lib/server/r2';
import type { RequestHandler } from './$types';

const MAX_AGE_DAYS = 7;
const QUOTA_MAX_AGE_DAYS = 30;

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
		const { deleted: quotasDeleted } = await cleanupStaleQuotas(QUOTA_MAX_AGE_DAYS);
		return json({ success: true, deleted, quotasDeleted });
	} catch (err) {
		console.error('Cleanup error:', err);
		// Internal details stay in the log; callers need to know it failed, not why.
		return json({ success: false, error: 'Cleanup failed' }, { status: 500 });
	}
};

export const GET = run;
export const POST = run;