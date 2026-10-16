<script lang="ts">
	import {
		DAYS,
		DAY_LABELS,
		SWATCHES,
		THEME_IDS,
		THEME_LABELS,
		THEME_SUBS,
		THEME_PREVIEW,
		type DayPreset,
		type ThemeId,
	} from '#lib/collage/themes';

	interface Props {
		theme: ThemeId;
		preset: DayPreset;
		ontheme: (t: ThemeId) => void;
		onpreset: (p: DayPreset) => void;
	}

	let { theme, preset, ontheme, onpreset }: Props = $props();

	let previewOpen = $state(false);

	const todayLabel = $derived(DAY_LABELS[new Date().getDay()]);
	const previewSrc = $derived(`/previews/${THEME_PREVIEW[theme]}`);
	const previewCap = $derived(THEME_LABELS[theme]);
	const showDayPicker = $derived(theme === '7days');
</script>

<div class="theme-chip-row" role="radiogroup" aria-label="สไตล์">
	{#each THEME_IDS as id (id)}
		<button
			type="button"
			class="ochip"
			class:active={theme === id}
			role="radio"
			aria-checked={theme === id}
			onclick={() => ontheme(id)}
		>
			{THEME_LABELS[id]}
			<span class="osub">{THEME_SUBS[id]}</span>
		</button>
	{/each}
</div>

{#if showDayPicker}
	<div class="theme-block">
		<div class="theme-grid" role="radiogroup" aria-label="สีตามวันในสัปดาห์">
			{#each DAYS as d (d)}
				<button
					type="button"
					class="theme-btn"
					class:active={preset === d}
					role="radio"
					aria-checked={preset === d}
					aria-label={DAY_LABELS[DAYS.indexOf(d)]}
					title={DAY_LABELS[DAYS.indexOf(d)]}
					style={`background:${SWATCHES[d]}`}
					onclick={() => onpreset(d)}
				></button>
			{/each}
		</div>
		<div class="theme-label">today: <strong>{todayLabel}</strong></div>
	</div>
{/if}

<div class="theme-preview" class:open={previewOpen}>
	<button
		type="button"
		class="theme-preview-head"
		aria-expanded={previewOpen}
		onclick={() => (previewOpen = !previewOpen)}
	>
		<span>ตัวอย่าง output</span>
		<span class="cap">{previewCap}</span>
		<span class="chev" aria-hidden="true">▼</span>
	</button>
	{#if previewOpen}
		<div class="theme-preview-body"><img src={previewSrc} alt="ตัวอย่าง output สไตล์ {previewCap}" /></div>
	{/if}
</div>
