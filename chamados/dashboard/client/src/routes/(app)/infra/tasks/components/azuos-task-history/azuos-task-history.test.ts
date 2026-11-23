import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import TaskHistory, { formatHistoryDateTime } from './azuos-task-history.svelte';

describe('AzuosTaskHistory', () => {
  // feliz
  it('shows each change with who did it and what changed', () => {
    render(TaskHistory, {
      props: {
        data: {
          entries: [
            {
              id: 1,
              kindLabel: 'Mudou a situação da tarefa',
              tone: 'success',
              authorName: 'Ana Prado',
              createdAt: '2026-11-20T12:24:00.000Z',
              lines: ['Tarefa: Trocar o switch', 'Situação: Finalizada'],
            },
          ],
        },
      },
    });

    expect(screen.getByText('Mudou a situação da tarefa')).toBeInTheDocument();
    expect(screen.getByText('Ana Prado')).toBeInTheDocument();
    expect(screen.getByText(/Situação: Finalizada/)).toBeInTheDocument();
  });

  // triste
  it('says nothing was recorded, says it is loading, and survives a broken date', () => {
    const { rerender } = render(TaskHistory, { props: { data: { entries: [] } } });
    expect(screen.getByText('Nada registrado ainda.')).toBeInTheDocument();

    rerender({ data: { entries: [] }, state: { isLoading: true } });
    expect(screen.getByText('Carregando a linha do tempo…')).toBeInTheDocument();
    expect(formatHistoryDateTime('não é data')).toBe('—');
  });
});
