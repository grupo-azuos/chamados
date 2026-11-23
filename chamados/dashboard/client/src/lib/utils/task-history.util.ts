import { TASK_STATUS_LABELS, type TaskStatus } from '@template/shared/domain/task-flow.util';
import { type TaskHistoryEntry } from '@template/shared/schemas/task.schema';

import { type StatusBadgeTone } from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
import { formatDay } from '$lib/utils/task-due.util';

/**
 * A LINHA DO TEMPO DA TAREFA EM PALAVRAS — o que o Histórico gravou ("setStatus", `{ status:
 * 'done' }`) virando o que a pessoa lê: "Mudou a situação da tarefa" · "Situação: Finalizada".
 */
export type TaskTimelineEntry = {
  id: number;
  kindLabel: string;
  tone: StatusBadgeTone;
  authorName: string;
  createdAt: string;
  lines: string[];
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Criou a tarefa',
  update: 'Editou a tarefa',
  setStatus: 'Mudou a situação da tarefa',
  saveSteps: 'Personalizou o fluxo',
  setStepDone: 'Marcou uma etapa da tarefa',
  addLinks: 'Vinculou à tarefa',
  removeLink: 'Desvinculou da tarefa',
};

const FIELD_LABELS: Record<string, string> = {
  title: 'Título',
  description: 'Descrição',
  status: 'Situação',
  ownerId: 'Responsável',
  peopleIds: 'Participantes',
  startDate: 'Início',
  dueDate: 'Prazo',
  dueTime: 'Hora do prazo',
  done: 'Etapa',
  steps: 'Etapas',
  links: 'Vínculos',
};

/** O nome de hoje de cada pessoa, pelo id. */
type Names = Readonly<Record<string, string>>;

function listOf(value: unknown[], field: string, names: Names): string {
  if (field === 'peopleIds')
    return value.map((id) => names[String(id)] ?? 'Sem cadastro').join(', ');
  if (field === 'steps') {
    return value
      .map((step) => (step as { label?: string }).label ?? '')
      .filter(Boolean)
      .join(', ');
  }

  return `${value.length} ${value.length === 1 ? 'item' : 'itens'}`;
}

/** Como cada campo se lê, quando não é texto puro. */
const FORMATTERS: Record<string, (value: unknown, names: Names) => string> = {
  status: (value) => TASK_STATUS_LABELS[value as TaskStatus] ?? String(value),
  done: (value) => (value ? 'Feita' : 'A fazer'),
  ownerId: (value, names) => names[String(value)] ?? 'Sem cadastro',
  startDate: (value) => formatDay(String(value)),
  dueDate: (value) => formatDay(String(value)),
};

/** O valor como se lê: a situação pelo nome, a pessoa pelo nome, o dia no formato daqui. */
export function readableValue(field: string, value: unknown, names: Names): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return listOf(value, field, names);

  return FORMATTERS[field]?.(value, names) ?? String(value);
}

function toneOf(entry: TaskHistoryEntry): StatusBadgeTone {
  const status = entry.changes.find((change) => change.field === 'status')?.to;
  if (status === 'done') return 'success';
  if (status === 'reopened') return 'warning';

  return 'info';
}

/** Cada mudança gravada, em frase, com o nome da tarefa em cima (como no Paralegal). */
export function taskTimelineOf(
  entries: readonly TaskHistoryEntry[],
  title: string,
  names: Names,
): TaskTimelineEntry[] {
  return entries.map((entry) => ({
    id: entry.id,
    kindLabel: ACTION_LABELS[entry.action] ?? 'Mexeu na tarefa',
    tone: toneOf(entry),
    authorName: entry.actorName ?? 'Sistema',
    createdAt: entry.occurredAt,
    lines: [
      `Tarefa: ${title}`,
      ...entry.changes
        .filter((change) => FIELD_LABELS[change.field])
        .map(
          (change) =>
            `${FIELD_LABELS[change.field]}: ${readableValue(change.field, change.to, names)}`,
        ),
    ],
  }));
}
