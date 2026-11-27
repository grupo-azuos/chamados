import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TEST_NOW, taskFixture } from '$lib/utils/task-fixture.test-support';
import TaskTable from './azuos-task-table.svelte';

function setup(tasks = [taskFixture({ dueDate: '2026-11-20' })]) {
  const actions = { onOpen: vi.fn(), onMove: vi.fn(), onRemove: vi.fn(), onRestore: vi.fn() };
  render(TaskTable, { props: { data: { tasks, now: TEST_NOW }, actions } });

  return actions;
}

describe('AzuosTaskTable', () => {
  // feliz
  it('shows each task with status, origin, owner, due badge and steps, and opens it', async () => {
    const actions = setup();

    expect(screen.getByText('Aberta')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();
    expect(screen.getByText('Ana Prado')).toBeInTheDocument();
    expect(screen.getByText('Atrasada · 20/11/2026')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Abrir a tarefa Trocar o switch da sala 2' }));
    expect(actions.onOpen).toHaveBeenCalled();
  });

  // feliz
  it('finishes the task from the three-dot menu', async () => {
    const actions = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Ações da tarefa Trocar o switch da sala 2' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Finalizar' }));
    expect(actions.onMove).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), 'done');
  });

  // triste
  it('says when there is no owner and no due date', () => {
    setup([taskFixture({ owner: null, dueDate: null, links: [] })]);

    expect(screen.getByText('Sem responsável')).toBeInTheDocument();
    expect(screen.getByText('Sem prazo')).toBeInTheDocument();
    expect(screen.queryByText(/vínculo/)).not.toBeInTheDocument();
  });
});
