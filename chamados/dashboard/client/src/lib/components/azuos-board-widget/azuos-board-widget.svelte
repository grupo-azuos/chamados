<script lang="ts" module>
  import { type Widget } from '@template/shared/schemas/dashboard-board.schema';
  import { type Snippet } from 'svelte';

  import { type WidgetState } from '$lib/hooks/use-dashboard-board/use-dashboard-board.svelte';

  /**
   * UM BLOCO DO PAINEL — o título, a nota do recorte e o gráfico do tipo escolhido, com os
   * estados de sempre: carregando, erro (em vermelho, com o motivo) e vazio (só depois de contar).
   *
   * Função pura de props: os números chegam prontos (`data.result`), e o bloco só desenha.
   * Os controles de montar (mover, editar, tirar) são do canvas, que põe por cima (`tools`).
   */
  export type AzuosBoardWidgetProps = {
    data: {
      widget: Widget;
      result: WidgetState | null;
      /** O que a fonte conta, no plural: "chamados". */
      noun: string;
      /** A linha pequena embaixo do título: o período, o filtro salvo, "só os meus". */
      hint?: string | null;
    };
    ui?: { className?: string };
    tools?: Snippet;
  };
</script>

<script lang="ts">
  import AreaChart from '$lib/components/azuos-area-chart/azuos-area-chart.svelte';
  import CalendarChart from '$lib/components/azuos-calendar-chart/azuos-calendar-chart.svelte';
  import ChartValueList from '$lib/components/azuos-chart-value-list/azuos-chart-value-list.svelte';
  import ColumnChart from '$lib/components/azuos-column-chart/azuos-column-chart.svelte';
  import DashboardHeroCard from '$lib/components/azuos-dashboard-hero-card/azuos-dashboard-hero-card.svelte';
  import DonutChart from '$lib/components/azuos-donut-chart/azuos-donut-chart.svelte';
  import Echart from '$lib/components/azuos-echart/azuos-echart.svelte';
  import HeatmapChart from '$lib/components/azuos-heatmap-chart/azuos-heatmap-chart.svelte';
  import PanelCard from '$lib/components/azuos-panel-card/azuos-panel-card.svelte';
  import RadarChart from '$lib/components/azuos-radar-chart/azuos-radar-chart.svelte';
  import RadialChart from '$lib/components/azuos-radial-chart/azuos-radial-chart.svelte';
  import SankeyChart from '$lib/components/azuos-sankey-chart/azuos-sankey-chart.svelte';
  import StackedBarChart from '$lib/components/azuos-stacked-bar-chart/azuos-stacked-bar-chart.svelte';
  import StatCard from '$lib/components/azuos-stat-card/azuos-stat-card.svelte';
  import TreemapChart from '$lib/components/azuos-treemap-chart/azuos-treemap-chart.svelte';
  import { themeColor } from '$lib/utils/theme-color.util';
  import {
    cumulativeOption,
    groupedOption,
    paretoOption,
    pieOption,
    toHeatmap,
    toSankey,
    toStacked,
  } from '$lib/utils/widget-chart.util';
  import {
    calendarDaysOf,
    gaugeOf,
    isEmptyResult,
    slicesOf,
    statItemsOf,
    timePointsOf,
  } from '$lib/utils/widget-view.util';

  let { data, ui, tools }: AzuosBoardWidgetProps = $props();

  const widget = $derived(data.widget);
  const result = $derived(data.result?.data ?? null);
  const isLoading = $derived(Boolean(data.result?.isLoading) && result === null);
  const error = $derived(data.result?.error ?? null);
  const slices = $derived(slicesOf(result));
  const seriesLabel = $derived(data.noun.charAt(0).toUpperCase() + data.noun.slice(1));
  const emptyLabel = 'Nada para contar aqui';
  const isCards = $derived(widget.kind === 'stats' || widget.kind === 'ringCard');
</script>

{#snippet body()}
  {#if error}
    <p role="alert" class="text-destructive text-sm font-medium">{error}</p>
  {:else if isLoading}
    <p class="text-ink-500 text-sm">Contando…</p>
  {:else if isEmptyResult(result) && !isCards}
    <p class="text-ink-500 text-sm">{emptyLabel}</p>
  {:else if widget.kind === 'stats'}
    {@const items = statItemsOf(result, data.noun, widget.groupBy !== null)}
    <div class="grid h-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {#each items as item (item.key)}
        <StatCard data={{ label: item.label, value: item.value }} ui={{ tone: item.tone }} />
      {/each}
    </div>
  {:else if widget.kind === 'hero'}
    {@const items = statItemsOf(result, data.noun, widget.groupBy !== null)}
    <DashboardHeroCard
      data={{
        title: widget.title,
        description: `${result?.total ?? 0} ${data.noun} no recorte`,
        stats: items.map((item) => ({ label: item.label, value: item.value, tone: item.tone })),
      }}
    />
  {:else if widget.kind === 'radial' || widget.kind === 'ringCard'}
    {@const gauge = gaugeOf(result)}
    <RadialChart
      data={{ value: gauge.value, max: gauge.max, label: widget.title, hint: `de ${gauge.max} ${data.noun}` }}
      ui={{ heightClass: widget.kind === 'ringCard' ? 'h-24' : 'h-40' }}
    />
  {:else if widget.kind === 'column' || widget.kind === 'bar'}
    <ColumnChart
      data={{ slices, seriesLabel }}
      ui={{ emptyLabel, orientation: widget.kind === 'bar' ? 'horizontal' : 'vertical' }}
    />
  {:else if widget.kind === 'donut'}
    <DonutChart data={{ slices, seriesLabel }} ui={{ emptyLabel }} />
  {:else if widget.kind === 'list'}
    <ChartValueList data={{ slices }} />
  {:else if widget.kind === 'radar'}
    <RadarChart data={{ slices, seriesLabel }} ui={{ emptyLabel }} />
  {:else if widget.kind === 'treemap'}
    <TreemapChart data={{ slices, seriesLabel }} ui={{ emptyLabel }} />
  {:else if widget.kind === 'area'}
    <AreaChart
      data={{ points: timePointsOf(result), series: [{ key: 'total', label: seriesLabel, color: themeColor('--chart-1') }] }}
      ui={{ emptyLabel }}
    />
  {:else if widget.kind === 'calendar' || widget.kind === 'agenda'}
    <CalendarChart data={{ days: calendarDaysOf(result), seriesLabel: data.noun }} ui={{ emptyLabel }} />
  {:else if widget.kind === 'stacked'}
    {@const stacked = toStacked(result?.cells ?? [])}
    <StackedBarChart data={{ ...stacked, seriesLabel }} ui={{ emptyLabel }} />
  {:else if widget.kind === 'heatmap'}
    <HeatmapChart data={{ ...toHeatmap(result?.cells ?? []), seriesLabel }} ui={{ emptyLabel }} />
  {:else if widget.kind === 'sankey'}
    <SankeyChart data={{ ...toSankey(result?.cells ?? []), seriesLabel }} ui={{ emptyLabel }} />
  {:else if widget.kind === 'pie' || widget.kind === 'rose' || widget.kind === 'halfDonut'}
    {@const shape = widget.kind}
    <Echart
      data={{ option: (theme) => pieOption(slices, seriesLabel, shape, theme), description: widget.title }}
      ui={{ emptyLabel }}
      state={{ isEmpty: slices.length === 0 }}
    />
  {:else if widget.kind === 'pareto'}
    <Echart
      data={{ option: (theme) => paretoOption(slices, seriesLabel, theme), description: widget.title }}
      ui={{ emptyLabel }}
      state={{ isEmpty: slices.length === 0 }}
    />
  {:else if widget.kind === 'cumulative'}
    <Echart
      data={{
        option: (theme) => cumulativeOption(result?.series ?? [], seriesLabel, theme),
        description: widget.title,
      }}
      ui={{ emptyLabel }}
      state={{ isEmpty: (result?.series ?? []).length === 0 }}
    />
  {:else if widget.kind === 'grouped'}
    <Echart
      data={{ option: (theme) => groupedOption(toStacked(result?.cells ?? []), theme), description: widget.title }}
      ui={{ emptyLabel }}
      state={{ isEmpty: (result?.cells ?? []).length === 0 }}
    />
  {/if}
{/snippet}

<PanelCard data={{ title: widget.title, hint: data.hint ?? null }} ui={{ className: ui?.className, bodyClassName: 'min-h-0 flex-1' }} {tools}>
  {@render body()}
</PanelCard>
