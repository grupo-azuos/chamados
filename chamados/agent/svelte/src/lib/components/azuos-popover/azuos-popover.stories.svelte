<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AzuosPopover from './azuos-popover.svelte';
	import AzuosButton from '../azuos-button/azuos-button.svelte';

	const { Story } = defineMeta({
		title: 'Components/AzuosPopover',
		component: AzuosPopover
	});
</script>

<Story name="Default">
	<AzuosPopover
		data={{
			title: 'Sobre o Agente',
			description: 'Informações de telemetria e versão'
		}}
	>
		{#snippet children()}
			<AzuosButton ui={{ variant: 'outline', size: 'sm' }}>Abrir Popover</AzuosButton>
		{/snippet}
		{#snippet content()}
			<div class="space-y-1 p-2 text-xs">
				<p>Versão: 1.0.0</p>
				<p>Status: Operacional</p>
			</div>
		{/snippet}
	</AzuosPopover>
</Story>

<Story name="Side Top">
	<AzuosPopover data={{ title: 'Dica Superior' }} ui={{ side: 'top', align: 'center' }}>
		{#snippet children()}
			<AzuosButton ui={{ variant: 'secondary', size: 'sm' }}>Abrir Acima</AzuosButton>
		{/snippet}
		{#snippet content()}
			<p class="p-2 text-xs">Aberto acima do elemento disparador.</p>
		{/snippet}
	</AzuosPopover>
</Story>

<Story name="Side Right">
	<AzuosPopover data={{ title: 'Painel Lateral' }} ui={{ side: 'right', align: 'start' }}>
		{#snippet children()}
			<AzuosButton ui={{ variant: 'ghost', size: 'sm' }}>Abrir à Direita</AzuosButton>
		{/snippet}
		{#snippet content()}
			<p class="p-2 text-xs">Exibido alinhado ao lado direito.</p>
		{/snippet}
	</AzuosPopover>
</Story>

<Story name="Content Only">
	<AzuosPopover>
		{#snippet children()}
			<AzuosButton ui={{ size: 'sm' }}>Sem Cabeçalho</AzuosButton>
		{/snippet}
		{#snippet content()}
			<div class="p-3 text-xs">
				<p class="font-medium">Conteúdo direto</p>
				<p class="text-muted-foreground">Sem título nem descrição no cabeçalho.</p>
			</div>
		{/snippet}
	</AzuosPopover>
</Story>

<Story name="Long Content (edge case)">
	<AzuosPopover
		data={{
			title: 'Termos e Condições Extensos',
			description: 'Descrição longa para testar capacidade do container'
		}}
		ui={{ class: 'max-w-xs' }}
	>
		{#snippet children()}
			<AzuosButton ui={{ variant: 'destructive', size: 'sm' }}>Conteúdo Longo</AzuosButton>
		{/snippet}
		{#snippet content()}
			<div class="text-muted-foreground space-y-1 p-2 text-xs">
				<p>
					Texto detalhado de múltiplos parágrafos para validar scrolling ou quebra de linha interna.
				</p>
			</div>
		{/snippet}
	</AzuosPopover>
</Story>
