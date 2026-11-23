import { type Task } from '@template/shared/schemas/task.schema';
import { type DirectoryUser } from '@template/shared/schemas/user.schema';

import { type TaskWithRelations } from '../repository/tasks.repository';

type Person = Task['owner'];

/**
 * A pessoa pelo ID, com nome e foto do diretório. ID que o diretório não conhece (gente que
 * saiu) continua aparecendo — sem nome —, para a tarefa não perder de quem era.
 */
export function personOf(id: string | null, directory: ReadonlyMap<string, DirectoryUser>): Person {
  if (!id) return null;
  const user = directory.get(id);

  return { id, name: user?.name ?? null, avatarUrl: user?.image ?? null };
}

export function toTask(
  row: TaskWithRelations,
  directory: ReadonlyMap<string, DirectoryUser>,
): Task {
  const done = row.steps.filter((step) => step.doneAt).length;

  return {
    id: row.id,
    area: row.area,
    title: row.title,
    description: row.description,
    status: row.status,
    origin: row.origin,
    ticketId: row.ticketId,
    computerId: row.computerId,
    owner: personOf(row.ownerId, directory),
    people: row.people.flatMap((person) => {
      const resolved = personOf(person.personId, directory);
      return resolved ? [resolved] : [];
    }),
    startDate: row.startDate,
    dueDate: row.dueDate,
    dueTime: row.dueTime ? row.dueTime.slice(0, 5) : null,
    steps: row.steps.map((step) => ({
      id: step.id,
      label: step.label,
      position: step.position,
      done: step.doneAt !== null,
      doneAt: step.doneAt?.toISOString() ?? null,
    })),
    links: row.links.map((link) => ({
      id: link.id,
      kind: link.kind,
      targetId: link.targetId,
      label: link.label,
    })),
    progress: { done, total: row.steps.length },
    finishedAt: row.finishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** O título da tarefa de um chamado: o texto do pedido numa linha, no tamanho do título. */
export function ticketTaskTitle(description: string): string {
  const line = description.replace(/\s+/g, ' ').trim();

  return line.length > 160 ? `${line.slice(0, 157)}…` : line || 'Chamado sem descrição';
}
