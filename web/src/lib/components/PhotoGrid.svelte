<script lang="ts">
	interface Props {
		urls: string[];
		onremove: (idx: number) => void;
		onreorder: (from: number, to: number) => void;
	}

	let { urls, onremove, onreorder }: Props = $props();

	let dragIdx = $state<number | null>(null);
	let overIdx = $state<number | null>(null);
	let touchIdx = $state<number | null>(null);
	let touchTimer: ReturnType<typeof setTimeout> | null = null;

	function commitTouch(i: number) {
		if (touchTimer) {
			clearTimeout(touchTimer);
			touchTimer = null;
		}
		if (touchIdx !== null && touchIdx !== i) onreorder(touchIdx, i);
		touchIdx = null;
	}

	$effect(() => () => {
		if (touchTimer) clearTimeout(touchTimer);
	});
</script>

{#if urls.length}
	<div class="preview-grid">
		{#each urls as url, i (i)}
			<div
				class="preview-item"
				class:dragging={dragIdx === i || touchIdx === i}
				class:dragover-item={overIdx === i && dragIdx !== i}
				draggable="true"
				role="listitem"
				aria-label={`รูปที่ ${i + 1}`}
				ondragstart={(e) => {
					dragIdx = i;
					e.dataTransfer?.setData('text/plain', String(i));
					if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
				}}
				ondragend={() => {
					dragIdx = null;
					overIdx = null;
				}}
				ondragover={(e) => {
					e.preventDefault();
					overIdx = i;
				}}
				ondragleave={() => {
					if (overIdx === i) overIdx = null;
				}}
				ondrop={(e) => {
					e.preventDefault();
					const from = Number(e.dataTransfer?.getData('text/plain'));
					overIdx = null;
					dragIdx = null;
					if (!Number.isNaN(from) && from !== i) onreorder(from, i);
				}}
				ontouchstart={() => {
					touchTimer = setTimeout(() => (touchIdx = i), 400);
				}}
				ontouchmove={() => {
					if (touchTimer) {
						clearTimeout(touchTimer);
						touchTimer = null;
					}
				}}
				ontouchend={() => commitTouch(i)}
			>
				<img src={url} alt={`รูปที่ ${i + 1}`} />
				<div class="preview-num">{i + 1}</div>
				<button
					type="button"
					class="preview-remove"
					aria-label={`ลบรูปที่ ${i + 1}`}
					onclick={(e) => {
						e.stopPropagation();
						onremove(i);
					}}>×</button
				>
			</div>
		{/each}
	</div>
{/if}