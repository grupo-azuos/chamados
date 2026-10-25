<script lang="ts" module>
  import type { ChartSlice } from '$lib/utils/chart-slice';
  import { formatCount, resolveColor, type ChartOption, type ChartTheme } from '$lib/utils/echarts.util';

  /**
   * RADAR — o PERFIL de um conjunto de categorias, de uma vez só.
   *
   * É o gráfico para "em que este parque dá problema", e não para "qual dá mais". A rosca
   * responderia a mesma pergunta em teoria, mas com nove ou dez categorias ela vira um anel
   * de fatias finas que só se lê pela legenda ao lado — e aí quem está lendo a legenda não
   * está olhando o desenho. O radar escreve o nome de cada categoria NO PRÓPRIO eixo: não há
   * legenda para consultar, e a forma da teia é reconhecível de longe.
   *
   * Onde ele NÃO serve, e por isso não é o gráfico padrão de nada:
   *
   *  - **Poucas categorias.** Com três eixos o radar vira um triângulo que não diz nada; a
   *    barra diz.
   *  - **Muitas categorias.** Passando de umas doze, os nomes em volta se encavalam.
   *  - **Ordenar.** "Quem é o maior" se lê em barra, na hora; num radar é preciso comparar
   *    distâncias até o centro.
   *
   * O valor de cada ponta continua no balão, ao passar o ponteiro, e na lista para leitor de
   * tela: a forma mostra o perfil, mas o número exato ninguém mede a olho num radar.
   */
  export type AzuosRadarChartProps = {
    data: {
      slices: ChartSlice[];
      /** O nome da série no balão — "Chamados: 8". */
      seriesLabel: string;
    };
    state?: { isLoading?: boolean };
    ui?: {
      emptyLabel?: string;
      className?: string;
      /** A cor da teia. @default 'var(--chart-1)' */
      color?: string;
      /** A altura da caixa de desenho. @default 'h-72' */
      heightClass?: string;
    };
    actions?: { onSelect?: (label: string) => void };
  };


  /**
   * Quantas categorias o radar comporta antes de os nomes se encavalarem em volta.
   *
   * Exportado para quem monta a tela poder decidir ANTES de desenhar: passando disso, o
   * gráfico certo é a barra deitada.
   */
  export const RADAR_MAX_SLICES = 12;

  /** Nome longo cortado no eixo; o nome inteiro continua no balão e na lista. */
  export function shortenAxis(label: string, max = 16): string {
    if (label.length <= max) return label;

    return `${label.slice(0, max - 1).trimEnd()}…`;
  }

  /** A teia: grade nos tons do tema, o nome de cada categoria no próprio eixo e a forma preenchida. */
  export function radarOption(
    slices: readonly ChartSlice[],
    seriesLabel: string,
    color: string,
    ui: { axisLabelMax: number },
    theme: Pick<ChartTheme, 'border' | 'muted'>,
  ): ChartOption {
    const top = Math.max(...slices.map((slice) => slice.value), 1);
    const stroke = resolveColor(color);

    return {
      tooltip: {
        trigger: 'item',
        formatter: () => slices.map((slice) => `${slice.label}: ${formatCount(slice.value)}`).join('<br/>'),
      },
      radar: {
        radius: '66%',
        indicator: slices.map((slice) => ({ name: shortenAxis(slice.label, ui.axisLabelMax), max: top })),
        axisName: { color: theme.muted, fontSize: 11 },
        splitLine: { lineStyle: { color: theme.border } },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: theme.border } },
      },
      series: [
        {
          type: 'radar',
          name: seriesLabel,
          symbolSize: 6,
          lineStyle: { color: stroke, width: 2 },
          itemStyle: { color: stroke },
          areaStyle: { color: stroke, opacity: 0.32 },
          data: [{ name: seriesLabel, value: slices.map((slice) => slice.value) }],
        },
      ],
    };
  }
</script>

<script lang="ts">
  import Echart from '$lib/components/azuos-echart/azuos-echart.svelte';
  import { useMediaQuery, XL_BREAKPOINT } from '$lib/hooks/use-media-query/use-media-query.svelte';
  import { cn } from '$lib/utils/cn';

  /* O prop precisa de outro nome aqui dentro: um binding local chamado `state` faz o
     compilador ler `$state(...)` como inscrição numa store `state`, em vez da rune. */
  let { data, state: chartState, ui, actions }: AzuosRadarChartProps = $props();

  const isMobile = useMediaQuery(XL_BREAKPOINT);
  const color = $derived(ui?.color ?? 'var(--chart-1)');
  /* No celular, nome mais enxuto em volta da teia: o cartão é estreito e o texto vazaria. */
  const axisLabelMax = $derived(isMobile.current ? 11 : 16);
</script>

{#if chartState?.isLoading}
  <div
    class={cn('bg-muted w-full animate-pulse rounded-box', ui?.heightClass ?? 'h-72', ui?.className)}
  ></div>
{:else if data.slices.length === 0}
  <p
    class={cn(
      'text-muted-foreground flex items-center justify-center text-center text-xs',
      ui?.heightClass ?? 'h-72',
      ui?.className,
    )}
  >
    {ui?.emptyLabel ?? 'Sem dados para mostrar'}
  </p>
{:else}
  <!-- `relative` pelo mesmo motivo do `ColumnChart`: a lista escondida abaixo é `sr-only`
       (`position: absolute`) e tem botões focáveis. Sem ancestral posicionado, tabular até
       eles rola a página para um lugar sem relação nenhuma com o gráfico. -->
  <div class={cn('relative flex w-full flex-col', ui?.className)}>
    <!-- O desenho é `role="img"` (a moldura): some com o conteúdo para o leitor de tela. Por isso
         a lista abaixo fica FORA dele. -->
    <Echart
      data={{
        option: (theme) => radarOption(data.slices, data.seriesLabel, color, { axisLabelMax }, theme),
        description: data.seriesLabel,
      }}
      ui={{ heightClass: ui?.heightClass ?? 'h-72' }}
    />

    <!-- O MESMO conteúdo do desenho, em texto: num radar ninguém mede o valor exato a olho,
         e quem usa leitor de tela ou só o teclado não tem desenho nenhum para olhar. -->
    <ul class="sr-only">
      <!-- A chave leva a POSIÇÃO junto com o rótulo: dois itens podem ter o mesmo nome, e
           chave repetida num `each` derruba a tela inteira em vez de só desenhar torto. -->
      {#each data.slices as slice, index (`${slice.label}-${index}`)}
        <li>
          {#if actions?.onSelect}
            <button
              type="button"
              aria-label="{slice.label}: {slice.value}"
              onclick={() => actions?.onSelect?.(slice.label)}
            >
              {slice.label}: {slice.value}
            </button>
          {:else}
            <span aria-label="{slice.label}: {slice.value}">{slice.label}: {slice.value}</span>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
{/if}
