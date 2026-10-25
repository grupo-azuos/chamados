<script lang="ts" module>
  import { formatCount, type ChartOption, type ChartTheme } from '$lib/utils/echarts.util';

  /**
   * CALENDÁRIO DE CALOR — quantas coisas caem em cada dia, mês a mês (o "estilo GitHub").
   *
   * É o gráfico do PICO: uma semana carregada salta aos olhos como uma mancha escura. Cada
   * quadradinho é um dia; dia sem nada fica na cor da trilha, não some. **Um ano no computador,
   * quatro meses no celular**: doze meses numa tela de 360px dariam quadradinhos de 5px.
   */
  export type CalendarDay = { date: string; count: number };

  export type AzuosCalendarChartProps = {
    data: {
      days: readonly CalendarDay[];
      /** O nome do que se conta, no plural e em minúscula: "vencimentos". */
      seriesLabel: string;
      /** O primeiro dia mostrado (`aaaa-mm-dd`). @default o primeiro dia do mês atual */
      from?: string;
    };
    state?: { isLoading?: boolean };
    ui?: { emptyLabel?: string };
  };

  const DESKTOP_MONTHS = 12;
  const MOBILE_MONTHS = 4;
  /** Abaixo disto é celular — o mesmo corte do menu de baixo. */
  const MOBILE_BREAKPOINT = 768;

  /** Do mais claro ao mais forte: a escala vai do amarelo ao vermelho. */
  export const HEAT_COLORS = ['#fde68a', '#fbbf24', '#f97316', '#dc2626'];

  export function firstDayOfMonth(today: Date): string {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  }

  /** O intervalo `[de, até]` de `months` meses inteiros a partir de `from`. */
  export function calendarRange(from: string, months: number): [string, string] {
    const [year = 1970, month = 1] = from.split('-').map(Number);
    const last = new Date(Date.UTC(year, month - 1 + months, 0));

    return [from, last.toISOString().slice(0, 10)];
  }

  export function calendarOption(
    days: readonly CalendarDay[],
    range: [string, string],
    seriesLabel: string,
    theme: Pick<ChartTheme, 'track' | 'surface' | 'muted'>,
  ): ChartOption {
    const top = Math.max(...days.map((day) => day.count), 1);

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const [date = '', count = 0] = (params as { value: [string, number] }).value;
          const [year, month, day] = date.split('-');

          return `<b>${day}/${month}/${year}</b><br/>${formatCount(count)} ${seriesLabel}`;
        },
      },
      visualMap: { show: false, min: 1, max: top, inRange: { color: HEAT_COLORS }, outOfRange: { color: theme.track } },
      calendar: {
        range,
        top: 22,
        left: 28,
        right: 4,
        bottom: 4,
        cellSize: ['auto', 'auto'],
        splitLine: { show: false },
        itemStyle: { color: theme.track, borderColor: theme.surface, borderWidth: 3, borderRadius: 4 },
        yearLabel: { show: false },
        dayLabel: { firstDay: 0, nameMap: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'], color: theme.muted, fontSize: 10 },
        monthLabel: {
          nameMap: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
          color: theme.muted,
          fontSize: 11,
        },
      },
      series: [
        {
          type: 'heatmap',
          coordinateSystem: 'calendar',
          itemStyle: { borderColor: theme.surface, borderWidth: 3, borderRadius: 4 },
          data: days.map((day) => [day.date, day.count]),
        },
      ],
    };
  }

  export { MOBILE_BREAKPOINT };
</script>

<script lang="ts">
  import Echart from '$lib/components/azuos-echart/azuos-echart.svelte';
  import { useMediaQuery } from '$lib/hooks/use-media-query/use-media-query.svelte';

  let { data, state: chartState, ui }: AzuosCalendarChartProps = $props();

  const isMobile = useMediaQuery(MOBILE_BREAKPOINT);
  const range = $derived(
    calendarRange(data.from ?? firstDayOfMonth(new Date()), isMobile.current ? MOBILE_MONTHS : DESKTOP_MONTHS),
  );
  const total = $derived(data.days.reduce((sum, day) => sum + day.count, 0));
</script>

<div class="flex flex-col gap-2">
  <Echart
    data={{
      option: (theme) => calendarOption(data.days, range, data.seriesLabel, theme),
      description: `${formatCount(total)} ${data.seriesLabel} entre ${range[0]} e ${range[1]}`,
    }}
    ui={{ heightClass: isMobile.current ? 'h-44' : 'h-48', emptyLabel: ui?.emptyLabel }}
    state={{ isLoading: chartState?.isLoading, isEmpty: data.days.length === 0 }}
  />
  {#if data.days.length > 0 && !chartState?.isLoading}
    <!-- A escala escrita ("Menos … Mais"): a cor não pode ser o único jeito de ler o quadro. -->
    <div class="text-muted-foreground flex items-center justify-end gap-1 text-xs">
      <span>Menos</span>
      {#each HEAT_COLORS as color (color)}
        <span class="size-3 rounded-chip" style="background-color: {color}" aria-hidden="true"></span>
      {/each}
      <span>Mais</span>
    </div>
  {/if}
</div>
