import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TEST_NOW, taskFixture } from '$lib/utils/task-fixture.test-support';
import TaskRow from './azuos-task-row.svelte';

describe('AzuosTaskRow', () => {
  // feliz
  it('shows the task with status, origin, owner, due badge and steps, and opens it', async () => {
    const onOpen = vi.fn();
    const task = taskFixture({ dueDate: '2026-11-20' });
    render(TaskRow, { props: { data: { task, now: TEST_NOW }, actions: { onOpen } } });

    expect(screen.getByText('Aberta')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();
    expect(screen.getByText('Ana Prado')).toBeInTheDocument();
    expect(screen.getByText('Atrasada · 20/11/2026')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Abrir a tarefa Trocar o switch da sala 2' }),
    );
    expect(onOpen).toHaveBeenCalledWith(task);
  });

  // triste
  it('says when there is no owner and no due date', () => {
    const task = taskFixture({ owner: null, dueDate: null, links: [] });
    render(TaskRow, { props: { data: { task, now: TEST_NOW }, actions: { onOpen: vi.fn() } } });

    expect(screen.getByText('Sem responsável')).toBeInTheDocument();
    expect(screen.getByText('Sem prazo')).toBeInTheDocument();
    expect(screen.queryByText(/vínculo/)).not.toBeInTheDocument();
  });
});
