<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import HeatmapChart from './azuos-heatmap-chart.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosHeatmapChart',
    component: HeatmapChart,
    parameters: { layout: 'padded' },
  });

  const ROWS = ['Ana', 'Caio', 'Duda', 'Edu', 'Fabi', 'Gil', 'Hugo', 'Iara', 'João', 'Lia'];
  const COLUMNS = ['Aberto', 'Andando', 'Parado', 'Resolvido'];
  const DATA = {
    rows: ROWS,
    columns: COLUMNS,
    cells: ROWS.flatMap((row, rowIndex) =>
      COLUMNS.map((column, columnIndex) => ({ row, column, value: ((rowIndex + 2) * (columnIndex + 3)) % 17 })),
    ),
    seriesLabel: 'Chamados',
  };
</script>

<Story name="Default" args={{ data: DATA, ui: { heightClass: 'h-80' } }} />

<Story name="AnotherColour" args={{ data: DATA, ui: { heightClass: 'h-80', color: 'var(--chart-4)' } }} />

<Story name="Loading" args={{ data: DATA, state: { isLoading: true }, ui: { heightClass: 'h-80' } }} />

<Story name="Empty" args={{ data: { ...DATA, cells: [] }, ui: { heightClass: 'h-80', emptyLabel: 'Nenhum chamado no período' } }} />
