<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AzuosTooltip from './azuos-tooltip.svelte';
	import AzuosButton from '../azuos-button/azuos-button.svelte';

	const { Story } = defineMeta({
		title: 'Components/AzuosTooltip',
		component: AzuosTooltip
	});
</script>

<Story name="Default">
	<AzuosTooltip data={{ text: 'Informações rápidas ao passar o mouse' }}>
		<AzuosButton ui={{ variant: 'ghost', size: 'sm' }}>Passe o mouse</AzuosButton>
	</AzuosTooltip>
</Story>

<Story name="Bottom Position">
	<AzuosTooltip data={{ text: 'Exibido abaixo do elemento' }} ui={{ side: 'bottom' }}>
		<AzuosButton ui={{ variant: 'outline', size: 'sm' }}>Posição Inferior</AzuosButton>
	</AzuosTooltip>
</Story>

<Story name="Rich Content">
	<AzuosTooltip>
		<AzuosButton ui={{ variant: 'secondary', size: 'sm' }}>Conteúdo Rico</AzuosButton>
		{#snippet content()}
			<div class="p-1 text-xs">
				<p class="font-bold">Dica Detalhada</p>
				<p class="text-muted-foreground">Suporte a múltiplos elementos HTML internos.</p>
			</div>
		{/snippet}
	</AzuosTooltip>
</Story>

<Story name="Long Text (edge case)">
	<AzuosTooltip
		data={{
			text: 'Texto de ajuda muito longo para validar como o tooltip se comporta com largura máxima e quebra de linha em telas compactas.'
		}}
	>
		<AzuosButton ui={{ size: 'sm' }}>Texto Longo</AzuosButton>
	</AzuosTooltip>
</Story>

<Story name="Empty Text (edge case)">
	<AzuosTooltip data={{ text: '' }}>
		<AzuosButton ui={{ variant: 'outline', size: 'sm' }}>Sem Texto</AzuosButton>
	</AzuosTooltip>
</Story>
