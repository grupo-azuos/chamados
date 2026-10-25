<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import SankeyChart from './azuos-sankey-chart.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosSankeyChart',
    component: SankeyChart,
    parameters: { layout: 'padded' },
  });

  const DATA = {
    nodes: [
      { id: 'type:Rede', label: 'Rede', color: '#3b82f6' },
      { id: 'type:Impressora', label: 'Impressora', color: '#8b5cf6' },
      { id: 'owner:Ana', label: 'Ana', color: '#10b981' },
      { id: 'owner:Caio', label: 'Caio', color: '#06b6d4' },
      { id: 'stage:Resolvido', label: 'Resolvido', color: '#047857' },
      { id: 'stage:Aberto', label: 'Aberto', color: '#b45309' },
    ],
    links: [
      { from: 'type:Rede', to: 'owner:Ana', value: 12 },
      { from: 'type:Rede', to: 'owner:Caio', value: 4 },
      { from: 'type:Impressora', to: 'owner:Caio', value: 9 },
      { from: 'owner:Ana', to: 'stage:Resolvido', value: 10 },
      { from: 'owner:Ana', to: 'stage:Aberto', value: 2 },
      { from: 'owner:Caio', to: 'stage:Resolvido', value: 5 },
      { from: 'owner:Caio', to: 'stage:Aberto', value: 8 },
    ],
    seriesLabel: 'Chamados',
  };
</script>

<Story name="Default" args={{ data: DATA, ui: { heightClass: 'h-80' } }} />

<Story name="Loading" args={{ data: DATA, state: { isLoading: true }, ui: { heightClass: 'h-80' } }} />

<Story name="Empty" args={{ data: { ...DATA, links: [] }, ui: { heightClass: 'h-80', emptyLabel: 'Nenhum chamado no período' } }} />
