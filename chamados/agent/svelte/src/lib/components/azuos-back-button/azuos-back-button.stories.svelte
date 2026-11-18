<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AzuosBackButton from './azuos-back-button.svelte';

	const { Story } = defineMeta({
		title: 'Components/AzuosBackButton',
		component: AzuosBackButton
	});
</script>

<Story name="Default" args={{ data: { destination: 'o painel' } }} />

<Story name="Label" args={{ data: { label: 'Voltar ao início' } }} />

<Story name="Disabled" args={{ data: { destination: 'o painel' }, state: { isDisabled: true } }} />

<Story
	name="Long destination"
	args={{ data: { destination: 'o painel de desempenho desta máquina' } }}
/>
