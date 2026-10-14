<script lang="ts">
	interface Props {
		value: string;
		onchange: (iso: string) => void;
	}

	let { value, onchange }: Props = $props();

	const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
	const DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

	let open = $state(false);
	let year = $state(new Date().getFullYear());
	let month = $state(new Date().getMonth());
	let wrap = $state<HTMLDivElement | null>(null);

	const pad = (n: number) => String(n).padStart(2, '0');
	const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

	const label = $derived.by(() => {
		if (!value) return 'วัน/เดือน/ปี';
		const d = new Date(value + 'T00:00:00');
		if (Number.isNaN(d.getTime())) return 'วัน/เดือน/ปี';
		return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
	});

	const todayISO = $derived.by(() => {
		const n = new Date();
		return toISO(n.getFullYear(), n.getMonth(), n.getDate());
	});

	/** 6×7 grid starting on Sunday of the week containing the 1st. */
	const days = $derived.by(() => {
		const first = new Date(year, month, 1);
		const start = new Date(first);
		start.setDate(1 - first.getDay());
		return Array.from({ length: 42 }, (_, i) => {
			const d = new Date(start);
			d.setDate(start.getDate() + i);
			return {
				day: d.getDate(),
				iso: toISO(d.getFullYear(), d.getMonth(), d.getDate()),
				out: d.getMonth() !== month,
			};
		});
	});

	function pick(iso: string) {
		onchange(iso);
		open = false;
	}

	function shift(delta: number) {
		month += delta;
		if (month < 0) {
			month = 11;
			year--;
		} else if (month > 11) {
			month = 0;
			year++;
		}
	}

	$effect(() => {
		if (!open) return;
		const onDocClick = (e: MouseEvent) => {
			if (wrap && !wrap.contains(e.target as Node)) open = false;
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') open = false;
		};
		document.addEventListener('click', onDocClick);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('click', onDocClick);
			document.removeEventListener('keydown', onKey);
		};
	});
</script>

<div class="date-wrap" bind:this={wrap}>
	<button
		type="button"
		class="input date-trigger"
		aria-haspopup="dialog"
		aria-expanded={open}
		onclick={() => (open = !open)}
	>
		<span class:placeholder={!value}>{label}</span>
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
	</button>

	{#if open}
		<div class="date-popup" role="dialog" aria-label="เลือกวันที่">
			<div class="cal-head">
				<button type="button" class="cal-nav" aria-label="เดือนก่อนหน้า" onclick={() => shift(-1)}>‹</button>
				<div class="cal-title">{TH_MONTHS[month]} {year + 543}</div>
				<button type="button" class="cal-nav" aria-label="เดือนถัดไป" onclick={() => shift(1)}>›</button>
			</div>
			<div class="cal-dow" aria-hidden="true">
				{#each DOW as d}<span>{d}</span>{/each}
			</div>
			<div class="cal-grid">
				{#each days as d (d.iso)}
					<button
						type="button"
						class="cal-day"
						class:is-out={d.out}
						class:is-today={d.iso === todayISO}
						class:is-selected={d.iso === value}
						onclick={() => pick(d.iso)}
					>
						{d.day}
					</button>
				{/each}
			</div>
			<button type="button" class="cal-today" onclick={() => { year = new Date().getFullYear(); month = new Date().getMonth(); pick(todayISO); }}>วันนี้</button>
		</div>
	{/if}
</div>