<script lang="ts" module>
  import type { ChartSlice } from '$lib/utils/chart-slice';

  /**
   * Os valores de um gráfico em TEXTO, só para leitor de tela.
   *
   * Um desenho não se lê em voz alta: sem esta lista, quem usa leitor de tela ouve "imagem" e
   * nada mais. Fica escondida da vista (`sr-only`) — quem enxerga já tem o rótulo no gráfico.
   */
  export type AzuosChartValueListProps = {
    data: { slices: readonly ChartSlice[] };
  };
</script>

<script lang="ts">
  import { formatCount } from '$lib/utils/echarts.util';

  let { data }: AzuosChartValueListProps = $props();
</script>

{#if data.slices.length > 0}
  <ul class="sr-only">
    <!-- A chave leva a POSIÇÃO junto com o rótulo: nome repetido num `each` derruba a tela. -->
    {#each data.slices as slice, index (`${slice.label}-${index}`)}
      <li>{slice.label}: {formatCount(slice.value)}</li>
    {/each}
  </ul>
{/if}
