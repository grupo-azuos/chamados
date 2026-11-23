import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import { taskFixture } from '../task-fixture.test-support';
import TaskBoard, { moveOfTaskDrop } from './azuos-task-board.svelte';

describe('moveOfTaskDrop', () => {
  // feliz
  it('finishes on "Finalizada" and reopens a finished task on "Reaberta"', () => {
    expect(moveOfTaskDrop({ status: 'open', origin: 'manual' }, 'done')).toEqual({
      status: 'done',
    });
    expect(moveOfTaskDrop({ status: 'done', origin: 'maintenance' }, 'reopened')).toEqual({
      status: 'reopened',
    });
  });

  // triste
  it('refuses moving a ticket task and going back to "Aberta", and ignores the same column', () => {
    expect(moveOfTaskDrop({ status: 'open', origin: 'ticket' }, 'done')).toHaveProperty('refusal');
    expect(moveOfTaskDrop({ status: 'done', origin: 'manual' }, 'open')).toHaveProperty('refusal');
    expect(moveOfTaskDrop({ status: 'open', origin: 'manual' }, 'open')).toBeNull();
  });
});

describe('AzuosTaskBoard', () => {
  // feliz
  it('draws one column per status with its count', () => {
    render(TaskBoard, {
      props: {
        data: { tasks: [taskFixture(), taskFixture({ id: 2, status: 'done' })] },
        actions: { onOpen: vi.fn(), onMove: vi.fn(), onRefuse: vi.fn() },
      },
    });

    expect(screen.getByText('Aberta')).toBeInTheDocument();
    expect(screen.getByText('Reaberta')).toBeInTheDocument();
    expect(screen.getByText('Finalizada')).toBeInTheDocument();
    expect(screen.getAllByText('Arraste para cá.')).toHaveLength(1);
  });
});
