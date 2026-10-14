<script lang="ts">
	import AzuosTooltip, { type AzuosTooltipProps } from './azuos-tooltip.svelte';

	let {
		text = 'Dica rápida',
		ui,
		hasContent = false,
		triggerText = 'Passe o mouse'
	}: {
		text?: string;
		ui?: AzuosTooltipProps['ui'];
		hasContent?: boolean;
		triggerText?: string;
	} = $props();
</script>

<AzuosTooltip data={{ text }} {ui}>
	<span>{triggerText}</span>
	{#snippet content()}
		{#if hasContent}
			<span data-testid="tooltip-custom-content">Conteúdo Rico</span>
		{/if}
	{/snippet}
</AzuosTooltip>
