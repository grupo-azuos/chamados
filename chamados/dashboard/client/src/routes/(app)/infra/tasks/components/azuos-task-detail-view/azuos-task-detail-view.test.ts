import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TEST_NOW, taskFixture } from '../task-fixture.test-support';
import TaskDetailView, { type AzuosTaskDetailViewProps } from './azuos-task-detail-view.svelte';

const STATE: AzuosTaskDetailViewProps['state'] = {
  isLoading: false,
  isHistoryLoading: false,
  isBusy: false,
  error: null,
  actionError: null,
};

function setup(over: Record<string, unknown> = {}, state: Partial<typeof STATE> = {}) {
  const actions = {
    onFinish: vi.fn(),
    onReopen: vi.fn(),
    onToggleStep: vi.fn(),
    onEditSteps: vi.fn(),
    onStepsChange: vi.fn(),
    onSaveSteps: vi.fn(),
    onCancelSteps: vi.fn(),
    onEdit: vi.fn(),
    onRemoveLink: vi.fn(),
    onRemove: vi.fn(),
  };
  render(TaskDetailView, {
    props: {
      data: {
        task: taskFixture({ origin: 'manual' }),
        timeline: [],
        stepsDraft: null,
        now: TEST_NOW,
        ...over,
      },
      state: { ...STATE, ...state },
      actions,
    },
  });
  return actions;
}

describe('AzuosTaskDetailView', () => {
  // feliz
  it('shows the task with who made each step, and finishes, edits and removes it', async () => {
    const actions = setup();

    expect(screen.getByRole('heading', { name: 'Trocar o switch da sala 2' })).toBeInTheDocument();
    expect(screen.getByText('feita por Ana Prado')).toBeInTheDocument();
    expect(screen.getByText('Criada por')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
    expect(actions.onFinish).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Personalizar' }));
    expect(actions.onEditSteps).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(actions.onRemove).toHaveBeenCalled();
  });

  // feliz
  it('builds the flow: rename, move, remove and add steps, then save', async () => {
    const actions = setup({
      stepsDraft: [
        { id: 11, label: 'Comprar' },
        { id: 12, label: 'Instalar' },
      ],
    });

    await userEvent.click(screen.getAllByRole('button', { name: 'Descer etapa' })[0]!);
    expect(actions.onStepsChange).toHaveBeenLastCalledWith([
      { id: 12, label: 'Instalar' },
      { id: 11, label: 'Comprar' },
    ]);
    await userEvent.click(screen.getByRole('button', { name: 'Pôr etapa' }));
    expect(actions.onStepsChange).toHaveBeenLastCalledWith([
      { id: 11, label: 'Comprar' },
      { id: 12, label: 'Instalar' },
      { label: '' },
    ]);
    await userEvent.click(screen.getAllByRole('button', { name: 'Tirar etapa' })[1]!);
    expect(actions.onStepsChange).toHaveBeenLastCalledWith([{ id: 11, label: 'Comprar' }]);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar fluxo' }));
    expect(actions.onSaveSteps).toHaveBeenCalled();
  });

  // feliz
  it('a ticket task opens the ticket instead of finishing, and cannot be removed', () => {
    setup({ task: taskFixture({ origin: 'ticket', ticketId: 56 }) });

    expect(screen.getByRole('link', { name: /Abrir o chamado/ })).toHaveAttribute(
      'href',
      '/infra/tickets/56',
    );
    expect(screen.queryByRole('button', { name: 'Finalizar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
  });

  // triste
  it('says the task was not found, and that it is loading', () => {
    setup({ task: null }, { error: 'Tarefa não encontrada.' });
    expect(screen.getByText('Tarefa não encontrada.')).toBeInTheDocument();
  });
});
