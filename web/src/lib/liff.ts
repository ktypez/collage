/* Minimal LINE LIFF v2 typing + loader.
   Loaded from the CDN in the /liff route only — the web flow never touches it. */

export interface LiffMessage {
	type: string;
	text?: string;
	originalContentUrl?: string;
	previewImageUrl?: string;
}

export interface Liff {
	init(config: { liffId: string }): Promise<void>;
	isLoggedIn(): boolean;
	login(config?: { redirectUri?: string; scope?: string[] }): Promise<{ code: string }>;
	logout(): void;
	sendMessages(messages: LiffMessage[]): Promise<unknown>;
	closeWindow(): void;
	permission?: { getGrantedAll(): Promise<string[]> };
}

declare global {
	interface Window {
		liff?: Liff;
	}
}

const SRC = 'https://static.line-scdn.net/liff/edge/2/sdk.js';

/** Resolves once window.liff exists (the script is injected by the route). */
export function loadLiff(timeoutMs = 15000): Promise<Liff> {
	if (window.liff) return Promise.resolve(window.liff);
	return new Promise((resolve, reject) => {
		const started = Date.now();
		const tick = () => {
			if (window.liff) return resolve(window.liff);
			if (Date.now() - started > timeoutMs) return reject(new Error('LINE SDK โหลดไม่สำเร็จ'));
			setTimeout(tick, 100);
		};
		if (!document.querySelector(`script[src="${SRC}"]`)) {
			const s = document.createElement('script');
			s.src = SRC;
			s.async = true;
			document.head.appendChild(s);
		}
		tick();
	});
}

export const REQUIRED_SCOPES = ['openid', 'profile', 'chat_message.write'];

export function isPermissionError(err: unknown): boolean {
	const msg = String((err as { message?: string; code?: string })?.message ?? (err as { code?: string })?.code ?? err);
	return /permission|scope|grant|authoriz/i.test(msg);
}

/** Tag the error so the caller knows whether a re-login would fix it. */
export function classifySendError(err: unknown): { needsScope?: boolean; needsReAuth?: boolean } {
	const raw = err as { message?: string; code?: string };
	const msg = String(raw?.message ?? raw?.code ?? err);
	if (/permission|scope|grant|authoriz/i.test(msg)) return { needsScope: true };
	if (/revoked|expired|unauthorized|invalid.*token|access token/i.test(msg)) return { needsReAuth: true };
	return {};
}