<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import TreemapChart from './azuos-treemap-chart.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosTreemapChart',
    component: TreemapChart,
    parameters: { layout: 'padded' },
  });

  /* Uma categoria grande e uma cauda longa de pequenas — o caso para o qual o treemap existe. */
  const SLICES = [
    { label: 'Contábil', value: 320 },
    { label: 'Financeiro', value: 82 },
    { label: 'Fiscal', value: 51 },
    ...Array.from({ length: 40 }, (_, index) => ({ label: `Setor ${index + 1}`, value: 40 - index })),
  ];
</script>

<Story name="Default" args={{ data: { slices: SLICES, seriesLabel: 'Chamados' }, ui: { heightClass: 'h-80' } }} />

<Story name="FewBlocks" args={{ data: { slices: SLICES, seriesLabel: 'Chamados' }, ui: { heightClass: 'h-80', maxItems: 5 } }} />

<Story name="Loading" args={{ data: { slices: [], seriesLabel: 'Chamados' }, state: { isLoading: true }, ui: { heightClass: 'h-80' } }} />

<Story name="Empty" args={{ data: { slices: [], seriesLabel: 'Chamados' }, ui: { heightClass: 'h-80', emptyLabel: 'Nenhum setor' } }} />
