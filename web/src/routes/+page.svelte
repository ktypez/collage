<script lang="ts">
	import { CONFIG } from '#lib/config';
	import Studio from '#lib/components/Studio.svelte';

	let result = $state<{ imageUrl: string; blob: Blob } | null>(null);

	function download() {
		if (!result) return;
		const a = document.createElement('a');
		a.href = result.imageUrl;
		a.download = `collage-${Date.now()}.jpg`;
		document.body.appendChild(a);
		a.click();
		a.remove();
	}
</script>

<svelte:head>
	<title>Collage Studio — สร้างคอลลาจของคุณ</title>
	<meta property="og:title" content="Collage Studio — STACK//FRAME" />
	<meta property="og:description" content="สร้างคอลลาจจากรูปกลุ่ม ทั้งดาวน์โหลดหรือส่งเข้า LINE" />
	<meta property="og:image" content={`${CONFIG.SITE_URL}/previews/og.jpg`} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:url" content={CONFIG.SITE_URL} />
	<meta property="og:type" content="website" />
	<meta property="og:locale" content="th_TH" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Collage Studio — STACK//FRAME" />
	<meta name="twitter:description" content="สร้างคอลลาจจากรูปกลุ่ม ทั้งดาวน์โหลดหรือส่งเข้า LINE" />
	<meta name="twitter:image" content={`${CONFIG.SITE_URL}/previews/og.jpg`} />
</svelte:head>

<div class="wrap">
	<div class="topbar">
		<div class="brand">
			<div class="brand-mark">S//F</div>
			<div class="brand-name">STACK<span>//</span>FRAME</div>
		</div>
		<div class="top-actions">
			<a class="btn-friend" href={CONFIG.LINE_FRIEND_URL} target="_blank" rel="noopener" aria-label="เพิ่มเพื่อนบอท LINE">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
				<span class="txt">เพิ่มเพื่อน</span>
			</a>
			<a class="btn-liff" href={`https://liff.line.me/${CONFIG.LIFF_ID}`} target="_blank" rel="noopener">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3C6.5 3 2 6.9 2 11.7c0 3 1.6 5.6 4.1 7.2V22l2.8-1.5c1 .3 2 .4 3.1 .4 5.5 0 10-3.9 10-8.7S17.5 3 12 3zM12 18.6c-4.2 0-7.6-2.7-7.6-6s3.4-6 7.6-6 7.6 2.7 7.6 6-3.4 6-7.6 6z" /></svg>
				เปิดใน LINE
			</a>
		</div>
	</div>

	<!-- upload=false: the web flow renders and downloads locally, no server needed -->
	<Studio onresult={(r) => (result = { imageUrl: r.imageUrl, blob: r.blob })} upload={false} />

	{#if result}
		<div class="result-area">
			<div class="result-title">พร้อมแบบรูปเรียบร้อย ✦</div>
			<img class="result-img" src={result.imageUrl} alt="ภาพคอลลาจที่สร้างเสร็จ" />
			<button type="button" class="result-download" onclick={download}>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
				ดาวน์โหลดรูป
			</button>
		</div>
	{/if}

	<footer class="footer">
		<span>STACK//FRAME <span class="dot"></span> COLLAGE STUDIO</span>
		<span>RENDERED IN YOUR BROWSER</span>
	</footer>
</div>