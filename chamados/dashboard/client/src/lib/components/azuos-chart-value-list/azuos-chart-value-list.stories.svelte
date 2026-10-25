<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import ChartValueList from './azuos-chart-value-list.svelte';

  /* A lista é `sr-only`: na história ela não aparece — só o leitor de tela a encontra. */
  const { Story } = defineMeta({
    title: 'Components/AzuosChartValueList',
    component: ChartValueList,
  });
</script>

<Story name="Default" args={{ data: { slices: [{ label: 'Rede', value: 1240 }, { label: 'Impressora', value: 310 }] } }} />

<Story name="Empty" args={{ data: { slices: [] } }} />
