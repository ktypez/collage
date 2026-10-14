<script lang="ts">
	import { CONFIG } from '#lib/config';
	import Studio from '#lib/components/Studio.svelte';
	import { loadLiff, REQUIRED_SCOPES, isPermissionError, classifySendError, type Liff } from '#lib/liff';

	let liff = $state<Liff | null>(null);
	let bootError = $state('');
	let notice = $state<{ text: string; kind: 'loading' | 'success' | 'error' } | null>(null);

	function forceReAuth(message?: string) {
		if (message) notice = { text: message, kind: 'loading' };
		try {
			liff?.logout();
		} catch {
			/* already logged out */
		}
		liff?.login({ redirectUri: window.location.href, scope: REQUIRED_SCOPES });
	}

	function hasGrantedSendScope(): Promise<boolean> {
		const p = liff?.permission;
		if (!p || typeof p.getGrantedAll !== 'function') return Promise.resolve(true);
		return p
			.getGrantedAll()
			.then((scopes) => Array.isArray(scopes) && scopes.includes('chat_message.write'))
			.catch(() => true);
	}

	async function send(imageUrl: string, previewImageUrl: string) {
		if (!liff) throw new Error('LINE ยังไม่พร้อมใช้งาน');
		const messages = [
			{ type: 'image', originalContentUrl: imageUrl, previewImageUrl },
		];
		try {
			await liff.sendMessages(messages);
		} catch (err) {
			throw Object.assign(err as Error, classifySendError(err));
		}
	}

	async function boot() {
		try {
			const sdk = await loadLiff();
			await sdk.init({ liffId: CONFIG.LIFF_ID });
			if (!sdk.isLoggedIn()) {
				await sdk.login({ redirectUri: window.location.href, scope: REQUIRED_SCOPES });
			}
			liff = sdk;

			if (!(await hasGrantedSendScope())) {
				// Don't loop: after one forced re-auth, tell the user to retry manually.
				let tried = false;
				try {
					tried = sessionStorage.getItem('collageReauth') === '1';
				} catch {
					tried = false;
				}
				if (!tried) {
					try {
						sessionStorage.setItem('collageReauth', '1');
					} catch {
						/* private mode */
					}
					forceReAuth('ยังไม่ได้ให้สิทธิ์ส่งข้อความ กำลังขอสิทธิ์ใหม่...');
				} else {
					notice = { text: 'ยังไม่ได้ให้สิทธิ์ส่งข้อความ กรุณากด "สร้างและส่งเข้ากลุ่ม" อีกครั้ง', kind: 'error' };
				}
			}
		} catch (err) {
			console.error('LIFF init error:', err);
			bootError = isPermissionError(err)
				? 'ยังไม่ได้ให้สิทธิ์บอท กรุณาอนุญาตสิทธิ์ส่งข้อความให้ครบก่อนใช้งาน'
				: `ไม่สามารถเชื่อมต่อ LINE: ${(err as Error).message ?? ''}`;
		}
	}

	async function onresult({ imageUrl, previewUrl }: { imageUrl: string; previewUrl: string }) {
		notice = { text: 'กำลังส่งเข้ากลุ่ม LINE...', kind: 'loading' };
		try {
			await send(imageUrl, previewUrl);
		} catch (err) {
			const e = err as Error & { needsScope?: boolean; needsReAuth?: boolean };
			if (e.needsScope || e.needsReAuth) {
				forceReAuth(
					e.needsReAuth ? 'เซสชันหมดอายุ กำลังเข้าสู่ระบบใหม่...' : 'ยังไม่ได้ให้สิทธิ์ส่งข้อความ กำลังขอสิทธิ์ใหม่...',
				);
				return;
			}
			throw err;
		}
		notice = { text: 'ส่งสำเร็จแล้ว!', kind: 'success' };
		setTimeout(() => {
			try {
				liff?.closeWindow();
			} catch {
				/* already closed */
			}
		}, 1500);
	}

	$effect(() => {
		boot();
	});
</script>

<svelte:head>
	<title>Collage Studio — ส่งเข้ากลุ่ม LINE</title>
	<meta property="og:title" content="Collage Studio — ส่งเข้ากลุ่ม LINE" />
	<meta property="og:description" content="สร้างคอลลาจและส่งเข้ากลุ่ม LINE" />
	<meta property="og:image" content={`${CONFIG.SITE_URL}/previews/og.jpg`} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:url" content={`${CONFIG.SITE_URL}/liff`} />
	<meta property="og:type" content="website" />
	<meta property="og:locale" content="th_TH" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Collage Studio — ส่งเข้ากลุ่ม LINE" />
	<meta name="twitter:description" content="สร้างคอลลาจและส่งเข้ากลุ่ม LINE" />
	<meta name="twitter:image" content={`${CONFIG.SITE_URL}/previews/og.jpg`} />
</svelte:head>

<div class="wrap">
	<div class="topbar">
		<div class="brand">
			<div class="brand-mark">S//F</div>
			<div class="brand-name">STACK<span>//</span>FRAME</div>
		</div>
		<div class="liff-banner"><span class="dot"></span> IN-LINE · ส่งเข้ากลุ่ม</div>
	</div>

	{#if bootError}
		<div class="boot-error" role="alert">{bootError}</div>
	{/if}

	<!-- upload=true: LINE needs a public HTTPS URL, so the finished JPEG goes to R2 -->
	<Studio cta="สร้างและส่งเข้ากลุ่ม" {onresult} upload />

	{#if notice}
		<div class="status {notice.kind}" role="status" aria-live="polite">{notice.text}</div>
	{/if}

	<footer class="footer">
		<span>STACK//FRAME <span class="dot"></span> COLLAGE STUDIO</span>
		<span>IN-LINE FLOW · LINE MESSAGING API</span>
	</footer>
</div>