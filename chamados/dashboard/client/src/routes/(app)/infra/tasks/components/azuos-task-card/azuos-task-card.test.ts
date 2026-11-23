import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TEST_NOW, taskFixture } from '../task-fixture.test-support';
import TaskCard from './azuos-task-card.svelte';

function setup(task = taskFixture()) {
  const actions = { onOpen: vi.fn(), onMove: vi.fn(), onRemove: vi.fn() };
  render(TaskCard, { props: { data: { task, now: TEST_NOW }, actions } });
  return actions;
}

describe('AzuosTaskCard', () => {
  // feliz
  it('finishes a manual task from the menu', async () => {
    const actions = setup();

    await userEvent.click(screen.getByRole('button', { name: /Ações da tarefa/ }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Finalizar' }));
    expect(actions.onMove).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), 'done');
  });

  // feliz
  it('removes a manual task from the menu', async () => {
    const actions = setup();

    await userEvent.click(screen.getByRole('button', { name: /Ações da tarefa/ }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Excluir' }));
    expect(actions.onRemove).toHaveBeenCalled();
  });

  // triste
  it('has no menu for a ticket task — it follows the ticket', () => {
    setup(taskFixture({ origin: 'ticket', ticketId: 56 }));

    expect(screen.queryByRole('button', { name: /Ações da tarefa/ })).not.toBeInTheDocument();
    expect(screen.getByText('CH-0056')).toBeInTheDocument();
  });
});
