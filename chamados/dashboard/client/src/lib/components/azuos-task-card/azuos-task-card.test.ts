import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TEST_NOW, taskFixture } from '$lib/utils/task-fixture.test-support';
import TaskCard from './azuos-task-card.svelte';

function setup(task = taskFixture()) {
  const actions = { onOpen: vi.fn(), onMove: vi.fn(), onRemove: vi.fn(), onRestore: vi.fn() };
  render(TaskCard, { props: { data: { task, now: TEST_NOW }, actions } });
  return actions;
}

async function openMenu() {
  await userEvent.click(screen.getByRole('button', { name: /Ações da tarefa/ }));
}

describe('AzuosTaskCard', () => {
  // feliz
  it('finishes a manual task from the menu', async () => {
    const actions = setup();

    await openMenu();
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Finalizar' }));
    expect(actions.onMove).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), 'done');
  });

  // feliz
  it('archives a task from the menu — a ticket task too, which only does not finish here', async () => {
    const actions = setup(taskFixture({ origin: 'ticket', ticketId: 56 }));

    expect(screen.getByText('CH-0056')).toBeInTheDocument();
    await openMenu();
    expect(screen.queryByRole('menuitem', { name: 'Finalizar' })).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Arquivar' }));
    expect(actions.onRemove).toHaveBeenCalled();
  });

  // triste
  it('an archived task only offers "Desarquivar"', async () => {
    const actions = setup(
      taskFixture({ archive: { archivedAt: '2026-11-20T10:00:00.000Z', archivedBy: 'ana' } }),
    );

    await openMenu();
    expect(screen.queryByRole('menuitem', { name: 'Finalizar' })).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Desarquivar' }));
    expect(actions.onRestore).toHaveBeenCalled();
  });
});
