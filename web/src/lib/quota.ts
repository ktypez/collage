/* =============================================================================
   lib/quota.ts — the upload limit and the Thai words we show for it
   -----------------------------------------------------------------------------
   One source for both sides: the route enforces UPLOAD_QUOTA and the studio
   prints the same numbers back to the user. Kept outside lib/server/ because the
   client imports it too — the limit is public, the per-user counters in R2 are not.

   Wording lives here rather than in the component so the 429 path and the
   success path can't drift from the numbers they describe.
   ============================================================================= */

/** 12 uploads per user per 10 minutes is far more than a real send needs. */
export const UPLOAD_QUOTA = {
	limit: 12,
	windowMs: 10 * 60 * 1000,
} as const;

/**
 * Thai "try again in …" for the 429 answer. `retryAfter` is the response header,
 * in seconds; a missing or unparseable value keeps the wording vague rather than
 * inventing a number the user would trust.
 */
export function quotaWaitText(retryAfter: string | null | undefined): string {
	const seconds = Number(retryAfter);
	if (!retryAfter || !Number.isFinite(seconds) || seconds <= 0) {
		return 'อัปโหลดถี่เกินไป — รอสักครู่แล้วลองใหม่';
	}
	const wait = Math.ceil(seconds);
	// Round up: a 61-second wait is "2 นาที", never something shorter than reality.
	return wait < 60
		? `อัปโหลดถี่เกินไป — รออีก ${wait} วินาทีแล้วลองใหม่`
		: `อัปโหลดถี่เกินไป — รออีก ${Math.ceil(wait / 60)} นาทีแล้วลองใหม่`;
}

/**
 * What is left of the quota the server just counted — no "สำเร็จแล้ว" prefix, so
 * the same wording can sit under the button as a note that outlives a reload.
 */
export function quotaRemainingText(left: number): string {
	return left > 0
		? `เหลืออีก ${left} จาก ${UPLOAD_QUOTA.limit} ครั้ง`
		: `ใช้ครบ ${UPLOAD_QUOTA.limit} ครั้งแล้ว รอสักครู่ก่อนส่งครั้งถัดไป`;
}

/** The one-off line after a successful send. */
export function quotaLeftText(left: number): string {
	return `สำเร็จแล้ว · ${quotaRemainingText(left)}`;
}
