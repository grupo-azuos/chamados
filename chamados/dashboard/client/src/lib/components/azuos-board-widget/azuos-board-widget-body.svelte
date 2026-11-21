<script lang="ts" module>
  import { type Widget } from '@template/shared/schemas/dashboard-board.schema';

  import { type WidgetState } from '$lib/hooks/use-dashboard-board/use-dashboard-board.svelte';
  import { type BoardItem } from '$lib/utils/widget-items.util';

  /**
   * O DESENHO DE UM BLOCO — um por tipo; trocar o gráfico é trocar o ramo daqui. Com
   * `actions.onOpenItem`, o item clicado (barra, fatia, linha, card) vira o recorte da lista.
   */
  export type AzuosBoardWidgetBodyProps = {
    data: { widget: Widget; result: WidgetState };
    actions: { onOpenItem?: (widget: Widget, item: BoardItem) => void };
  };
</script>

<script lang="ts">
  import Hash from '@lucide/svelte/icons/hash';
  import { DATA_SOURCES, widgetIsClickable } from '@template/shared/schemas/dashboard-board.schema';

  import AreaChart from '$lib/components/azuos-area-chart/azuos-area-chart.svelte';
  import CalendarChart from '$lib/components/azuos-calendar-chart/azuos-calendar-chart.svelte';
  import ColumnChart from '$lib/components/azuos-column-chart/azuos-column-chart.svelte';
  import DashboardHeroCard from '$lib/components/azuos-dashboard-hero-card/azuos-dashboard-hero-card.svelte';
  import DonutChart from '$lib/components/azuos-donut-chart/azuos-donut-chart.svelte';
  import Echart from '$lib/components/azuos-echart/azuos-echart.svelte';
  import HeatmapChart from '$lib/components/azuos-heatmap-chart/azuos-heatmap-chart.svelte';
  import RadarChart from '$lib/components/azuos-radar-chart/azuos-radar-chart.svelte';
  import RadialChart from '$lib/components/azuos-radial-chart/azuos-radial-chart.svelte';
  import SankeyChart from '$lib/components/azuos-sankey-chart/azuos-sankey-chart.svelte';
  import StackedBarChart from '$lib/components/azuos-stacked-bar-chart/azuos-stacked-bar-chart.svelte';
  import StatCard from '$lib/components/azuos-stat-card/azuos-stat-card.svelte';
  import TreemapChart from '$lib/components/azuos-treemap-chart/azuos-treemap-chart.svelte';
  import { type AzuosCardHue, cardToneClasses } from '$lib/utils/card-tone.util';
  import { cn } from '$lib/utils/cn';
  import { formatCount, resolveColor } from '$lib/utils/echarts.util';
  import { themeColor } from '$lib/utils/theme-color.util';
  import {
    countRingOption,
    cumulativeOption,
    groupedOption,
    paretoOption,
    pieOption,
    toHeatmap,
    toSankey,
    toStacked,
  } from '$lib/utils/widget-chart.util';
  import { hasDrillTarget } from '$lib/utils/board-drill.util';
  import { cellItemOf, itemOfLabel, sankeyItemOf, statItemOf, timeItemOf } from '$lib/utils/widget-items.util';
  import { calendarDaysOf, timePointsOf } from '$lib/utils/widget-view.util';

  let { data, actions }: AzuosBoardWidgetBodyProps = $props();

  /* Os tons dos cards, um por grupo — o grupo se distingue pelo nome e pelo ícone, não só pela cor. */
  const STAT_HUES: AzuosCardHue[] = ['blue', 'green', 'yellow', 'plum'];
  const RING_TONE: AzuosCardHue = 'blue';

  const widget = $derived(data.widget);
  const result = $derived(data.result);
  const series = $derived(result.data?.series ?? []);
  const cells = $derived(result.data?.cells ?? []);
  const slices = $derived(series.map((item) => ({ label: item.label, value: item.value })));
  const isLoading = $derived(result.isLoading && !result.data);
  const noun = $derived(DATA_SOURCES[widget.source].noun);
  const total = $derived(result.data?.total ?? 0);
  const grandTotal = $derived(result.data?.grandTotal ?? 0);

  /**
   * O clique num item, quando o bloco o promete: os itens escolhidos como clicáveis (o padrão),
   * uma lista da fonte para abrir e alguém para abri-la. Montando o painel, ou com os itens não
   * clicáveis, o bloco fica de leitura — sem mãozinha.
   */
  const onItem = $derived(
    actions.onOpenItem && widgetIsClickable(widget) && hasDrillTarget(widget.source)
      ? (item: BoardItem) => actions.onOpenItem?.(widget, item)
      : undefined,
  );
  const selectByLabel = $derived(onItem ? (label: string) => onItem(itemOfLabel(series, label)) : undefined);

  /* Sem agrupar, um card com o total; agrupando, um card por grupo, até quatro. */
  const statCards = $derived(
    widget.groupBy ? slices.slice(0, 4) : [{ label: widget.title, value: total }],
  );
</script>

{#snippet statRow(cards: { label: string; value: number }[], className: string, cardClassName: string)}
  <!-- A linha mede o espaço DELA (`@container`), e não a tela: no painel largo, todos lado a
       lado; na pré-visualização do editor, dois por linha. As colunas são as dos cards que há
       (até quatro): com quatro colunas fixas, dois cards num bloco largo deixavam um buraco. -->
  <div
    class={cn('@container', className)}
    style:--stat-columns={Math.max(1, Math.min(cards.length, 4))}
    style:--stat-columns-narrow={Math.max(1, Math.min(cards.length, 2))}
  >
    <div
      class="grid h-full grid-cols-[repeat(var(--stat-columns-narrow),minmax(0,1fr))] gap-3 @3xl:grid-cols-[repeat(var(--stat-columns),minmax(0,1fr))]"
    >
      {#each cards as card, index (card.label)}
        <StatCard
          data={{ label: card.label, value: card.value.toLocaleString('pt-BR') }}
          ui={{ tone: STAT_HUES[index % STAT_HUES.length], icon: Hash, className: cn('h-full p-4', cardClassName) }}
          actions={{
            onClick: onItem ? () => onItem(statItemOf(Boolean(widget.groupBy), series, card.label)) : undefined,
          }}
        />
      {/each}
    </div>
  </div>
{/snippet}

{#if result.error}
  <p
    role="alert"
    class="rounded-box bg-destructive-soft text-foreground flex h-full items-center justify-center p-4 text-center text-sm font-medium"
  >
    {result.error}
  </p>
{:else if widget.kind === 'stats'}
  {#if statCards.length === 0}
    <!-- Agrupando e sem nenhum grupo, não sobra card: o aviso fica na superfície do card, para o
         bloco não sumir da grade como se tivesse quebrado. -->
    <div
      role="status"
      class="rounded-surface bg-card shadow-card flex h-full flex-col items-center justify-center gap-1 p-4 text-center"
    >
      <span class="text-ink-900 text-sm font-semibold">{widget.title}</span>
      <span class="text-ink-500 text-sm">Sem dados para mostrar neste recorte.</span>
    </div>
  {:else}
    {@render statRow(statCards, 'h-full', '')}
  {/if}
{:else if widget.kind === 'hero'}
  <!-- O destaque com o Zuzu: o total no título e, agrupando, até quatro cards LADO A LADO dentro
       dele. Compacto para caber em dois andares. -->
  {@const heroTotal = total.toLocaleString('pt-BR')}
  <DashboardHeroCard
    data={{ title: `${heroTotal} ${noun}`, description: widget.title, zuzu: { pose: 'alert', size: 112 } }}
    ui={{ className: 'h-full justify-between gap-4 overflow-y-auto p-5 sm:p-5' }}
  >
    {#if widget.groupBy && slices.length > 0}
      {@render statRow(slices.slice(0, 4), '', 'p-3')}
    {/if}
  </DashboardHeroCard>
{:else if widget.kind === 'ringCard'}
  <!-- O card com anel: o número diz QUANTOS, o anel mostra a fatia do total que isso representa,
       e o meio do anel repete a contagem ("14 de 136"). O card reserva a direita (`pr-32`) para
       o texto nunca passar por baixo do anel. -->
  {@const hue = cardToneClasses(RING_TONE).color}
  <div class="relative h-full">
    <StatCard
      data={{ label: widget.title, value: formatCount(total), hint: `de ${formatCount(grandTotal)} ${noun}` }}
      ui={{ tone: RING_TONE, icon: Hash, className: 'h-full pr-32' }}
      state={{ isLoading }}
    />
    <div class="absolute top-1/2 right-5 size-24 -translate-y-1/2">
      <Echart
        data={{
          option: (theme) => countRingOption({ count: total, total: grandTotal, hue: resolveColor(hue) }, theme),
          description: `${widget.title}: ${formatCount(total)} de ${formatCount(grandTotal)} ${noun}`,
        }}
        ui={{ heightClass: 'h-full' }}
        state={{ isLoading }}
      />
      {#if !isLoading}
        <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-foreground text-xl leading-none font-bold tabular-nums">
            {grandTotal <= 0 ? '—' : formatCount(total)}
          </span>
          {#if grandTotal > 0}
            <span class="text-muted-foreground mt-0.5 text-xs leading-none tabular-nums">
              de {formatCount(grandTotal)}
            </span>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{:else if widget.kind === 'donut'}
  <DonutChart data={{ slices, seriesLabel: noun }} state={{ isLoading }} actions={{ onSelect: selectByLabel }} />
{:else if widget.kind === 'list'}
  <!-- A lista ordenada: os grupos do maior para o menor, com a barra do tamanho de cada um. -->
  {@const max = Math.max(1, ...slices.map((slice) => slice.value))}
  {#if slices.length === 0}
    <p class="text-ink-500 text-sm">Nada para mostrar.</p>
  {:else}
    <ol class="flex h-full flex-col gap-2 overflow-y-auto">
      {#each slices as slice, index (slice.label)}
        <li class="text-sm">
          {#snippet row()}
            <span class="text-ink-500 w-5 text-right text-xs">{index + 1}º</span>
            <span class="min-w-0 flex-1">
              <span class="flex justify-between gap-2">
                <span class="text-ink-900 truncate">{slice.label}</span>
                <span class="text-ink-900 font-semibold">{slice.value}</span>
              </span>
              <span class="bg-muted mt-1 block h-1.5 rounded-full">
                <span class="bg-primary block h-1.5 rounded-full" style:width={`${(slice.value / max) * 100}%`}></span>
              </span>
            </span>
          {/snippet}
          {#if selectByLabel}
            <button
              type="button"
              onclick={() => selectByLabel?.(slice.label)}
              class="rounded-control hover:bg-muted focus-visible:ring-ring/50 flex w-full items-center gap-3 text-left focus-visible:ring-[3px] focus-visible:outline-none"
            >
              {@render row()}
            </button>
          {:else}
            <span class="flex items-center gap-3">{@render row()}</span>
          {/if}
        </li>
      {/each}
    </ol>
  {/if}
{:else if widget.kind === 'calendar' || widget.kind === 'agenda'}
  <CalendarChart data={{ days: calendarDaysOf(result.data ?? null), seriesLabel: noun }} />
{:else if widget.kind === 'area'}
  <AreaChart
    data={{
      points: timePointsOf(result.data ?? null),
      series: [{ key: 'total', label: noun, color: themeColor('--chart-1') }],
    }}
    state={{ isLoading }}
    ui={{ heightClass: 'h-full min-h-40' }}
    actions={{
      onSelect: onItem
        ? (at) => {
            const item = timeItemOf(series, at);
            if (item) onItem(item);
          }
        : undefined,
    }}
  />
{:else if widget.kind === 'column' || widget.kind === 'bar'}
  <ColumnChart
    data={{ slices, seriesLabel: noun }}
    state={{ isLoading }}
    ui={{ orientation: widget.kind === 'bar' ? 'horizontal' : 'vertical', className: 'h-full min-h-40' }}
    actions={{ onSelect: selectByLabel }}
  />
{:else if widget.kind === 'radar'}
  <RadarChart
    data={{ slices, seriesLabel: noun }}
    state={{ isLoading }}
    ui={{ heightClass: 'h-full min-h-40' }}
    actions={{ onSelect: selectByLabel }}
  />
{:else if widget.kind === 'treemap'}
  <TreemapChart
    data={{ slices, seriesLabel: noun }}
    state={{ isLoading }}
    ui={{ heightClass: 'h-full min-h-40' }}
    actions={{ onSelect: selectByLabel }}
  />
{:else if widget.kind === 'radial'}
  <!-- O medidor: quantos o recorte (filtro, "só os meus", período) pega da fonte inteira. -->
  <RadialChart
    data={{ value: total, max: Math.max(1, grandTotal), label: widget.title, hint: `de ${grandTotal} ${noun}` }}
    state={{ isLoading }}
  />
{:else if widget.kind === 'stacked'}
  <StackedBarChart
    data={{ ...toStacked(cells), seriesLabel: noun }}
    state={{ isLoading }}
    ui={{ heightClass: 'h-full min-h-40' }}
    actions={{ onSelect: onItem ? (row) => onItem(cellItemOf(cells, row)) : undefined }}
  />
{:else if widget.kind === 'heatmap'}
  <HeatmapChart
    data={{ ...toHeatmap(cells), seriesLabel: noun }}
    state={{ isLoading }}
    ui={{ heightClass: 'h-full min-h-40' }}
    actions={{ onSelect: onItem ? (cell) => onItem(cellItemOf(cells, cell.row, cell.column)) : undefined }}
  />
{:else if widget.kind === 'sankey'}
  <SankeyChart
    data={{ ...toSankey(cells), seriesLabel: noun }}
    state={{ isLoading }}
    ui={{ heightClass: 'h-full min-h-40' }}
    actions={{
      onSelect: onItem
        ? (nodeId) => {
            const item = sankeyItemOf(cells, nodeId);
            if (item) onItem(item);
          }
        : undefined,
    }}
  />
{:else if widget.kind === 'pie' || widget.kind === 'rose' || widget.kind === 'halfDonut'}
  {@const shape = widget.kind}
  <Echart
    data={{ option: (theme) => pieOption(slices, noun, shape, theme), description: widget.title }}
    ui={{ heightClass: 'h-full min-h-40' }}
    state={{ isLoading, isEmpty: slices.length === 0 }}
    actions={{ onSelect: selectByLabel ? (selection) => selectByLabel?.(selection.name) : undefined }}
  />
{:else if widget.kind === 'pareto'}
  <Echart
    data={{ option: (theme) => paretoOption(slices, noun, theme), description: widget.title }}
    ui={{ heightClass: 'h-full min-h-40' }}
    state={{ isLoading, isEmpty: slices.length === 0 }}
    actions={{ onSelect: selectByLabel ? (selection) => selectByLabel?.(selection.name) : undefined }}
  />
{:else if widget.kind === 'cumulative'}
  <Echart
    data={{ option: (theme) => cumulativeOption(series, noun, theme), description: widget.title }}
    ui={{ heightClass: 'h-full min-h-40' }}
    state={{ isLoading, isEmpty: series.length === 0 }}
  />
{:else if widget.kind === 'grouped'}
  <Echart
    data={{ option: (theme) => groupedOption(toStacked(cells), theme), description: widget.title }}
    ui={{ heightClass: 'h-full min-h-40' }}
    state={{ isLoading, isEmpty: cells.length === 0 }}
    actions={{ onSelect: onItem ? (selection) => onItem(cellItemOf(cells, selection.name)) : undefined }}
  />
{/if}
