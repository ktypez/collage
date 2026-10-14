import { defineEnvVars } from '@sveltejs/kit/env';

/* Environment variables are declared here (SvelteKit 3 style) and consumed via
   `$app/env/public` (client-safe) or `$app/env/private` (server only). */

const optional = (fallback: string) => (value: string | undefined) => value?.trim() || fallback;

export const variables = defineEnvVars({
	/* --- public: inlined into the client bundle --- */
	PUBLIC_LIFF_ID: { public: true, schema: optional('2010606328-7UnH1Yre') },
	PUBLIC_SITE_URL: { public: true, schema: optional('http://localhost:5173') },
	PUBLIC_LINE_FRIEND_URL: { public: true, schema: optional('https://line.me/R/ti/p/%40484cgfku') },

	/* --- private: server only (LINE webhook secrets) --- */
	LINE_CHANNEL_ACCESS_TOKEN: { schema: (v) => v ?? '' },
	LINE_CHANNEL_SECRET: { schema: (v) => v ?? '' },
	LIFF_ID: { schema: optional('2010606328-7UnH1Yre') },

	/* --- private: Cloudflare R2 (S3-compatible), used by the /api routes --- */
	R2_ENDPOINT: { schema: (v) => v ?? '' },
	R2_ACCESS_KEY_ID: { schema: (v) => v ?? '' },
	R2_SECRET_ACCESS_KEY: { schema: (v) => v ?? '' },
	R2_BUCKET_NAME: { schema: (v) => v ?? '' },
	/** Public bucket base URL — this is what gets handed to LINE. */
	R2_PUBLIC_URL: { schema: (v) => v ?? '' },
	/** Shared secret for the /api/cleanup cron endpoint. */
	CLEANUP_SECRET: { schema: (v) => v ?? '' },
});