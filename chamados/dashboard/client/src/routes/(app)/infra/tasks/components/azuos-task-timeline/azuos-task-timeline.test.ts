import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TEST_NOW, taskFixture } from '../task-fixture.test-support';
import TaskTimeline from './azuos-task-timeline.svelte';

describe('AzuosTaskTimeline', () => {
  // feliz
  it('draws a bar for the task of the month and opens it', async () => {
    const onOpen = vi.fn();
    render(TaskTimeline, {
      props: {
        data: { tasks: [taskFixture()], month: '2026-11', today: '2026-11-23', now: TEST_NOW },
        actions: { onOpen, onMonthChange: vi.fn() },
      },
    });

    await userEvent.click(
      screen.getByRole('button', { name: 'Abrir a tarefa Trocar o switch da sala 2' }),
    );
    expect(onOpen).toHaveBeenCalled();
  });

  // feliz
  it('labels every bar with the deadline, the owner and the steps — inside a long bar, beside a short one', () => {
    render(TaskTimeline, {
      props: {
        data: {
          tasks: [
            taskFixture({ id: 1, title: 'Longa', startDate: '2026-11-02', dueDate: '2026-11-20' }),
            taskFixture({
              id: 2,
              title: 'Curta',
              startDate: '2026-11-05',
              dueDate: '2026-11-05',
              owner: null,
            }),
          ],
          month: '2026-11',
          today: '2026-11-23',
          now: TEST_NOW,
        },
        actions: { onOpen: vi.fn(), onMonthChange: vi.fn() },
      },
    });

    const long = screen.getByRole('button', { name: 'Abrir a tarefa Longa' });
    expect(long).toHaveTextContent(/Atrasada · 20\/11\/2026/);
    const short = screen.getByRole('button', { name: 'Abrir a tarefa Curta' });
    expect(short).toHaveTextContent('');
    expect(screen.getByText(/Atrasada · 05\/11\/2026 · Sem responsável/)).toHaveAttribute(
      'data-slot',
      'task-timeline-label',
    );
  });

  // triste
  it('says the month is empty when no task touches it', () => {
    render(TaskTimeline, {
      props: {
        data: { tasks: [taskFixture()], month: '2027-03', today: '2026-11-23', now: TEST_NOW },
        actions: { onOpen: vi.fn(), onMonthChange: vi.fn() },
      },
    });

    expect(screen.getByText('Nenhuma tarefa neste mês.')).toBeInTheDocument();
  });
});
