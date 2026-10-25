<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import StackedBarChart from './azuos-stacked-bar-chart.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosStackedBarChart',
    component: StackedBarChart,
    parameters: { layout: 'padded' },
  });

  const SERIES = [
    { key: 'done', label: 'Resolvido', color: 'var(--chart-2)' },
    { key: 'open', label: 'Aberto', color: 'var(--chart-4)' },
  ];
  const CATEGORIES = ['Rede', 'Impressora', 'Acesso', 'E-mail', 'Sistema', 'Telefone', 'Hardware', 'Backup'].map(
    (label, index) => ({ label, values: { done: 20 - index, open: 4 + (index % 3) } }),
  );
</script>

<Story name="Default" args={{ data: { categories: CATEGORIES, series: SERIES, seriesLabel: 'Tipos' }, ui: { heightClass: 'h-72' } }} />

<Story name="Loading" args={{ data: { categories: [], series: SERIES, seriesLabel: 'Tipos' }, state: { isLoading: true } }} />

<Story name="Empty" args={{ data: { categories: [], series: SERIES, seriesLabel: 'Tipos' }, ui: { emptyLabel: 'Nenhum tipo no período' } }} />
