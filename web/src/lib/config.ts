/* Public runtime config, resolved from the `variables` declared in src/env.ts.
   Safe to import from client components. */

import { PUBLIC_LIFF_ID, PUBLIC_SITE_URL, PUBLIC_LINE_FRIEND_URL } from '$app/env/public';

export const CONFIG = {
	LIFF_ID: PUBLIC_LIFF_ID,
	/** Canonical site URL, used for og: tags and LINE deep links */
	SITE_URL: PUBLIC_SITE_URL,
	LINE_FRIEND_URL: PUBLIC_LINE_FRIEND_URL,
	MAX_FILES: 20,
} as const;

export const MAX_FILES = CONFIG.MAX_FILES;
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];