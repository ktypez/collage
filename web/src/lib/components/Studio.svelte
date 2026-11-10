<script lang="ts">
	import { MAX_FILES } from '#lib/config';
	import { loadImages, renderCollage, canvasToBlob, makePreview } from '#lib/collage/render';
	import { defaultPreset, type DayPreset, type ThemeId } from '#lib/collage/themes';
	import { quotaLeftText, quotaRemainingText, quotaWaitText, UPLOAD_QUOTA } from '#lib/quota';
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
		/** LINE ID token sent with the upload — /api/collage refuses anonymous sends. */
		getIdToken?: () => string | null;
	}

	let { cta = 'สร้างคอลลาจ', onresult, upload = true, getIdToken }: Props = $props();

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

	/** Last quota answer from the server, kept so a reload doesn't lose it. */
	const QUOTA_NOTE_KEY = 'collage_quota_left';
	const QUOTA_BLOCKED_KEY = 'collage_quota_blocked';
	let quotaNote = $state<{ left: number; at: number } | null>(null);
	let quotaBlockedUntil = $state<number | null>(null);

	// The stable LINE user id lives in the ID token (`sub`). Scoping the cache by
	// it stops two accounts on the same device from inheriting each other's count.
	function quotaUserSub(): string | null {
		const token = getIdToken?.() ?? null;
		if (!token) return null;
		try {
			const part = token.split('.')[1];
			if (!part) return null;
			const json = atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '='));
			const sub = (JSON.parse(json) as { sub?: unknown }).sub;
			return typeof sub === 'string' && sub ? sub : null;
		} catch {
			return null;
		}
	}

	function scopedKey(base: string, sub: string | null): string | null {
		return sub ? `${base}:${sub}` : null;
	}

	/** A saved count is only shown while it could still be true. */
	function freshQuotaNote(value: unknown): { left: number; at: number } | null {
		const note = value as { left?: unknown; at?: unknown } | null;
		if (typeof note?.left !== 'number' || typeof note?.at !== 'number') return null;
		return Date.now() - note.at < UPLOAD_QUOTA.windowMs ? { left: note.left, at: note.at } : null;
	}

	function saveQuotaNote(left: number) {
		quotaNote = { left, at: Date.now() };
		const key = scopedKey(QUOTA_NOTE_KEY, quotaUserSub());
		if (!key) return;
		try {
			localStorage.setItem(key, JSON.stringify(quotaNote));
		} catch {
			// Private-mode storage can refuse writes; never fail a sent collage
			// because a note could not be remembered.
		}
	}

	function clearQuotaNote() {
		quotaNote = null;
		const key = scopedKey(QUOTA_NOTE_KEY, quotaUserSub());
		if (key) localStorage.removeItem(key);
	}

	function saveQuotaBlocked(until: number) {
		quotaBlockedUntil = until;
		const key = scopedKey(QUOTA_BLOCKED_KEY, quotaUserSub());
		if (!key) return;
		try {
			localStorage.setItem(key, String(until));
		} catch {
			// Remembering the block is a best-effort cache, not the source of truth.
		}
	}

	function clearQuotaBlocked() {
		quotaBlockedUntil = null;
		const key = scopedKey(QUOTA_BLOCKED_KEY, quotaUserSub());
		if (key) localStorage.removeItem(key);
	}

	$effect(() => {
		const sub = quotaUserSub();
		if (!sub) return;
		const noteKey = scopedKey(QUOTA_NOTE_KEY, sub);
		const blockedKey = scopedKey(QUOTA_BLOCKED_KEY, sub);
		if (!noteKey || !blockedKey) return;

		const raw = localStorage.getItem(noteKey);
		if (raw) {
			let note: { left: number; at: number } | null = null;
			try {
				note = freshQuotaNote(JSON.parse(raw));
			} catch {
				// A half-written value must not break the studio.
			}
			// Anything older than the window is dropped rather than shown as current.
			if (note) quotaNote = note;
			else localStorage.removeItem(noteKey);
		}

		const until = Number(localStorage.getItem(blockedKey));
		if (Number.isFinite(until) && until > Date.now()) quotaBlockedUntil = until;
		else localStorage.removeItem(blockedKey);
	});

	// Hide the note once the window it counted has passed, without a reload.
	$effect(() => {
		const note = quotaNote;
		if (!note) return;
		const timer = setTimeout(clearQuotaNote, Math.max(0, note.at + UPLOAD_QUOTA.windowMs - Date.now()));
		return () => clearTimeout(timer);
	});

	// Drop a cached 429 block the moment it expires so the next attempt can go through.
	$effect(() => {
		const until = quotaBlockedUntil;
		if (!until) return;
		const timer = setTimeout(() => {
			if (quotaBlockedUntil === until) clearQuotaBlocked();
		}, Math.max(0, until - Date.now()));
		return () => clearTimeout(timer);
	});

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
		const blockedUntil = quotaBlockedUntil;
		if (blockedUntil && blockedUntil > Date.now()) {
			status = { text: quotaWaitText(String(Math.ceil((blockedUntil - Date.now()) / 1000))), kind: 'error' };
			return;
		}
		busy = true;
		// Uploads left in the quota window, as of the last send — shown so the
		// limit is visible before it bites, not only in the 429.
		let left: number | null = null;
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
				const token = getIdToken?.() ?? null;
				if (!token) throw new Error('เซสชัน LINE หมดอายุ กรุณาเข้าสู่ระบบใหม่');

				const fd = new FormData();
				fd.append('image', blob, 'collage.jpg');
				fd.append('preview', await canvasToBlob(await makePreview(canvas), 0.92), 'collage-preview.jpg');
				const res = await fetch('/api/collage', {
					method: 'POST',
					body: fd,
					headers: { authorization: `Bearer ${token}` },
				});
				if (res.status === 401) throw new Error('เซสชัน LINE หมดอายุ กรุณาเข้าสู่ระบบใหม่');
				// the quota is per user, so tell them how long until their next slot
				if (res.status === 429) {
					const retryAfter = res.headers.get('retry-after');
					const seconds = Number(retryAfter);
					if (Number.isFinite(seconds) && seconds > 0) {
						saveQuotaBlocked(Date.now() + Math.ceil(seconds) * 1000);
					}
					clearQuotaNote();
					throw new Error(quotaWaitText(retryAfter));
				}
				const data = await res.json().catch(() => ({ success: false, error: 'เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง' }));
				if (!data.success) throw new Error(data.error || 'เกิดข้อผิดพลาด ไม่ทราบสาเหตุ');
				imageUrl = data.imageUrl;
				previewUrl = data.previewUrl ?? imageUrl;
				if (typeof data.remaining === 'number') {
					left = data.remaining;
					saveQuotaNote(data.remaining);
				}
			}

			status = { text: left === null ? 'สำเร็จแล้ว' : quotaLeftText(left), kind: 'success' };
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
				{#if quotaNote}
					<p class="quota-note">{quotaRemainingText(quotaNote.left)}</p>
				{/if}
			</div>
		</section>
	</div>
</section>
