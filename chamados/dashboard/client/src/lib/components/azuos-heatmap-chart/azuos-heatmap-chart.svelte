<script lang="ts" module>
  import { formatCount, resolveColor, shortenLabel, type ChartOption, type ChartTheme } from '$lib/utils/echarts.util';

  /**
   * MAPA DE CALOR — o cruzamento de duas dimensões, de uma vez.
   *
   * É o gráfico do GARGALO: "quem está com mais coisa parada" é a célula mais escura da coluna
   * "Parado", e se lê sem somar nada. O número vem ESCRITO na célula; a cor só reforça. Passou da
   * altura do quadro, as linhas ROLAM dentro dele. Clicar numa célula entrega a linha e a coluna.
   */
  export type HeatmapCell = { row: string; column: string; value: number };

  export type AzuosHeatmapChartProps = {
    data: {
      rows: readonly string[];
      columns: readonly string[];
      cells: readonly HeatmapCell[];
      seriesLabel: string;
    };
    state?: { isLoading?: boolean };
    ui?: {
      emptyLabel?: string;
      heightClass?: string;
      /** A cor da célula mais cheia. @default 'var(--primary)' */
      color?: string;
    };
    actions?: { onSelect?: (cell: { row: string; column: string }) => void };
  };

  /** A altura de cada linha, e a faixa de cima onde ficam os nomes das colunas. */
  export const ROW_HEIGHT = 34;
  export const HEADER_HEIGHT = 36;

  /** Toda combinação linha × coluna, com zero onde não veio célula: o buraco se lê como "zero". */
  export function cellsOf(data: Pick<AzuosHeatmapChartProps['data'], 'rows' | 'columns' | 'cells'>): HeatmapCell[] {
    const values = new Map(data.cells.map((cell) => [`${cell.row}\u0000${cell.column}`, cell.value]));

    return data.rows.flatMap((row) =>
      data.columns.map((column) => ({ row, column, value: values.get(`${row}\u0000${column}`) ?? 0 })),
    );
  }

  export function heatmapOption(
    data: AzuosHeatmapChartProps['data'],
    color: string,
    theme: Pick<ChartTheme, 'track' | 'surface' | 'muted' | 'foreground'>,
  ): ChartOption {
    const top = Math.max(...data.cells.map((cell) => cell.value), 1);

    return {
      grid: { top: HEADER_HEIGHT, right: 4, bottom: 4, left: 4, containLabel: true },
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const cell = (params as { data: { row: string; column: string; value: [number, number, number] } }).data;

          return `<b>${cell.row}</b><br/>${cell.column}: ${formatCount(cell.value[2])}`;
        },
      },
      xAxis: {
        type: 'category',
        position: 'top',
        data: [...data.columns],
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: theme.muted, fontSize: 11, interval: 0 },
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: [...data.rows],
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: theme.foreground, fontSize: 11, formatter: (label: string) => shortenLabel(label, 18) },
      },
      visualMap: { show: false, min: 0, max: top, dimension: 2, inRange: { color: [theme.track, resolveColor(color)] } },
      series: [
        {
          type: 'heatmap',
          name: data.seriesLabel,
          itemStyle: { borderColor: theme.surface, borderWidth: 3, borderRadius: 6 },
          label: {
            show: true,
            fontSize: 11,
            fontWeight: 600,
            formatter: (params: unknown) => {
              const value = (params as { data: { value: [number, number, number] } }).data.value[2];

              return value === 0 ? '' : formatCount(value);
            },
          },
          data: cellsOf(data).map((cell) => ({
            row: cell.row,
            column: cell.column,
            value: [data.columns.indexOf(cell.column), data.rows.indexOf(cell.row), cell.value],
            /* Texto claro na célula escura e escuro na clara: com uma cor só, metade some. */
            label: { color: cell.value > top * 0.55 ? '#ffffff' : theme.foreground },
          })),
        },
      ],
    };
  }
</script>

<script lang="ts">
  import Echart from '$lib/components/azuos-echart/azuos-echart.svelte';

  let { data, state: chartState, ui, actions }: AzuosHeatmapChartProps = $props();

  const color = $derived(ui?.color ?? 'var(--primary)');
</script>

<Echart
  data={{
    option: (theme) => heatmapOption(data, color, theme),
    description: `${data.seriesLabel}: ${data.rows.length} linhas por ${data.columns.length} colunas`,
  }}
  ui={{
    heightClass: ui?.heightClass ?? 'h-72',
    emptyLabel: ui?.emptyLabel,
    scrollHeight: data.rows.length * ROW_HEIGHT + HEADER_HEIGHT,
  }}
  state={{ isLoading: chartState?.isLoading, isEmpty: data.cells.length === 0 }}
  actions={{
    onSelect: actions?.onSelect
      ? (selection) => {
          if (selection.row && selection.column) actions?.onSelect?.({ row: selection.row, column: selection.column });
        }
      : undefined,
  }}
/>
