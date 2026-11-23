import { type Task } from '@template/shared/schemas/task.schema';

/**
 * UMA TAREFA DE MENTIRA para testes e stories — nome e dados inventados (nada de gente real).
 * Cada chamada aceita o que muda; o resto é uma tarefa manual, aberta, com duas etapas.
 */
export function taskFixture(over: Partial<Task> = {}): Task {
  return {
    id: 1,
    area: 'infra',
    title: 'Trocar o switch da sala 2',
    description: 'O switch velho está perdendo pacotes.',
    status: 'open',
    stage: null,
    origin: 'manual',
    ticketId: null,
    computerId: null,
    owner: { id: 'person-ana', name: 'Ana Prado', avatarUrl: null },
    people: [{ id: 'person-bia', name: 'Bia Costa', avatarUrl: null }],
    startDate: '2026-11-10',
    dueDate: '2026-11-28',
    dueTime: null,
    steps: [
      {
        id: 11,
        label: 'Comprar',
        position: 0,
        done: true,
        doneAt: '2026-11-20T10:00:00.000Z',
        doneBy: { id: 'person-ana', name: 'Ana Prado', avatarUrl: null },
      },
      { id: 12, label: 'Instalar', position: 1, done: false, doneAt: null, doneBy: null },
    ],
    links: [{ id: 101, kind: 'computer', targetId: 3, label: 'Computador 02' }],
    progress: { done: 1, total: 2 },
    finishedAt: null,
    createdBy: { id: 'person-ana', name: 'Ana Prado', avatarUrl: null },
    createdAt: '2026-11-10T10:00:00.000Z',
    updatedAt: '2026-11-20T10:00:00.000Z',
    ...over,
  };
}

/** 23/11/2026, 14h em Brasília — o relógio fixo dos testes. */
export const TEST_NOW = new Date('2026-11-23T17:00:00Z');
