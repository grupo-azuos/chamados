<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import ProgressRing from './azuos-progress-ring.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosProgressRing',
    component: ProgressRing,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default" args={{ data: { done: 7, total: 10 } }} />

<Story name="Done" args={{ data: { done: 12, total: 12 }, ui: { size: 'lg' } }} />

<Story name="Behind" args={{ data: { done: 1, total: 10 } }} />

<!-- Caso limite: nada a cumprir — cinza e "—", não 0% vermelho. -->
<Story name="NothingToDeliver" args={{ data: { done: 0, total: 0 } }} />
