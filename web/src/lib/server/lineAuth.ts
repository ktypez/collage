/* =============================================================================
   server/lineAuth.ts — who is calling /api/collage?
   -----------------------------------------------------------------------------
   The upload endpoint used to accept anything from anyone who knew the URL, and
   wrote it to a public bucket under a guessable name. The only page that
   uploads is /liff, where LIFF has already happened: the user is logged in and
   has granted `openid`, so the client holds a signed ID token. The server asks
   LINE whether that token is real, and gets a stable user ID in return.

   Verification is `POST /oauth2/v2.1/verify` with the channel ID as `client_id`
   — no channel secret, no extra dependency. LINE checks the signature and
   expiry; we additionally require `aud` to be our own channel, so a token
   minted for a different LINE app can never be replayed here.

   Lives under lib/server/ so the token never has a reason to reach the client
   bundle. Nothing in this file imports SvelteKit, which keeps it testable.
   ============================================================================= */

const VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify';
const ISSUER = 'https://access.line.me';
/** LINE answers in well under a second; a hung request must not hold the route. */
const TIMEOUT_MS = 5000;

export interface LineUser {
	/** Stable per-channel user ID (`sub`) — the key used for rate limiting. */
	userId: string;
	displayName?: string;
	pictureUrl?: string;
}

export type VerifyIdTokenResult =
	| { status: 'ok'; user: LineUser }
	| { status: 'invalid' }
	/** LINE's verify endpoint could not be reached or answered with a server error. */
	| { status: 'unavailable' };

interface IdTokenPayload {
	iss?: string;
	sub?: string;
	aud?: string;
	exp?: number;
	name?: string;
	picture?: string;
}

/**
 * LIFF IDs look like `<channelId>-<suffix>` (`2010606328-7UnH1Yre`), and that
 * prefix is exactly the OIDC client_id LINE expects.
 */
export function channelIdFromLiffId(liffId: string | undefined | null): string {
	return (liffId ?? '').split('-')[0].trim();
}

/**
 * Asks LINE whether `idToken` is real and was issued to `channelId`. A bad or
 * expired token is `invalid` (401); a LINE outage or network failure is
 * `unavailable` (503) so callers don't tell the user to log in again when the
 * problem is on LINE's side.
 */
export async function verifyIdToken(
	idToken: string | null | undefined,
	channelId: string,
	fetchImpl: typeof fetch = fetch,
): Promise<VerifyIdTokenResult> {
	const token = (idToken ?? '').trim();
	if (!token || !channelId) return { status: 'invalid' };

	let res: Response;
	try {
		res = await fetchImpl(VERIFY_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({ id_token: token, client_id: channelId }),
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
	} catch (err) {
		console.error('LINE ID token verify failed:', (err as Error).message);
		return { status: 'unavailable' };
	}

	// 4xx means the token is bad/expired/revoked; 5xx means LINE itself is struggling.
	if (!res.ok) return res.status >= 500 ? { status: 'unavailable' } : { status: 'invalid' };

	const data = (await res.json().catch(() => null)) as IdTokenPayload | null;
	if (!data?.sub) return { status: 'invalid' };
	if (data.aud !== channelId) return { status: 'invalid' };
	if (data.iss && data.iss !== ISSUER) return { status: 'invalid' };
	// Defense in depth: LINE rejects expired tokens, but never trust an expiry we can read.
	if (typeof data.exp === 'number' && data.exp * 1000 <= Date.now()) return { status: 'invalid' };

	return { status: 'ok', user: { userId: data.sub, displayName: data.name, pictureUrl: data.picture } };
}
