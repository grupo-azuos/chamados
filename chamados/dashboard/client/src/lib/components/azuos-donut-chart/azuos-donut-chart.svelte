<!--
  @component
  Rosca — para mostrar como um todo se divide (situação, tipo de problema, departamento).

  O anel vem do ECharts (pela moldura `AzuosEchart`), limpo — sem número escrito em cima da fatia:
  valor e porcentagem aparecem na legenda e, ao passar o mouse, no balão. O resto é o que o projeto
  exige e a biblioteca não traz:

  1. **Legenda ao lado, com o nome escrito**, o valor e a porcentagem. Cor sozinha não é informação
     para quem não distingue cor (ver `chart-slice`).
  2. **O total no MEIO do anel**, que poupa a soma de cabeça.
  3. **Clique abre o detalhamento** (`actions.onSelect`) — tanto na fatia quanto na legenda. O
     gráfico é o caminho para a lista, não um enfeite: é assim que alguém sai de "42 em andamento"
     para "quais 42".

  Props: `data` traz as fatias e o nome da série; `state.isLoading` mostra o carregando; `ui` traz o
  texto do vazio; `actions.onSelect` recebe o nome da fatia clicada.
-->
<script lang="ts" module>
  import { colorOfSlice, type ChartSlice } from '$lib/utils/chart-slice';
  import { formatCount, type ChartOption, type ChartTheme } from '$lib/utils/echarts.util';

  export type AzuosDonutChartProps = {
    data: {
      slices: ChartSlice[];
      /** O nome da SÉRIE: aparece no balão ("Status: 10") e embaixo do total, no meio. */
      seriesLabel: string;
    };
    state?: { isLoading?: boolean };
    ui?: { emptyLabel?: string; className?: string };
    actions?: { onSelect?: (label: string) => void };
  };

  /**
   * O anel: fatias separadas por um fio da cor do cartão (sem ele, dois tons próximos encostam e
   * viram uma fatia só), sem número escrito em cima — valor e porcentagem estão na legenda e no balão.
   */
  export function donutOption(
    slices: readonly ChartSlice[],
    seriesLabel: string,
    theme: Pick<ChartTheme, 'surface'>,
  ): ChartOption {
    const total = slices.reduce((sum, slice) => sum + slice.value, 0);

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const { name, value } = params as { name: string; value: number };

          return `<b>${name}</b><br/>${seriesLabel}: ${formatCount(value)} (${percentOf(value, total)}%)`;
        },
      },
      series: [
        {
          type: 'pie',
          name: seriesLabel,
          radius: ['62%', '100%'],
          padAngle: 1,
          itemStyle: { borderColor: theme.surface, borderWidth: 2 },
          label: { show: false },
          emphasis: { scaleSize: 4 },
          data: slices.map((slice, index) => ({
            name: slice.label,
            value: slice.value,
            itemStyle: { color: colorOfSlice(slice.label, index) },
          })),
        },
      ],
    };
  }

  /** A porcentagem inteira de uma fatia. Total zero não vira divisão por zero. */
  export function percentOf(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }
</script>

<script lang="ts">
  import Echart from '$lib/components/azuos-echart/azuos-echart.svelte';
  import { cn } from '$lib/utils/cn';

  /* O prop precisa de outro nome aqui dentro: um binding local chamado `state` faz o
     compilador ler `$state(...)` como inscrição numa store `state`, em vez da rune. */
  let { data, state: chartState, ui, actions }: AzuosDonutChartProps = $props();

  const total = $derived(data.slices.reduce((sum, slice) => sum + slice.value, 0));
  const colors = $derived(data.slices.map((slice, index) => colorOfSlice(slice.label, index)));
</script>

{#if chartState?.isLoading}
  <div class="bg-muted h-full w-full animate-pulse rounded-box"></div>
{:else if data.slices.length === 0}
  <p class="text-muted-foreground flex h-full items-center justify-center text-xs">
    {ui?.emptyLabel ?? 'Sem dados para mostrar'}
  </p>
{:else}
  <!-- No celular o anel vai EM CIMA e a legenda embaixo: lado a lado, numa tela de 360px,
       sobrava um anel do tamanho de uma moeda e uma legenda com os nomes cortados. -->
  <div class={cn('flex h-full flex-col gap-3 sm:flex-row sm:items-center sm:gap-4', ui?.className)}>
    <!-- Quadrado próprio para a rosca: sem ele, a legenda ao lado empurra o centro do anel
         para fora do meio visual do cartão, e o total sobreposto fica desalinhado. -->
    <div class="relative mx-auto aspect-square h-40 shrink-0 sm:h-full">
      <Echart
        data={{ option: (theme) => donutOption(data.slices, data.seriesLabel, theme), description: `${data.seriesLabel}: ${formatCount(total)} no total` }}
        ui={{ heightClass: 'h-full' }}
        actions={{ onSelect: actions?.onSelect ? (selection) => actions?.onSelect?.(selection.name) : undefined }}
      />

      <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span class="text-foreground text-xl leading-tight font-bold">
          {formatCount(total)}
        </span>
        <span class="text-muted-foreground text-xs tracking-wide uppercase">
          {data.seriesLabel}
        </span>
      </div>
    </div>

    <!-- `self-stretch`: sem isso a lista fica `items-center` do pai, que dá a ela só a
         própria altura de conteúdo — e com treze fatias o `overflow-y-auto` nunca entra em
         ação, e a lista extravasa o cartão por baixo. -->
    <!-- `overflow-x-hidden` é OBRIGATÓRIO ao lado do `overflow-y-auto`, e não enfeite: pelo
         CSS, pedir rolagem num eixo transforma o outro em `auto` sozinho. Sem ele, qualquer
         nome um pouco largo demais dava barra de rolagem HORIZONTAL na legenda — e ninguém
         rola uma legenda para o lado. -->
    <ul class="min-h-0 min-w-0 flex-1 space-y-2.5 self-stretch overflow-x-hidden overflow-y-auto pr-1">
      <!-- A chave leva a POSIÇÃO junto com o rótulo: dois itens podem ter o mesmo nome, e
           chave repetida num `each` derruba a tela inteira em vez de só desenhar torto. -->
      {#each data.slices as slice, index (`${slice.label}-${index}`)}
        {@const color = colors[index]}
        {@const percent = percentOf(slice.value, total)}
        <li>
          <!-- Botão SÓ quando há para onde ir: um `<button>` que não leva a lugar nenhum
               aparece na tabulação e no leitor de tela como se levasse. -->
          {#if actions?.onSelect}
            <button
              type="button"
              onclick={() => actions?.onSelect?.(slice.label)}
              class="hover:bg-muted rounded-chip flex w-full cursor-pointer items-center gap-2 px-1 py-0.5 text-left text-xs"
            >
              {@render row(slice, color, percent)}
            </button>
          {:else}
            <div class="flex w-full items-center gap-2 rounded-chip px-1 py-0.5 text-left text-xs">
              {@render row(slice, color, percent)}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
{/if}

{#snippet row(slice: ChartSlice, color: string | undefined, percent: number)}
  <span
    class="size-2 shrink-0 rounded-full"
    style="background-color: {color}"
    aria-hidden="true"
  ></span>
  <span class="text-muted-foreground w-20 shrink-0 truncate" title={slice.label}>
    {slice.label}
  </span>
  <!-- Barrinha de proporção — não é `ProgressBar` (esse componente é pra "quanto já foi
       cumprido de uma obrigação"). Aqui a cor tem que ser a mesma do ponto e da fatia: é a
       identidade da categoria, não uma leitura de "bom ou ruim". -->
  <span class="bg-muted h-1.5 min-w-8 flex-1 overflow-hidden rounded-full">
    <span
      class="block h-full rounded-full"
      style="width: {percent}%; background-color: {color}"
    ></span>
  </span>
  <span class="text-foreground shrink-0 font-semibold">{formatCount(slice.value)}</span>
  <span class="text-muted-foreground w-9 shrink-0 text-right">{percent}%</span>
{/snippet}
