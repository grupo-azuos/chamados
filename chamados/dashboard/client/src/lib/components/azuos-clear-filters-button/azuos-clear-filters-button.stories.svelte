<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import ClearFiltersButton from './azuos-clear-filters-button.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosClearFiltersButton',
    component: ClearFiltersButton,
    parameters: { layout: 'padded' },
  });

  const actions = { onClear: () => {} };
</script>

<Story name="Default" args={{ state: { hasFilter: true }, actions }} />

<!-- Caso limite: sem filtro ligado, o botão não aparece. -->
<Story name="Sem filtro" args={{ state: { hasFilter: false }, actions }} />
