import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TaskFormDialog from './azuos-task-form-dialog.svelte';

const empty = { value: '', error: null };

function setup(over: { titleError?: string } = {}) {
  const actions = {
    onChange: vi.fn(),
    onPeopleChange: vi.fn(),
    onAddStep: vi.fn(),
    onRenameStep: vi.fn(),
    onRemoveStep: vi.fn(),
    onAddLink: vi.fn(),
    onRemoveLink: vi.fn(),
    searchLinkOptions: vi.fn().mockResolvedValue([{ id: 56, label: 'CH-0056 · Marta' }]),
    onSubmit: vi.fn(),
    onClose: vi.fn(),
  };
  render(TaskFormDialog, {
    props: {
      data: {
        mode: 'create',
        fields: {
          title: { value: '', error: over.titleError ?? null },
          description: empty,
          ownerId: { value: 'person-ana', error: null },
          startDate: { value: '2026-11-23', error: null },
          dueDate: empty,
          dueTime: empty,
        },
        people: [{ id: 'person-ana', name: 'Ana Prado', photo: null }],
        peopleIds: [],
        steps: [],
        links: [],
      },
      state: { isOpen: true },
      actions,
    },
  });
  return actions;
}

describe('AzuosTaskFormDialog', () => {
  // feliz
  it('adds a step with Enter, finds something to link and submits', async () => {
    const actions = setup();

    await userEvent.type(screen.getByRole('textbox', { name: 'Nova etapa' }), 'Comprar{Enter}');
    expect(actions.onAddStep).toHaveBeenCalledWith('Comprar');

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Buscar o item para vincular' }),
      'marta{Enter}',
    );
    await userEvent.click(await screen.findByRole('button', { name: 'CH-0056 · Marta' }));
    expect(actions.onAddLink).toHaveBeenCalledWith({
      kind: 'ticket',
      targetId: 56,
      label: 'CH-0056 · Marta',
    });

    await userEvent.click(screen.getByRole('button', { name: 'Criar tarefa' }));
    expect(actions.onSubmit).toHaveBeenCalled();
  });

  // triste
  it('shows the field error that comes ready from the model', () => {
    setup({ titleError: 'Dê um título à tarefa' });

    expect(screen.getByText('Dê um título à tarefa')).toBeInTheDocument();
  });
});
