<script lang="ts" module>
  import { colorOfSlice, type ChartSlice } from '$lib/utils/chart-slice';
  import { formatCount, resolveColor, type ChartOption, type ChartTheme } from '$lib/utils/echarts.util';

  /**
   * Barra — para comparar quantidades entre categorias (por tipo, por pessoa, por máquina).
   *
   * O desenho vem do ECharts (pela moldura `AzuosEchart`): é ele que dá eixo que se ajusta ao dado,
   * barra que cresce animada e balão de valor. O que este componente acrescenta é o que o projeto
   * exige e a biblioteca não tem:
   *
   *  1. **Cor por categoria** (`chart-slice`), a mesma em todo gráfico do sistema.
   *  2. **O valor escrito em cada barra**, no lugar de obrigar a estimar pela altura.
   *  3. **Uma lista só para leitor de tela e teclado** — o desenho é SVG, e SVG não se
   *     tabula nem se lê. É por ela que a pessoa que não usa o mouse chega ao detalhamento.
   *  4. **Deitado** (`orientation: 'horizontal'`) quando o rótulo é nome de gente ou de
   *     máquina: em pé, nome longo vira leque ilegível — mais ainda na tela do celular.
   */
  export type AzuosColumnChartProps = {
    data: {
      slices: ChartSlice[];
      /** O nome da série no balão — "Chamados: 8". Mesmo motivo da rosca. */
      seriesLabel: string;
    };
    state?: { isLoading?: boolean };
    ui?: {
      emptyLabel?: string;
      /** @default 'vertical' */
      orientation?: 'vertical' | 'horizontal';
      className?: string;
      /**
       * UMA cor para todas as barras — para a série no tempo, em que cada barra é a mesma
       * medida e cor por barra inventaria categorias que não existem.
       */
      color?: string;
    };
    actions?: { onSelect?: (label: string) => void };
  };

  /**
   * A ALTURA DE UMA LINHA do gráfico deitado, e a altura mínima do desenho.
   *
   * Deitado, o gráfico não tem altura própria: ele divide a que recebe pelo número de barras.
   * Com uma barra só numa caixa de 256 px, essa barra vira um BLOCO de 256 px de altura —
   * um retângulo gigante que não se lê como gráfico nenhum.
   *
   * Por isso aqui a altura vem do CONTEÚDO: cada barra ganha uma linha de tamanho fixo, como
   * numa tabela. Uma barra dá um cartão curto; quinze dão um cartão alto, que quem usa rola.
   */
  const ROW_HEIGHT = 38;
  const MIN_HORIZONTAL_HEIGHT = 96;

  /** A altura que o desenho deitado precisa ter para caber estas barras. */
  export function horizontalHeightOf(count: number): number {
    return Math.max(MIN_HORIZONTAL_HEIGHT, count * ROW_HEIGHT);
  }

  /**
   * Rótulo longo cortado NO EIXO — o nome inteiro continua no balão e na lista.
   *
   * Exportada para ter teste próprio: cortar no lugar errado é como "CONTABIL-01" e
   * "CONTABIL-02" viram duas barras com o mesmo nome na tela.
   */
  export function shorten(label: string, max = 14): string {
    if (label.length <= max) return label;

    /* `trimEnd`: cortar bem no espaço deixaria "Departamento …", com um buraco antes das
       reticências que parece erro de digitação. */
    return `${label.slice(0, max - 1).trimEnd()}…`;
  }

  /** Quanto do nome cabe no eixo: deitado sobra largura; em pé o nome vai inclinado. */
  const HORIZONTAL_LABEL_MAX = 22;
  const VERTICAL_LABEL_MAX = 14;

  /** A cor única, quando quem chama pediu uma; senão a cor da categoria. */
  function colorOf(slice: ChartSlice, index: number, color: string | undefined): string {
    return color ? resolveColor(color) : colorOfSlice(slice.label, index);
  }

  function tooltipOf(seriesLabel: string) {
    return (params: unknown) => {
      const { name, value } = params as { name: string; value: number };

      return `<b>${name}</b><br/>${seriesLabel}: ${formatCount(value)}`;
    };
  }

  /**
   * As barras do gráfico, em pé ou deitadas: o valor escrito em cada barra, o nome no eixo
   * (cortado; o inteiro fica no balão e na lista), o maior em cima quando deitado.
   */
  export function columnOption(
    data: AzuosColumnChartProps['data'],
    ui: AzuosColumnChartProps['ui'],
    theme: Pick<ChartTheme, 'foreground' | 'muted'>,
  ): ChartOption {
    const isHorizontal = ui?.orientation === 'horizontal';
    const category = {
      type: 'category' as const,
      data: data.slices.map((slice) => slice.label),
      inverse: isHorizontal,
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: {
        color: theme.muted,
        fontSize: 11,
        interval: 0,
        rotate: isHorizontal ? 0 : 30,
        formatter: (label: string) => shorten(label, isHorizontal ? HORIZONTAL_LABEL_MAX : VERTICAL_LABEL_MAX),
      },
    };
    const value = { type: 'value' as const, show: false };

    return {
      grid: isHorizontal
        ? { top: 4, right: 48, bottom: 4, left: 8, containLabel: true }
        : { top: 24, right: 12, bottom: 4, left: 12, containLabel: true },
      tooltip: { trigger: 'item', formatter: tooltipOf(data.seriesLabel) },
      xAxis: isHorizontal ? value : category,
      yAxis: isHorizontal ? category : value,
      series: [
        {
          type: 'bar',
          name: data.seriesLabel,
          barMaxWidth: isHorizontal ? 16 : 36,
          itemStyle: { borderRadius: isHorizontal ? [0, 6, 6, 0] : [4, 4, 0, 0] },
          label: {
            show: true,
            position: isHorizontal ? 'right' : 'top',
            color: theme.foreground,
            fontSize: 11,
            fontWeight: 600,
            formatter: ({ value: count }) => formatCount(Number(count)),
          },
          data: data.slices.map((slice, index) => ({
            value: slice.value,
            itemStyle: { color: colorOf(slice, index, ui?.color) },
          })),
        },
      ],
    };
  }
</script>

<script lang="ts">
  import Echart from '$lib/components/azuos-echart/azuos-echart.svelte';
  import { cn } from '$lib/utils/cn';

  /* O prop precisa de outro nome aqui dentro: um binding local chamado `state` faz o
     compilador ler `$state(...)` como inscrição numa store `state`, em vez da rune. */
  let { data, state: chartState, ui, actions }: AzuosColumnChartProps = $props();

  const isHorizontal = $derived(ui?.orientation === 'horizontal');
</script>

{#if chartState?.isLoading}
  <div class="bg-muted h-full w-full animate-pulse rounded-box"></div>
{:else if data.slices.length === 0}
  <p class="text-muted-foreground flex h-full items-center justify-center text-xs">
    {ui?.emptyLabel ?? 'Sem dados para mostrar'}
  </p>
{:else}
  <!-- `relative`: a lista escondida lá embaixo é `sr-only`, que é `position: absolute`, e ela
       tem BOTÕES — quem navega por teclado chega neles. Sem um ancestral posicionado, eles se
       ancoram num elemento distante, e tabular até eles faz a página rolar para um lugar que
       não tem nada a ver com o gráfico. -->
  <div
    class={cn('relative flex w-full flex-col', isHorizontal ? 'h-auto' : 'h-full', ui?.className)}
  >
    <!-- O desenho é `role="img"` (a moldura): some com o conteúdo para o leitor de tela. Por isso
         a lista abaixo fica FORA dele. -->
    <Echart
      data={{ option: (theme) => columnOption(data, ui, theme), description: data.seriesLabel }}
      ui={{
        heightClass: isHorizontal ? 'w-full' : 'min-h-0 flex-1',
        scrollHeight: isHorizontal ? horizontalHeightOf(data.slices.length) : undefined,
      }}
      actions={{ onSelect: actions?.onSelect ? (selection) => actions?.onSelect?.(selection.name) : undefined }}
    />

    <!-- O MESMO conteúdo do desenho, em texto: é por aqui que quem usa leitor de tela ou só o
         teclado lê os números e chega ao detalhamento. Fica escondido dos olhos porque para
         quem enxerga o gráfico já diz tudo isso. -->
    <ul class="sr-only">
      <!-- A chave leva a POSIÇÃO junto com o rótulo. Dois itens podem ter o mesmo nome — duas
           máquinas com o mesmo apelido, dois departamentos escritos igual — e chave repetida
           num `each` não desenha torto: ela DERRUBA a tela inteira. Nenhum gráfico vale uma
           tela em branco. -->
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
