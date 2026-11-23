import { type Task } from '@template/shared/schemas/task.schema';

import { type AzuosCardHue } from '$lib/utils/card-tone.util';
import { isTaskOverdue } from '@template/shared/domain/task-flow.util';

/**
 * AS CONTAS DA TIMELINE DAS TAREFAS (o Gantt do Paralegal) — a janela de dias, a barra de cada
 * tarefa dentro dela e as raias por responsável. Dia é `aaaa-mm-dd`, contado em UTC (dia de
 * calendário não tem fuso).
 */
const DAY_MS = 86_400_000;

/** O Mês mostra cinco semanas, a partir da segunda da semana passada. */
export const GANTT_WEEKS = 5;

export type GanttWindow = { from: string; to: string };

function dayNumber(iso: string): number {
  return Math.round(Date.parse(`${iso}T00:00:00.000Z`) / DAY_MS);
}

function isoOf(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return isoOf(dayNumber(iso) + days);
}

/** Segunda-feira da semana do dia (a semana da equipe começa na segunda). */
export function mondayOf(iso: string): string {
  const weekday = new Date(`${iso}T00:00:00.000Z`).getUTCDay();

  return addDays(iso, -((weekday + 6) % 7));
}

/**
 * O ZOOM — quantos dias cabem na tela. Cada zoom tem a sua largura mínima de dia, e o que passar
 * da tela rola para o lado.
 */
export const TIMELINE_ZOOMS = ['week', 'fortnight', 'month'] as const;

export type TimelineZoom = (typeof TIMELINE_ZOOMS)[number];

export const TIMELINE_ZOOM_LABELS: Record<TimelineZoom, string> = {
  week: 'Semana',
  fortnight: '2 semanas',
  month: 'Mês',
};

/** A largura mínima de um dia em cada zoom, em pixels. */
export const TIMELINE_DAY_PX: Record<TimelineZoom, number> = {
  week: 120,
  fortnight: 64,
  month: 40,
};

export function ganttWindowOf(today: string, zoom: TimelineZoom = 'month'): GanttWindow {
  const monday = mondayOf(today);
  if (zoom === 'week') return { from: monday, to: addDays(monday, 6) };
  if (zoom === 'fortnight') return { from: monday, to: addDays(monday, 13) };
  const from = addDays(monday, -7);

  return { from, to: addDays(from, GANTT_WEEKS * 7 - 1) };
}

export function shiftGanttWindow(window: GanttWindow, weeks: number): GanttWindow {
  return { from: addDays(window.from, weeks * 7), to: addDays(window.to, weeks * 7) };
}

export function ganttDays(window: GanttWindow): string[] {
  const count = dayNumber(window.to) - dayNumber(window.from) + 1;

  return Array.from({ length: Math.max(count, 0) }, (_, index) => addDays(window.from, index));
}

export type GanttBar = {
  /** A coluna onde a barra começa (0 é o primeiro dia da janela). */
  column: number;
  /** Quantos dias ela ocupa dentro da janela. */
  span: number;
  /** Começou antes da janela — a ponta esquerda está cortada. */
  isCutStart: boolean;
  /** Vence depois da janela — a ponta direita está cortada. */
  isCutEnd: boolean;
};

/** A barra da tarefa: do início ao prazo (sem prazo, um dia só); `null` fora da janela. */
export function ganttBarOf(
  task: Pick<Task, 'startDate' | 'dueDate'>,
  window: GanttWindow,
): GanttBar | null {
  const start = dayNumber(task.startDate);
  const end = dayNumber(task.dueDate ?? task.startDate);
  const first = dayNumber(window.from);
  const last = dayNumber(window.to);
  if (end < first || start > last) return null;
  const from = Math.max(start, first);
  const to = Math.min(end, last);

  return {
    column: from - first,
    span: to - from + 1,
    isCutStart: start < first,
    isCutEnd: end > last,
  };
}

export type GanttLane<T> = {
  ownerId: string;
  ownerName: string;
  ownerPhoto: string | null;
  tasks: T[];
};

const NO_OWNER = { id: '', name: 'Sem responsável', avatarUrl: null };

/** Uma raia por responsável (em ordem de nome; "Sem responsável" por último), as tarefas pelo início. */
export function ganttLanesOf<T extends Pick<Task, 'owner' | 'startDate'>>(
  tasks: readonly T[],
): GanttLane<T>[] {
  const lanes = new Map<string, GanttLane<T>>();
  for (const task of tasks) {
    const owner = task.owner ?? NO_OWNER;
    const lane = lanes.get(owner.id) ?? {
      ownerId: owner.id,
      ownerName: owner.name ?? 'Sem cadastro',
      ownerPhoto: owner.avatarUrl,
      tasks: [],
    };
    lane.tasks.push(task);
    lanes.set(owner.id, lane);
  }

  return [...lanes.values()]
    .sort(
      (a, b) =>
        Number(!a.ownerId) - Number(!b.ownerId) || a.ownerName.localeCompare(b.ownerName, 'pt-BR'),
    )
    .map((lane) => ({
      ...lane,
      tasks: [...lane.tasks].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    }));
}

/** "17/11 a 21/12" — o título da janela. */
export function ganttTitleOf(window: GanttWindow): string {
  const short = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

  return `${short(window.from)} a ${short(window.to)}`;
}

export function isWeekend(iso: string): boolean {
  const weekday = new Date(`${iso}T00:00:00.000Z`).getUTCDay();

  return weekday === 0 || weekday === 6;
}

/** A cor de cada situação na timeline e na legenda. */
export const TASK_STATUS_HUES: Record<Task['status'], AzuosCardHue> = {
  open: 'blue',
  reopened: 'copper',
  done: 'green',
};

/** A cor da tarefa hoje: a da situação, ou vermelha quando está atrasada. */
export function taskHueOf(
  task: Pick<Task, 'status' | 'dueDate' | 'dueTime'>,
  now: Date = new Date(),
): AzuosCardHue {
  if (isTaskOverdue(task, now)) return 'red';

  return TASK_STATUS_HUES[task.status];
}

/** "05/11/2026" — o dia como a pessoa lê. */
export function brazilianDay(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}
