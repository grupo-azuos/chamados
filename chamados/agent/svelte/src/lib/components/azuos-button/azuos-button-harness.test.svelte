<script lang="ts">
	import AzuosButton, { type AzuosButtonProps } from './azuos-button.svelte';

	let { events, ui }: AzuosButtonProps = $props();
</script>

<AzuosButton {events} {ui}>
	{#snippet children()}
		Abrir Dashboard
	{/snippet}
</AzuosButton>
