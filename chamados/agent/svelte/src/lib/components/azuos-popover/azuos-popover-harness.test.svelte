<script lang="ts">
	import AzuosPopover, { type AzuosPopoverProps } from './azuos-popover.svelte';

	let {
		title = 'Detalhes',
		description = 'Mais informações',
		ui,
		hasContent = true,
		triggerText = 'Abrir painel'
	}: {
		title?: string;
		description?: string;
		ui?: AzuosPopoverProps['ui'];
		hasContent?: boolean;
		triggerText?: string;
	} = $props();
</script>

<AzuosPopover data={{ title, description }} {ui}>
	<span>{triggerText}</span>
	{#snippet content()}
		{#if hasContent}
			<div data-testid="popover-content">Conteúdo interno</div>
		{/if}
	{/snippet}
</AzuosPopover>
