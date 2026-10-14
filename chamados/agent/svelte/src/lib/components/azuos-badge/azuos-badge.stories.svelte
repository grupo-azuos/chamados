<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AzuosBadge from './azuos-badge.svelte';

	const { Story } = defineMeta({
		title: 'Components/AzuosBadge',
		component: AzuosBadge
	});
</script>

<Story name="Default">
	{#snippet children()}
		padrão
	{/snippet}
</Story>

<Story name="Online" args={{ ui: { tone: 'online' } }}>
	{#snippet children()}
		ao vivo
	{/snippet}
</Story>

<Story name="Offline" args={{ ui: { tone: 'offline' } }}>
	{#snippet children()}
		desconectado
	{/snippet}
</Story>

<Story name="Custom Class" args={{ ui: { tone: 'online', class: 'text-xs px-3 py-1 font-bold' } }}>
	{#snippet children()}
		personalizado
	{/snippet}
</Story>

<Story name="Empty Text (edge case)" args={{ ui: { tone: 'online' } }}>
	{#snippet children()}
		{''}
	{/snippet}
</Story>

<Story name="Long Text (edge case)">
	{#snippet children()}
		Rótulo excessivamente longo para validar layout
	{/snippet}
</Story>
