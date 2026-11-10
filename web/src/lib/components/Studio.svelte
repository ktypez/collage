<script lang="ts">
	import { MAX_FILES } from '#lib/config';
	import { loadImages, renderCollage, canvasToBlob, makePreview } from '#lib/collage/render';
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
		cta?: string;
		onresult?: (r: Result) => unknown;
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
	let resultUrl = $state<string | null>(null);
	let imageUrl = $state('');

	$effect(() => {
		const saved = localStorage.getItem('collage_name');
		if (saved && !name) name = saved;
	});
	$effect(() => {
		if (name) localStorage.setItem('collage_name', name);
	});
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
			await new Promise((r) => requestAnimationFrame(() => r(null)));
			const images = await loadImages(files);
			const canvas = await renderCollage(images, { name: name.trim(), date, preset, theme });
			const blob = await canvasToBlob(canvas);
			if (resultUrl) URL.revokeObjectURL(resultUrl);
			resultUrl = URL.createObjectURL(blob);
			let previewUrl = resultUrl;
			imageUrl = resultUrl;

			if (upload) {
				const fd = new FormData();
				fd.append('image', blob, 'collage.jpg');
				fd.append('preview', await canvasToBlob(await makePreview(canvas), 0.92), 'collage-preview.jpg');
				const res = await fetch('/api/collage', { method: 'POST', body: fd });
				const data = await res.json().catch(() => ({ success: false, error: 'เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง' }));
				if (!data.success) throw new Error(data.error || 'เกิดข้อผิดพลาด ไม่ทราบสาเหตุ');
				imageUrl = data.imageUrl;
				previewUrl = data.previewUrl ?? imageUrl;
			}

			status = { text: 'สำเร็จแล้ว', kind: 'success' };
			await onresult?.({ imageUrl, previewUrl, blob });
		} catch (err) {
			status = { text: err instanceof Error ? err.message : String(err), kind: 'error' };
		} finally {
			busy = false;
		}
	}

	$effect(() => {
		return () => {
			if (resultUrl) URL.revokeObjectURL(resultUrl);
			for (const u of urls) URL.revokeObjectURL(u);
		};
	});
</script>

<section class="studio card">
	<div class="studio-head">
		<div>
			<p class="label">Studio</p>
			<h1 class="studio-title">สร้างคอลลาจ</h1>
			<p class="studio-desc">เลือกรูป จัดลำดับ ใส่รายละเอียด แล้วเรนเดอร์ในเบราว์เซอร์</p>
		</div>
		<div class="count-sticker" aria-label={`เลือกแล้ว ${files.length} จาก ${MAX_FILES} รูป`}>
			<span class="count-sticker-n">{files.length}</span>
			<span class="count-sticker-l">/ {MAX_FILES} รูป</span>
		</div>
	</div>

	<div class="grid-2">
		<section class="panel">
			<p class="label section-label">01 · รูปของคุณ</p>
			<FileDrop count={files.length} ondrop={addFiles} />
			<PhotoGrid {urls} onremove={removeFile} onreorder={reorder} />
		</section>

		<section class="panel">
			<p class="label section-label">02 · รายละเอียด</p>

			<div class="field-group">
				<label class="label field-label" for="nameInput">ชื่อ</label>
				<input
					id="nameInput"
					class="input field"
					type="text"
					placeholder="ชื่อของคุณ"
					inputmode="text"
					autocomplete="name"
					bind:value={name}
				/>
			</div>

			<div class="field-group">
				<span class="label label-like" id="dateLabel">วันที่</span>
				<DatePicker value={date} onchange={(iso) => (date = iso)} />
			</div>

			<div class="field-group">
				<span class="label label-like">สไตล์</span>
				<ThemePicker {theme} {preset} ontheme={(t) => (theme = t)} onpreset={(p) => (preset = p)} />
			</div>

			<div class="create-bar">
				<button type="button" class="btn btn-acc btn-primary" disabled={busy} class:loading={busy} onclick={generate}>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 17l6-6-6-6"/><path d="M12 19h9"/></svg>
					{cta}
				</button>
				{#if status}
					<div class="status {status.kind}" role="status" aria-live="polite">{status.text}</div>
				{/if}
			</div>
		</section>
	</div>
</section>
