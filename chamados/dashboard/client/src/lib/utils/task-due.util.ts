import { isTaskDueSoon, isTaskOverdue } from '@template/shared/domain/task-flow.util';
import { type Task } from '@template/shared/schemas/task.schema';

/**
 * O PRAZO DA TAREFA como selo — a mesma frase e a mesma cor em toda vista (lista, card,
 * quadro, calendário). Atrasada é vermelho, vencendo na semana é amarelo, o resto é neutro.
 */
export type TaskDueBadge = { label: string; tone: 'danger' | 'warning' | 'neutral' };

/** `aaaa-mm-dd` → `dd/mm/aaaa`, sem passar por `Date` (nada de fuso mexendo no dia). */
export function formatDay(day: string): string {
  const [year, month, date] = day.split('-');

  return `${date}/${month}/${year}`;
}

export function taskDueBadge(
  task: Pick<Task, 'dueDate' | 'dueTime' | 'status'>,
  now: Date = new Date(),
): TaskDueBadge | null {
  if (!task.dueDate) return null;
  const when = `${formatDay(task.dueDate)}${task.dueTime ? ` às ${task.dueTime}` : ''}`;
  if (isTaskOverdue(task, now)) return { label: `Atrasada · ${when}`, tone: 'danger' };
  if (task.status !== 'done' && isTaskDueSoon(task, 7, now)) {
    return { label: `Vence ${when}`, tone: 'warning' };
  }

  return { label: `Prazo ${when}`, tone: 'neutral' };
}

/** A porcentagem de etapas feitas — 0 sem etapas. */
export function taskPercentage(task: Pick<Task, 'progress'>): number {
  if (task.progress.total === 0) return 0;

  return Math.round((task.progress.done / task.progress.total) * 100);
}
