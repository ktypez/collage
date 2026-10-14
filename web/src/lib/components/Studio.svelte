<script lang="ts">
	import { MAX_FILES } from '#lib/config';
	import { loadImages, renderCollage, canvasToBlob } from '#lib/collage/render';
	import { defaultPreset, type DayPreset, type ThemeId } from '#lib/collage/themes';
	import FileDrop from './FileDrop.svelte';
	import PhotoGrid from './PhotoGrid.svelte';
	import DatePicker from './DatePicker.svelte';
	import ThemePicker from './ThemePicker.svelte';

	interface Result {
		imageUrl: string;
		previewUrl: string;
		blob: Blob;
	}

	interface Props {
		/** Button caption. */
		cta?: string;
		/** Called once the collage exists and (if it uploads) is on the server. */
		onresult?: (r: Result) => unknown;
		/** When true the finished JPEG is uploaded to the API (needed for LIFF). */
		upload?: boolean;
	}

	let { cta = 'สร้างคอลลาจ', onresult, upload = true }: Props = $props();

	let files = $state<File[]>([]);
	let urls = $state<string[]>([]);
	let name = $state('');
	let date = $state('');
	let theme = $state<ThemeId>('7days');
	let preset = $state<DayPreset>(defaultPreset());
	let busy = $state(false);
	let status = $state<{ text: string; kind: 'loading' | 'success' | 'error' } | null>(null);

	// persist the name across sessions (same behaviour as the old shared.js)
	$effect(() => {
		const saved = localStorage.getItem('collage_name');
		if (saved && !name) name = saved;
	});
	$effect(() => {
		if (name) localStorage.setItem('collage_name', name);
	});

	// default the date to today
	$effect(() => {
		if (date) return;
		const n = new Date();
		date = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
	});

	function addFiles(incoming: File[]) {
		const room = MAX_FILES - files.length;
		if (room <= 0) return;
		const next = incoming.slice(0, room);
		files = [...files, ...next];
		urls = [...urls, ...next.map((f) => URL.createObjectURL(f))];
	}

	function removeFile(i: number) {
		URL.revokeObjectURL(urls[i]);
		files = files.filter((_, idx) => idx !== i);
		urls = urls.filter((_, idx) => idx !== i);
	}

	function reorder(from: number, to: number) {
		if (to < 0 || to >= files.length) return;
		const f = [...files];
		const u = [...urls];
		[f[from], f[to]] = [f[to], f[from]];
		[u[from], u[to]] = [u[to], u[from]];
		files = f;
		urls = u;
	}

	async function generate() {
		if (!files.length) {
			status = { text: 'เลือกรูปอย่างน้อย 1 รูปก่อน', kind: 'error' };
			return;
		}
		busy = true;
		status = { text: 'กำลังสร้างภาพ...', kind: 'loading' };
		try {
			// Yield once so the loading state paints before the render blocks the thread.
			await new Promise((r) => requestAnimationFrame(() => r(null)));

			const images = await loadImages(files);
			const canvas = await renderCollage(images, { name: name.trim(), date, preset, theme });
			const blob = await canvasToBlob(canvas);
			const previewUrl = URL.createObjectURL(blob);

			let imageUrl = previewUrl;
			if (upload) {
				const fd = new FormData();
				fd.append('image', blob, 'collage.jpg');
				fd.append('name', name.trim());
				fd.append('preset', preset);
				fd.append('theme', theme);
				// same origin — the storage API lives in this app, so there is
				// no CORS and no second service to keep alive
				const res = await fetch('/api/collage', { method: 'POST', body: fd });
				const data = await res.json().catch(() => ({ success: false, error: 'เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง' }));
				if (!data.success) throw new Error(data.error || 'เกิดข้อผิดพลาด ไม่ทราบสาเหตุ');
				imageUrl = data.imageUrl;
			}

			status = { text: 'สำเร็จแล้ว', kind: 'success' };
			await onresult?.({ imageUrl, previewUrl, blob });
		} catch (err) {
			status = { text: err instanceof Error ? err.message : String(err), kind: 'error' };
		} finally {
			busy = false;
		}
	}
</script>

<div class="studio">
	<div class="grid-2">
		<section>
			<div class="section-label"><span class="num">01</span> รูปของคุณ</div>
			<FileDrop count={files.length} ondrop={addFiles} />
			<PhotoGrid {urls} onremove={removeFile} onreorder={reorder} />
		</section>

		<section>
			<div class="section-label"><span class="num">02</span> รายละเอียด</div>

			<div class="field">
				<label for="nameInput">ชื่อ</label>
				<input
					id="nameInput"
					class="input"
					type="text"
					placeholder="ชื่อของคุณ"
					inputmode="text"
					autocomplete="name"
					bind:value={name}
				/>
			</div>

			<div class="field">
				<span class="label-like" id="dateLabel">วันที่</span>
				<DatePicker value={date} onchange={(iso) => (date = iso)} />
			</div>

			<div class="field">
				<span class="label-like">สไตล์</span>
				<ThemePicker {theme} {preset} ontheme={(t) => (theme = t)} onpreset={(p) => (preset = p)} />
			</div>

			<div class="create-bar">
				<button type="button" class="btn-primary" disabled={busy} class:loading={busy} onclick={generate}>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 17l6-6-6-6" /><path d="M12 19h9" /></svg>
					{cta}
				</button>
				{#if status}
					<div class="status {status.kind}" role="status" aria-live="polite">{status.text}</div>
				{/if}
			</div>
		</section>
	</div>
</div>