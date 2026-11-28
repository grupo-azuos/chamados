<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import CollapsibleFilters from './azuos-collapsible-filters.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosCollapsibleFilters',
    component: CollapsibleFilters,
    parameters: { layout: 'padded' },
  });

  const actions = { onClear: () => {} };
</script>

{#snippet search()}
  <TextField data={{ label: 'Buscar', name: 'search', value: '', placeholder: 'Descrição da peça' }} actions={{ onChange: () => {} }} />
{/snippet}

{#snippet more()}
  <TextField data={{ label: 'Categoria', name: 'category', value: '' }} actions={{ onChange: () => {} }} />
{/snippet}

<!-- Fechado: a busca e o botão "Filtros". -->
<Story name="Default">
  <CollapsibleFilters data={{ label: 'Filtros', activeCount: 0 }} state={{ hasFilter: false }} {actions} primary={search}>
    {@render more()}
  </CollapsibleFilters>
</Story>

<!-- Com filtro escondido valendo: nasce aberto, com a contagem e o "Limpar filtros". -->
<Story name="Com filtro">
  <CollapsibleFilters data={{ label: 'Filtros', activeCount: 1 }} state={{ hasFilter: true }} {actions} primary={search}>
    {@render more()}
  </CollapsibleFilters>
</Story>

<!-- Caso limite: só a busca, sem o que esconder — não há botão "Filtros". -->
<Story name="Só a busca">
  <CollapsibleFilters data={{ label: 'Filtros', activeCount: 0 }} state={{ hasFilter: false }} {actions} primary={search} />
</Story>
