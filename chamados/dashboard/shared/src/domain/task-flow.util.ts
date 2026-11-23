/**
 * AS TAREFAS — o trabalho da equipe num lugar só, no mesmo formato do Paralegal.
 *
 * Uma tarefa nasce de três jeitos:
 * - de um CHAMADO da área: abrir o chamado cria a tarefa, e o andamento do chamado a acompanha
 *   (encerrou, finaliza; reabriu, reabre);
 * - de uma MANUTENÇÃO: a preventiva vencida (ou perto de vencer) e a manutenção agendada viram
 *   tarefa da máquina, e registrar a manutenção a finaliza;
 * - À MÃO: quem atende cadastra, e vincula a quantos chamados, computadores, peças e itens
 *   quiser.
 *
 * A situação é a mesma régua do Paralegal: Aberta → Finalizada → (Reaberta). As etapas são o
 * checklist da tarefa; marcar a última finaliza, desmarcar uma de uma finalizada reabre.
 */

export const TASK_STATUSES = ['open', 'reopened', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: 'Aberta',
  reopened: 'Reaberta',
  done: 'Finalizada',
};

export const TASK_STATUS_TONES: Record<TaskStatus, 'info' | 'warning' | 'success'> = {
  open: 'info',
  reopened: 'warning',
  done: 'success',
};

/** De onde a tarefa veio. A origem não muda depois. */
export const TASK_ORIGINS = ['manual', 'ticket', 'maintenance'] as const;
export type TaskOrigin = (typeof TASK_ORIGINS)[number];

export const TASK_ORIGIN_LABELS: Record<TaskOrigin, string> = {
  manual: 'Manual',
  ticket: 'Do chamado',
  maintenance: 'Da manutenção',
};

/** A que a tarefa pode se vincular. Vários de cada, e de tipos misturados. */
export const TASK_LINK_KINDS = ['ticket', 'computer', 'part', 'inventory_item'] as const;
export type TaskLinkKind = (typeof TASK_LINK_KINDS)[number];

export const TASK_LINK_KIND_LABELS: Record<TaskLinkKind, string> = {
  ticket: 'Chamado',
  computer: 'Computador',
  part: 'Peça',
  inventory_item: 'Item do inventário',
};

/** As etapas que a tarefa de manutenção já traz — o roteiro de uma preventiva. */
export const DEFAULT_MAINTENANCE_TASK_STEPS = [
  'Combinar o horário com o responsável',
  'Limpeza e troca de pasta térmica',
  'Atualizações e verificação de disco',
  'Registrar a manutenção na ficha',
] as const;

/** Quantos dias antes do vencimento a preventiva já vira tarefa. */
export const MAINTENANCE_TASK_LEAD_DAYS = 7;

/**
 * Marcar etapas muda a situação: todas feitas finaliza; desmarcar uma de uma finalizada reabre.
 * Tarefa sem etapas não muda por aqui — é finalizada pelo botão.
 */
export function taskStatusAfterSteps(
  current: TaskStatus,
  steps: readonly { done: boolean }[],
): TaskStatus {
  if (steps.length === 0) return current;
  if (steps.every((step) => step.done)) return 'done';
  if (current === 'done') return 'reopened';

  return current;
}

/** Só existem dois movimentos à mão: finalizar o que não está finalizado e reabrir o finalizado. */
export function canMoveTask(current: TaskStatus, next: TaskStatus): boolean {
  if (next === 'done') return current !== 'done';
  if (next === 'reopened') return current === 'done';

  return false;
}

/**
 * A tarefa de um chamado segue o chamado: encerrado finaliza, voltou a abrir reabre. Devolve
 * `null` quando não há o que mudar — é o que impede o vaivém de gravar à toa.
 */
export function taskStatusFromTicket(
  current: TaskStatus,
  isTicketClosed: boolean,
): TaskStatus | null {
  if (isTicketClosed) return current === 'done' ? null : 'done';

  return current === 'done' ? 'reopened' : null;
}

const BRASILIA_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** O dia (`aaaa-mm-dd`) e a hora (`hh:mm`) de agora em Brasília — o relógio do escritório. */
export function brasiliaClock(now: Date = new Date()): { day: string; time: string } {
  const parts = BRASILIA_DAY.formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '00';

  return {
    day: `${part('year')}-${part('month')}-${part('day')}`,
    time: `${part('hour')}:${part('minute')}`,
  };
}

/** Atrasada: passou do prazo e não foi finalizada. Prazo sem hora vence no fim do dia. */
export function isTaskOverdue(
  task: { dueDate: string | null; dueTime: string | null; status: TaskStatus },
  now: Date = new Date(),
): boolean {
  if (task.status === 'done' || !task.dueDate) return false;
  const clock = brasiliaClock(now);
  if (task.dueDate !== clock.day) return task.dueDate < clock.day;

  return task.dueTime !== null && task.dueTime.slice(0, 5) < clock.time;
}

/** Vence em até `days` dias (e ainda não venceu). */
export function isTaskDueSoon(
  task: { dueDate: string | null; status: TaskStatus },
  days = MAINTENANCE_TASK_LEAD_DAYS,
  now: Date = new Date(),
): boolean {
  if (task.status === 'done' || !task.dueDate) return false;
  const today = brasiliaClock(now).day;
  const limit = addDays(today, days);

  return task.dueDate >= today && task.dueDate <= limit;
}

/** `aaaa-mm-dd` + n dias, sem fuso: a conta é de calendário. */
export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

/**
 * A MANUTENÇÃO que a máquina pede agora, se pedir: o agendamento (quando houver) manda; sem ele,
 * a próxima preventiva. Só vira tarefa o que já venceu ou vence em até `MAINTENANCE_TASK_LEAD_DAYS`.
 */
export function maintenanceTaskNeed(
  machine: { scheduledFor: string | null; nextPreventiveAt: string | null },
  now: Date = new Date(),
): { dueDate: string; reason: 'scheduled' | 'preventive' } | null {
  const limit = addDays(brasiliaClock(now).day, MAINTENANCE_TASK_LEAD_DAYS);
  if (machine.scheduledFor) {
    return machine.scheduledFor <= limit
      ? { dueDate: machine.scheduledFor, reason: 'scheduled' }
      : null;
  }
  if (machine.nextPreventiveAt) {
    const day = machine.nextPreventiveAt.slice(0, 10);
    return day <= limit ? { dueDate: day, reason: 'preventive' } : null;
  }

  return null;
}
