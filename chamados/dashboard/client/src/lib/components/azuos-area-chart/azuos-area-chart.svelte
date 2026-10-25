<script lang="ts" module>
  import { resolveColor, type ChartOption, type ChartTheme } from '$lib/utils/echarts.util';
  import { dayLabel, hourLabel, type TimePoint, type TimeRow, type TimeSeriesDef } from '$lib/utils/time-series';

  /**
   * ÁREA — o volume de alguma coisa ao longo do tempo.
   *
   * Área, e não barra: aqui a pergunta é "quando subiu e por quanto tempo ficou lá", e a
   * resposta é a FORMA da curva. Trinta barras de meio pixel não desenham forma nenhuma.
   *
   * Duas formas de empilhar, e a escolha muda o que o gráfico responde:
   *
   *  - **`overlap`** (o padrão): as séries se sobrepõem, cada uma lida na própria altura. É o
   *    que se quer quando elas são a MESMA medida em coisas diferentes — processador, memória
   *    e disco, todos de 0 a 100%. Empilhar daria 240% de nada.
   *  - **`stack`**: uma em cima da outra, e a altura total é a soma. É o que se quer quando
   *    elas são PARTES de um todo — quantos chamados de cada tipo entraram no dia.
   */
  export type AzuosAreaChartProps = {
    data: { points: readonly TimePoint[]; series: readonly TimeSeriesDef[] };
    state?: { isLoading?: boolean };
    ui?: {
      emptyLabel?: string;
      className?: string;
      /** @default 'overlap' */
      layout?: 'overlap' | 'stack';
      /** A régua do eixo do tempo. @default 'day' */
      tick?: 'hour' | 'day';
      /** Trava a escala em 0–100 — para quando o dado É porcentagem. */
      isPercent?: boolean;
      /** A altura da caixa de desenho. @default 'h-48' */
      heightClass?: string;
    };
  };

  /**
   * As áreas: grade só na horizontal, eixo do tempo com a régua curta (hora ou dia) e cada série
   * na sua cor. Sobrepostas, deixam ver a de baixo; empilhadas, a cor cheia lê melhor. Em
   * porcentagem, a escala trava em 0–100 com FOLGA em cima: sem ela, um pico de 100% encosta na
   * borda e parece cortado.
   */
  export function areaOption(
    rows: readonly TimeRow[],
    series: readonly TimeSeriesDef[],
    ui: AzuosAreaChartProps['ui'],
    theme: Pick<ChartTheme, 'border' | 'muted'>,
  ): ChartOption {
    const formatTick = ui?.tick === 'hour' ? hourLabel : dayLabel;
    const isStacked = ui?.layout === 'stack';

    return {
      grid: { top: 8, right: 8, bottom: 0, left: 0, containLabel: true },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: rows.map((row) => formatTick(row.at)),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: theme.muted, hideOverlap: true },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: theme.muted },
        splitLine: { lineStyle: { color: theme.border, opacity: 0.5 } },
        ...(ui?.isPercent ? { min: 0, max: 105, interval: 25 } : {}),
      },
      series: series.map((item) => {
        const color = resolveColor(item.color);

        return {
          type: 'line' as const,
          name: item.label,
          smooth: true,
          symbol: 'none',
          stack: isStacked ? 'total' : undefined,
          lineStyle: { color, width: 2 },
          itemStyle: { color },
          areaStyle: { color, opacity: isStacked ? 0.85 : 0.18 },
          data: rows.map((row) => Number(row[item.key] ?? 0)),
        };
      }),
    };
  }
</script>

<script lang="ts">
  import ChartLegend from '$lib/components/azuos-chart-legend/azuos-chart-legend.svelte';
  import Echart from '$lib/components/azuos-echart/azuos-echart.svelte';
  import { cn } from '$lib/utils/cn';
  import { toTimeRows } from '$lib/utils/time-series';

  let { data, state: chartState, ui }: AzuosAreaChartProps = $props();

  const rows = $derived(toTimeRows(data.points, data.series));
</script>

{#if chartState?.isLoading}
  <div class={cn('bg-muted w-full animate-pulse rounded-box', ui?.heightClass ?? 'h-48')}></div>
{:else if rows.length === 0}
  <p class={cn('text-muted-foreground py-12 text-center text-sm', ui?.className)}>
    {ui?.emptyLabel ?? 'Sem leituras no período.'}
  </p>
{:else}
  <div class={cn('flex flex-col gap-2', ui?.className)}>
    <ChartLegend data={{ series: data.series }} />

    <Echart
      data={{
        option: (theme) => areaOption(rows, data.series, ui, theme),
        description: data.series.map((item) => item.label).join(', '),
      }}
      ui={{ heightClass: ui?.heightClass ?? 'h-48' }}
    />
  </div>
{/if}
