import {
  TASK_STATUS_LABELS,
  TASK_STATUS_TONES,
  type TaskStatus,
} from '@template/shared/domain/task-flow.util';
import { type Task } from '@template/shared/schemas/task.schema';
import { type TaskStage } from '@template/shared/schemas/task-stage.schema';

import { type AzuosCardTone, cardHueFromHex } from '$lib/utils/card-tone.util';

/**
 * AS SITUAÇÕES NA TELA (como no Paralegal) — as três fixas (Aberta, Reaberta, Finalizada) e, entre
 * Reaberta e Finalizada, as próprias da equipe. A tarefa numa própria continua aberta (ou reaberta)
 * por baixo: a tela mostra o nome da própria; o servidor guarda as duas coisas.
 */
export type TaskSituation = { label: string; tone: AzuosCardTone; color: string | null };

/** O nome e a cor da situação da tarefa — a própria, quando ela está numa. */
export function situationOf(task: Pick<Task, 'status' | 'stage'>): TaskSituation {
  if (task.stage)
    return {
      label: task.stage.label,
      tone: cardHueFromHex(task.stage.color),
      color: task.stage.color,
    };

  return {
    label: TASK_STATUS_LABELS[task.status],
    tone: TASK_STATUS_TONES[task.status],
    color: null,
  };
}

export type TaskColumn =
  | { kind: 'status'; id: string; title: string; status: TaskStatus }
  | { kind: 'stage'; id: string; title: string; stage: TaskStage };

export function statusColumnId(status: TaskStatus): string {
  return `column:status:${status}`;
}

export function stageColumnId(stageId: number): string {
  return `column:stage:${stageId}`;
}

/** A coluna da tarefa: a da situação própria, ou a fixa do `status`. */
export function columnIdOf(task: Pick<Task, 'status' | 'stage'>): string {
  return task.stage ? stageColumnId(task.stage.id) : statusColumnId(task.status);
}

/** As colunas do quadro: Aberta, Reaberta, as próprias (na ordem da equipe) e Finalizada. */
export function taskColumnsOf(stages: readonly TaskStage[]): TaskColumn[] {
  const fixed = (status: TaskStatus): TaskColumn => ({
    kind: 'status',
    id: statusColumnId(status),
    title: TASK_STATUS_LABELS[status],
    status,
  });

  return [
    fixed('open'),
    fixed('reopened'),
    ...stages.map((stage): TaskColumn => ({
      kind: 'stage',
      id: stageColumnId(stage.id),
      title: stage.label,
      stage,
    })),
    fixed('done'),
  ];
}

export type TaskMove =
  { status: 'done' | 'reopened' } | { stageId: number | null } | { refusal: string };

const TICKET_REFUSAL = 'A tarefa de um chamado acompanha o chamado: encerre ou reabra o chamado.';

function stageOfColumn(columnId: string): number | null {
  const match = /^column:stage:(\d+)$/.exec(columnId);

  return match ? Number(match[1]) : null;
}

function statusOfColumn(columnId: string): TaskStatus | null {
  const status = columnId.replace('column:status:', '');

  return status === 'open' || status === 'reopened' || status === 'done' ? status : null;
}

/** Soltar numa coluna fixa: finalizar, reabrir, ou só sair da própria. */
function moveToStatus(
  task: Pick<Task, 'status' | 'stage' | 'origin'>,
  target: TaskStatus,
): TaskMove | null {
  if (target === 'done' || task.status === 'done') {
    if (task.origin === 'ticket') return { refusal: TICKET_REFUSAL };

    return target === 'done'
      ? { status: 'done' }
      : target === 'reopened'
        ? { status: 'reopened' }
        : { refusal: 'Tarefa não volta para "Aberta": finalizada, ela é reaberta.' };
  }
  if (task.stage && target === task.status) return { stageId: null };

  return {
    refusal: `A tarefa está ${TASK_STATUS_LABELS[task.status].toLowerCase()}: solte-a na coluna dela.`,
  };
}

/**
 * A coluna onde a tarefa foi solta vira o movimento — ou a recusa. Numa própria, ela entra na
 * situação (a finalizada é reaberta junto); em Finalizada, finaliza; de Finalizada para Reaberta,
 * reabre; da própria para a coluna fixa dela, sai da própria.
 */
export function moveOfTaskDrop(
  task: Pick<Task, 'status' | 'stage' | 'origin'>,
  columnId: string,
): TaskMove | null {
  if (columnId === columnIdOf(task)) return null;
  const stageId = stageOfColumn(columnId);
  if (stageId !== null) {
    return task.status === 'done' && task.origin === 'ticket'
      ? { refusal: TICKET_REFUSAL }
      : { stageId };
  }
  const target = statusOfColumn(columnId);

  return target ? moveToStatus(task, target) : null;
}
