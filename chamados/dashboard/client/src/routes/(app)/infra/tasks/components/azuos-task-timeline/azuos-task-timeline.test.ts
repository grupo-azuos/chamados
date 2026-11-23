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
