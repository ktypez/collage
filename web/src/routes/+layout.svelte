<script lang="ts">
	import '@mcky/ui/core.css';
	import '../app.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

{@render children()}
