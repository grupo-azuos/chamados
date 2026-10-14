<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AzuosSeparator from './azuos-separator.svelte';

	const { Story } = defineMeta({
		title: 'Components/AzuosSeparator',
		component: AzuosSeparator
	});
</script>

<Story name="Horizontal">
	<div class="max-w-sm space-y-2 p-4">
		<p class="text-sm font-medium">Seção Superior</p>
		<AzuosSeparator />
		<p class="text-muted-foreground text-xs">Seção Inferior</p>
	</div>
</Story>

<Story name="Vertical">
	<div class="flex h-6 items-center gap-3 p-4">
		<span class="text-sm">Início</span>
		<AzuosSeparator ui={{ orientation: 'vertical' }} />
		<span class="text-sm">Meio</span>
		<AzuosSeparator ui={{ orientation: 'vertical' }} />
		<span class="text-sm">Fim</span>
	</div>
</Story>

<Story name="Custom Styling (edge case)">
	<div class="max-w-sm space-y-2 p-4">
		<p class="text-sm">Separador com cor de destaque</p>
		<AzuosSeparator ui={{ class: 'bg-primary/50' }} />
	</div>
</Story>
