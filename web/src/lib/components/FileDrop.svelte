<script lang="ts">
	import { ACCEPTED_TYPES, MAX_FILES } from '#lib/config';

	interface Props {
		count: number;
		ondrop: (files: File[]) => void;
	}

	const HEIC_TYPES = ['image/heic', 'image/heif'];

	let { count, ondrop }: Props = $props();
	let input = $state<HTMLInputElement | null>(null);
	let dragover = $state(false);
	let error = $state('');

	function accept(list: FileList | null) {
		if (!list) return [];
		const out: File[] = [];
		for (const f of Array.from(list)) {
			// iOS can hand over HEIC, or an empty type for files from the photo library.
			// The browser decodes HEIC in Safari, so let those through instead of dropping them.
			const byName = /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name);
			if (!ACCEPTED_TYPES.includes(f.type) && !(f.type === '' && byName) && !HEIC_TYPES.includes(f.type)) continue;
			out.push(f);
		}
		return out;
	}

	function handle(list: FileList | null) {
		error = '';
		const files = accept(list);
		if (!files.length) {
			error = 'รองรับเฉพาะ JPG, PNG และ WEBP';
			return;
		}
		const room = MAX_FILES - count;
		if (room <= 0) {
			error = `เลือกได้สูงสุด ${MAX_FILES} รูป`;
			return;
		}
		ondrop(files.slice(0, room));
		if (files.length > room) error = `เพิ่มได้อีก ${room} รูป (สูงสุด ${MAX_FILES})`;
	}

	function onInput(e: Event) {
		const t = e.currentTarget as HTMLInputElement;
		handle(t.files);
		t.value = '';
	}
</script>

<div
	class="upload-zone"
	class:dragover
	role="presentation"
	ondragover={(e) => {
		e.preventDefault();
		dragover = true;
	}}
	ondragleave={() => (dragover = false)}
	ondrop={(e) => {
		e.preventDefault();
		dragover = false;
		handle(e.dataTransfer?.files ?? null);
	}}
>
	<input bind:this={input} type="file" accept="image/jpeg,image/png,image/webp" multiple onchange={onInput} />
	<div class="upload-icon">
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
	</div>
	<div class="upload-text">ลากหรือกดเพื่อเลือกรูป</div>
	<div class="upload-hint">JPG · PNG · WEBP — ไม่เกิน {MAX_FILES} รูป</div>
	{#if error}<div class="upload-error">{error}</div>{/if}
</div>