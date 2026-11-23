import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TEST_NOW, taskFixture } from '../task-fixture.test-support';
import TaskCalendar from './azuos-task-calendar.svelte';

function setup(tasks = [taskFixture()]) {
  const actions = { onOpen: vi.fn(), onMonthChange: vi.fn() };
  render(TaskCalendar, {
    props: { data: { tasks, month: '2026-11', today: '2026-11-23', now: TEST_NOW }, actions },
  });
  return actions;
}

describe('AzuosTaskCalendar', () => {
  // feliz
  it('puts the task on its due day, opens it and changes the month', async () => {
    const actions = setup();

    expect(screen.getByRole('heading', { name: 'Novembro de 2026' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Trocar o switch da sala 2' }));
    expect(actions.onOpen).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(actions.onMonthChange).toHaveBeenCalledWith('2026-12');
  });

  // triste
  it('shows "+N" when a day has more tasks than fit', () => {
    setup([1, 2, 3, 4, 5].map((id) => taskFixture({ id, title: `Tarefa ${id}` })));

    expect(screen.getByText('+2')).toBeInTheDocument();
  });
});
