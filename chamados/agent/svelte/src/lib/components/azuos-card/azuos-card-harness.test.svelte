<script lang="ts">
	import AzuosCard, { type AzuosCardProps } from './azuos-card.svelte';

	let { data, ui }: AzuosCardProps = $props();
</script>

<AzuosCard {data} {ui}>
	{#snippet children()}
		<p>42%</p>
	{/snippet}
</AzuosCard>
