<script lang="ts">
	import AzuosBadge, { type AzuosBadgeProps } from './azuos-badge.svelte';

	let { ui, text = 'rótulo' }: AzuosBadgeProps & { text?: string } = $props();
</script>

<AzuosBadge {ui}>
	{#snippet children()}
		{text}
	{/snippet}
</AzuosBadge>
