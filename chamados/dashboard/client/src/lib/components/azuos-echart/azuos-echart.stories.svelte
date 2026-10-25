<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import Echart from './azuos-echart.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosEchart',
    component: Echart,
    parameters: { layout: 'padded' },
  });

  const OPTION = {
    xAxis: { type: 'category' as const, data: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'] },
    yAxis: { type: 'value' as const },
    series: [{ type: 'bar' as const, data: [12, 18, 9, 22, 15] }],
  };
</script>

<Story name="Default" args={{ data: { option: OPTION, description: 'Chamados por dia' }, ui: { heightClass: 'h-64' } }} />

<!-- Desenho mais alto que a caixa: a caixa vira janela e o desenho rola. -->
<Story
  name="Scrolling"
  args={{ data: { option: OPTION, description: 'Chamados por dia' }, ui: { heightClass: 'h-40', scrollHeight: 480 } }}
/>

<Story name="Loading" args={{ data: { option: OPTION, description: 'x' }, state: { isLoading: true }, ui: { heightClass: 'h-64' } }} />

<Story
  name="Empty"
  args={{ data: { option: OPTION, description: 'x' }, state: { isEmpty: true }, ui: { heightClass: 'h-64', emptyLabel: 'Nenhum chamado no período' } }}
/>
