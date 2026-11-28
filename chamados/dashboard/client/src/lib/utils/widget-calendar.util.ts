import { type AzuosCalendarEvent } from '$lib/components/azuos-event-calendar/azuos-event-calendar.svelte';

/**
 * A CONTAGEM POR DIA VIRA EVENTO DO CALENDÁRIO — um por dia com alguma coisa, escrito "12 chamados".
 *
 * Os dois blocos de calendário do painel (a agenda e o calendário de calor) leem a mesma série;
 * a diferença é a cor. Na agenda, o azul da marca. No calor, a escala do mais claro ao mais forte
 * (amarelo → vermelho): o pico salta aos olhos, e o número escrito garante que a cor nunca é o
 * único jeito de ler.
 */
export type DayCount = { key: string; value: number };

/** Do mais claro ao mais forte — e o texto que se lê em cima de cada um. */
const HEAT_SCALE = [
  { color: 'var(--brand-yellow-300)', contrastColor: 'var(--black)' },
  { color: 'var(--brand-yellow-500)', contrastColor: 'var(--black)' },
  { color: 'var(--warning)', contrastColor: 'var(--black)' },
  { color: 'var(--destructive)', contrastColor: 'var(--white)' },
] as const;

export function dayCountEvents(
  series: readonly DayCount[],
  noun: string,
  options: { heat?: boolean } = {},
): AzuosCalendarEvent[] {
  const days = series.filter((item) => item.value > 0);
  const max = Math.max(0, ...days.map((item) => item.value));

  return days.map((item) => ({
    id: item.key,
    title: `${item.value} ${noun}`,
    start: item.key,
    ...(options.heat ? heatOf(item.value, max) : {}),
  }));
}

/** O degrau da escala: a fração do maior dia, em quatro faixas. */
function heatOf(value: number, max: number) {
  const step = Math.min(HEAT_SCALE.length - 1, Math.floor((value / max) * HEAT_SCALE.length));

  return HEAT_SCALE[step]!;
}
