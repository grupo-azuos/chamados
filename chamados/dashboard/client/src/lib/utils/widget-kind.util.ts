import { type LucideIcon } from '@lucide/svelte';
import CalendarDays from '@lucide/svelte/icons/calendar-days';
import CalendarRange from '@lucide/svelte/icons/calendar-range';
import ChartArea from '@lucide/svelte/icons/chart-area';
import ChartBar from '@lucide/svelte/icons/chart-bar';
import ChartColumn from '@lucide/svelte/icons/chart-column';
import ChartColumnBig from '@lucide/svelte/icons/chart-column-big';
import ChartColumnDecreasing from '@lucide/svelte/icons/chart-column-decreasing';
import ChartColumnStacked from '@lucide/svelte/icons/chart-column-stacked';
import ChartLine from '@lucide/svelte/icons/chart-line';
import ChartPie from '@lucide/svelte/icons/chart-pie';
import Donut from '@lucide/svelte/icons/donut';
import Flower2 from '@lucide/svelte/icons/flower-2';
import Gauge from '@lucide/svelte/icons/gauge';
import Grid3x3 from '@lucide/svelte/icons/grid-3x3';
import Hash from '@lucide/svelte/icons/hash';
import LayoutGrid from '@lucide/svelte/icons/layout-grid';
import ListOrdered from '@lucide/svelte/icons/list-ordered';
import Radar from '@lucide/svelte/icons/radar';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Workflow from '@lucide/svelte/icons/workflow';
import { type WidgetKind } from '@template/shared/schemas/dashboard-board.schema';

/**
 * A CARA DE CADA TIPO DE BLOCO — o ícone e o nome curto que aparecem na lateral de montar o
 * painel, no "trocar o gráfico" do bloco e na grade de escolha do editor. O nome longo (com a
 * explicação) continua no contrato. O mesmo do paralegal.
 */
export const WIDGET_KIND_LOOK: Record<WidgetKind, { icon: LucideIcon; short: string }> = {
  stats: { icon: Hash, short: 'Números' },
  hero: { icon: Sparkles, short: 'Destaque' },
  column: { icon: ChartColumn, short: 'Colunas' },
  bar: { icon: ChartBar, short: 'Barras' },
  donut: { icon: ChartPie, short: 'Rosca' },
  area: { icon: ChartArea, short: 'Linha' },
  calendar: { icon: CalendarDays, short: 'Calendário' },
  list: { icon: ListOrdered, short: 'Ranking' },
  radar: { icon: Radar, short: 'Radar' },
  treemap: { icon: LayoutGrid, short: 'Blocos' },
  radial: { icon: Gauge, short: 'Medidor' },
  stacked: { icon: ChartColumnStacked, short: 'Empilhado' },
  heatmap: { icon: Grid3x3, short: 'Calor' },
  sankey: { icon: Workflow, short: 'Fluxo' },
  agenda: { icon: CalendarRange, short: 'Agenda' },
  pie: { icon: ChartPie, short: 'Pizza' },
  rose: { icon: Flower2, short: 'Rosa' },
  halfDonut: { icon: Gauge, short: 'Meia-rosca' },
  pareto: { icon: ChartColumnDecreasing, short: 'Pareto' },
  cumulative: { icon: ChartLine, short: 'Acumulado' },
  grouped: { icon: ChartColumnBig, short: 'Lado a lado' },
  ringCard: { icon: Donut, short: 'Card com anel' },
};

/**
 * OS SEIS MAIS USADOS, à frente; os outros dezesseis num segundo grupo. Vinte e duas opções com o
 * mesmo peso demoram para escolher (Lei de Hick) — o comum fica à mão, o raro continua a um passo.
 */
export const MAIN_KINDS: readonly WidgetKind[] = [
  'column',
  'bar',
  'area',
  'donut',
  'stats',
  'list',
];
export const OTHER_KINDS: readonly WidgetKind[] = [
  'hero',
  'agenda',
  'radar',
  'treemap',
  'radial',
  'ringCard',
  'stacked',
  'heatmap',
  'calendar',
  'sankey',
  'pie',
  'rose',
  'halfDonut',
  'pareto',
  'cumulative',
  'grouped',
];

/** O título que o bloco novo já traz — quem monta só ajusta (Lei de Tesler). */
export function suggestedTitle(kind: WidgetKind, noun: string, groupLabel: string | null): string {
  if (kind === 'hero') return 'Destaque';
  const subject = noun.charAt(0).toUpperCase() + noun.slice(1);

  return groupLabel ? `${subject} por ${groupLabel.toLowerCase()}` : subject;
}
