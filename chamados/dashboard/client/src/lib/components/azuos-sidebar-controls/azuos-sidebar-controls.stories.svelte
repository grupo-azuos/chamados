<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import AppShell from '$lib/components/azuos-app-shell/azuos-app-shell.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosSidebarControls',
    component: AppShell,
  });
</script>

<Story name="Expanded">
  {#snippet template()}
    <AppShell><p>Arraste a borda para recolher o menu.</p></AppShell>
  {/snippet}
</Story>
<Story name="Collapsed">
  {#snippet template()}
    <AppShell initialSidebarOpen={false}><p>Arraste a borda para expandir o menu.</p></AppShell>
  {/snippet}
</Story>
