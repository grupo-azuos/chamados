import { describe, expect, it } from 'vitest';

import { readableValue, taskTimelineOf } from './task-history.util';

const NAMES = { ana: 'Ana Prado' };

describe('task timeline in words', () => {
  // feliz
  it('turns each recorded change into a sentence, with the task on top', () => {
    const [entry] = taskTimelineOf(
      [
        {
          id: 1,
          action: 'setStatus',
          actorName: 'Ana Prado',
          occurredAt: '2026-11-20T10:00:00.000Z',
          changes: [{ field: 'status', from: null, to: 'done' }],
        },
      ],
      'Trocar o switch',
      NAMES,
    );

    expect(entry).toMatchObject({
      kindLabel: 'Mudou a situação da tarefa',
      tone: 'success',
      authorName: 'Ana Prado',
      lines: ['Tarefa: Trocar o switch', 'Situação: Finalizada'],
    });
  });

  // feliz
  it('reads people, days, steps and lists by name', () => {
    expect(readableValue('ownerId', 'ana', NAMES)).toBe('Ana Prado');
    expect(readableValue('peopleIds', ['ana', 'x'], NAMES)).toBe('Ana Prado, Sem cadastro');
    expect(readableValue('dueDate', '2026-11-30', NAMES)).toBe('30/11/2026');
    expect(readableValue('steps', [{ label: 'Comprar' }, { label: 'Instalar' }], NAMES)).toBe(
      'Comprar, Instalar',
    );
    expect(readableValue('links', [{}, {}], NAMES)).toBe('2 itens');
    expect(readableValue('done', false, NAMES)).toBe('A fazer');
  });

  // feliz
  it('reads the registered maintenance and the note in words', () => {
    const [maintenance, note] = taskTimelineOf(
      [
        {
          id: 2,
          action: 'registerMaintenance',
          actorName: 'Ana Prado',
          occurredAt: '2026-11-25T10:00:00.000Z',
          changes: [
            { field: 'maintenance', from: null, to: 'Preventiva: Limpeza' },
            { field: 'performedByIds', from: null, to: ['ana', 'x'] },
            { field: 'status', from: null, to: 'done' },
          ],
        },
        {
          id: 3,
          action: 'addNote',
          actorName: 'Ana Prado',
          occurredAt: '2026-11-25T11:00:00.000Z',
          changes: [{ field: 'note', from: null, to: 'Máquina livre às 14h.' }],
        },
      ],
      'Preventiva — Computador 02',
      NAMES,
    );

    expect(maintenance).toMatchObject({
      kindLabel: 'Registrou a manutenção',
      tone: 'success',
      lines: [
        'Tarefa: Preventiva — Computador 02',
        'O que foi feito: Preventiva: Limpeza',
        'Quem fez: Ana Prado, Sem cadastro',
        'Situação: Finalizada',
      ],
    });
    expect(note).toMatchObject({
      kindLabel: 'Anotou',
      lines: ['Tarefa: Preventiva — Computador 02', 'Anotação: Máquina livre às 14h.'],
    });
  });

  // triste
  it('falls back for an unknown action, a missing actor and empty values, and skips unknown fields', () => {
    const [entry] = taskTimelineOf(
      [
        {
          id: 2,
          action: 'other',
          actorName: null,
          occurredAt: '2026-11-20T10:00:00.000Z',
          changes: [{ field: 'x', from: 1, to: 2 }],
        },
      ],
      'T',
      NAMES,
    );

    expect(entry).toMatchObject({
      kindLabel: 'Mexeu na tarefa',
      tone: 'info',
      authorName: 'Sistema',
      lines: ['Tarefa: T'],
    });
    expect(readableValue('title', '', NAMES)).toBe('—');
    expect(readableValue('ownerId', 'z', NAMES)).toBe('Sem cadastro');
  });
});
