import { type WidgetData } from '@template/shared/schemas/dashboard-board.schema';

import { type ChartSlice } from '$lib/utils/chart-slice';
import { type AzuosCardTone } from '$lib/utils/card-tone.util';
import { type TimePoint } from '$lib/utils/time-series';

/**
 * OS NÚMEROS DE UM BLOCO no formato de cada gráfico. O servidor manda sempre o mesmo pacote (o
 * total, o total da fonte, os grupos e as células); aqui ele vira fatias, pontos no tempo, dias do
 * calendário e cards. Funções puras: o componente do bloco só desenha.
 */

/** Os grupos como fatias — a rosca, as colunas, a lista, o radar e os blocos. */
export function slicesOf(data: WidgetData | null): ChartSlice[] {
  return (data?.series ?? []).map((item) => ({ label: item.label, value: item.value }));
}

/**
 * Os grupos no tempo como pontos da linha. A chave do mês (`2026-03`) vira o dia 1 dele, e a do
 * dia ou da semana (`2026-03-09`) o próprio dia — ao meio-dia, para nenhum fuso puxar a data.
 */
export function timePointsOf(data: WidgetData | null): TimePoint[] {
  return [...(data?.series ?? [])]
    .filter((item) => /^\d{4}-\d{2}(-\d{2})?$/.test(item.key))
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((item) => ({
      at: `${item.key.length === 7 ? `${item.key}-01` : item.key}T12:00:00.000Z`,
      values: { total: item.value },
    }));
}

/** Os grupos por dia como os dias do calendário. */
export function calendarDaysOf(data: WidgetData | null): { date: string; count: number }[] {
  return (data?.series ?? [])
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.key))
    .map((item) => ({ date: item.key, count: item.value }));
}

/** Os tons dos cards, um por grupo, na ordem — os mesmos oito sotaques da marca. */
const CARD_TONES: AzuosCardTone[] = [
  'blue',
  'green',
  'yellow',
  'red',
  'plum',
  'steel',
  'copper',
  'slate',
];

export type StatItem = { key: string; label: string; value: number; tone: AzuosCardTone };

/** O máximo de cards de um bloco de números. */
export const MAX_STAT_ITEMS = 4;

/**
 * Os cards de um bloco de números: sem agrupar, o total (com o nome do que se conta); agrupando,
 * um card por grupo, os maiores primeiro, até quatro.
 */
export function statItemsOf(data: WidgetData | null, noun: string, isGrouped: boolean): StatItem[] {
  if (!isGrouped)
    return [{ key: 'total', label: capitalize(noun), value: data?.total ?? 0, tone: 'blue' }];

  return (data?.series ?? []).slice(0, MAX_STAT_ITEMS).map((item, index) => ({
    key: item.key,
    label: item.label,
    value: item.value,
    tone: CARD_TONES[index % CARD_TONES.length]!,
  }));
}

/** O medidor e o card com anel: o recorte sobre a fonte inteira. */
export function gaugeOf(data: WidgetData | null): { value: number; max: number; share: number } {
  const value = data?.total ?? 0;
  const max = Math.max(data?.grandTotal ?? 0, 1);

  return { value, max, share: Math.round((value / max) * 100) };
}

/** O bloco não tem o que mostrar — o vazio só depois de a conta terminar. */
export function isEmptyResult(data: WidgetData | null): boolean {
  if (!data) return false;

  return data.total === 0 && data.series.length === 0 && data.cells.length === 0;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
