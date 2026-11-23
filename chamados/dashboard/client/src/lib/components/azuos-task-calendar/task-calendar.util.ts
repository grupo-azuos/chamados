import { addDays } from '@template/shared/domain/task-flow.util';
import { type Task } from '@template/shared/schemas/task.schema';

/**
 * AS CONTAS DO CALENDÁRIO E DA TIMELINE, sem `Date` (o dia não pode escorregar com o fuso):
 * as semanas do mês, o dia de cada tarefa e o pedaço do mês que ela ocupa.
 */
export const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

export function monthLabel(month: string): string {
  const [year, value] = month.split('-').map(Number) as [number, number];

  return `${MONTH_NAMES[value - 1]} de ${year}`;
}

export function daysOfMonth(month: string): string[] {
  const days: string[] = [];
  for (let day = `${month}-01`; day.startsWith(month); day = addDays(day, 1)) days.push(day);

  return days;
}

/** O dia em que a tarefa aparece no calendário: o prazo, ou o início quando não há prazo. */
export function calendarDayOf(task: Pick<Task, 'dueDate' | 'startDate'>): string {
  return task.dueDate ?? task.startDate;
}

/** Onde a barra da tarefa começa e termina no mês (índices de dia, 0 = dia 1). */
export function timelineSpan(
  task: Pick<Task, 'startDate' | 'dueDate'>,
  month: string,
): { start: number; end: number } | null {
  const days = daysOfMonth(month);
  const first = days[0]!;
  const last = days[days.length - 1]!;
  const end = task.dueDate ?? task.startDate;
  if (end < first || task.startDate > last) return null;
  const from = task.startDate < first ? first : task.startDate;
  const to = end > last ? last : end;

  return { start: days.indexOf(from), end: days.indexOf(to) };
}
