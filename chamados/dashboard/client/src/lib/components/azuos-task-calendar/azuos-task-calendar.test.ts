import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TEST_NOW, taskFixture } from '$lib/utils/task-fixture.test-support';
import TaskCalendar, { taskEventOf } from './azuos-task-calendar.svelte';

/* Um mês que não é o de hoje: o calendário abre no dia 1 (no mês de hoje, abriria em hoje). */
function setup(tasks = [taskFixture()], month = '2026-11') {
  const actions = { onOpen: vi.fn(), onRangeChange: vi.fn() };
  render(TaskCalendar, { props: { data: { tasks, month, now: TEST_NOW }, actions } });
  return actions;
}

describe('AzuosTaskCalendar', () => {
  // feliz
  it('shows the month of the big-calendar, opens the task and asks for the next period', async () => {
    vi.useFakeTimers({ now: new Date(2027, 0, 10, 12), shouldAdvanceTime: true });
    const actions = setup();
    vi.useRealTimers();

    expect(screen.getByRole('heading', { name: 'novembro de 2026' })).toBeInTheDocument();
    expect(actions.onRangeChange).toHaveBeenCalledWith({
      view: 'month',
      from: '2026-11-01',
      to: '2026-12-05',
      anchor: '2026-11-01',
    });
    await userEvent.click(screen.getByRole('button', { name: 'Trocar o switch da sala 2' }));
    expect(actions.onOpen).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Próximo: mês' }));
    expect(actions.onRangeChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ anchor: '2026-12-01' }),
    );
  });

  // feliz
  it('offers month, week, day, list and year', async () => {
    const actions = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Ano' }));

    expect(screen.getByRole('heading', { name: '2026' })).toBeInTheDocument();
    expect(actions.onRangeChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ view: 'year', from: '2026-01-01', to: '2026-12-31' }),
    );
  });

  // triste
  it('shows "+N mais" when a day has more tasks than fit, and colors a finished task green', () => {
    setup([1, 2, 3, 4, 5].map((id) => taskFixture({ id, title: `Tarefa ${id}` })));

    expect(screen.getByText('+2 mais')).toBeInTheDocument();
    expect(taskEventOf(taskFixture({ status: 'done' }), TEST_NOW).color).toBe('var(--success)');
  });
});
