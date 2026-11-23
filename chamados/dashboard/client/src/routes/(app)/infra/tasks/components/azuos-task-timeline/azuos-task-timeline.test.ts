import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TEST_NOW, taskFixture } from '../task-fixture.test-support';
import TaskTimeline, { dayHeadOf } from './azuos-task-timeline.svelte';

const WINDOW = { from: '2026-11-16', to: '2026-12-20' };

function setup(tasks = [taskFixture()], window = WINDOW) {
  const actions = { onShift: vi.fn(), onToday: vi.fn(), onZoom: vi.fn(), onOpen: vi.fn() };
  render(TaskTimeline, {
    props: { data: { tasks, window, zoom: 'month', today: '2026-11-23', now: TEST_NOW }, actions },
  });
  return actions;
}

describe('AzuosTaskTimeline', () => {
  // feliz
  it('groups the tasks by owner, with the title inside the bar, and opens the task', async () => {
    const actions = setup([
      taskFixture({
        id: 1,
        title: 'Trocar o switch',
        startDate: '2026-11-18',
        dueDate: '2026-11-25',
      }),
      taskFixture({
        id: 2,
        title: 'Sem dono',
        owner: null,
        startDate: '2026-11-20',
        dueDate: '2026-11-20',
      }),
    ]);

    const ana = screen.getByRole('rowgroup', { name: 'Ana Prado' });
    expect(within(ana).getByText('1 tarefa')).toBeInTheDocument();
    expect(screen.getByRole('rowgroup', { name: 'Sem responsável' })).toBeInTheDocument();
    const bar = screen.getByRole('button', {
      name: /Abrir a tarefa Trocar o switch · Aberta, de 18\/11\/2026 a 25\/11\/2026/,
    });
    expect(bar).toHaveTextContent('Trocar o switch');
    await userEvent.click(bar);
    expect(actions.onOpen).toHaveBeenCalled();
  });

  // feliz
  it('shows "até dd/mm" when the bar goes past the window, and moves by weeks and zoom', async () => {
    const actions = setup([
      taskFixture({ id: 3, title: 'Longa', startDate: '2026-11-10', dueDate: '2027-01-05' }),
    ]);

    expect(screen.getByRole('button', { name: /Abrir a tarefa Longa/ })).toHaveTextContent(
      'até 05/01',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Próxima semana' }));
    expect(actions.onShift).toHaveBeenCalledWith(1);
    await userEvent.click(screen.getByRole('button', { name: 'Semana' }));
    expect(actions.onZoom).toHaveBeenCalledWith('week');
    expect(dayHeadOf('2026-12-01', 5)).toBe('dez');
    expect(dayHeadOf('2026-11-23', 5)).toBe('S');
  });

  // triste
  it('says no task falls in these days', () => {
    setup([taskFixture({ startDate: '2027-03-01', dueDate: '2027-03-02' })]);

    expect(screen.getByText('Nenhuma tarefa nestes dias')).toBeInTheDocument();
  });
});
