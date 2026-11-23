import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type TaskListModel } from '$lib/hooks/use-task-list/use-task-list.svelte';
import { TEST_NOW, taskFixture } from '../task-fixture.test-support';
import TaskListView from './azuos-task-list-view.svelte';

function setup(
  over: Partial<TaskListModel['data']> = {},
  state: Partial<TaskListModel['state']> = {},
) {
  const actions = {
    onViewChange: vi.fn(),
    onSearchChange: vi.fn(),
    onFilterChange: vi.fn(),
    onClearFilters: vi.fn(),
    onPageChange: vi.fn(),
    onMonthChange: vi.fn(),
    onRangeChange: vi.fn(),
    onOpen: vi.fn(),
    onClose: vi.fn(),
    onMove: vi.fn(),
    onToggleStep: vi.fn(),
    onRemoveLink: vi.fn(),
    onAskRemove: vi.fn(),
    onCancelRemove: vi.fn(),
    onConfirmRemove: vi.fn(),
    onRetry: vi.fn(),
    onNew: vi.fn(),
    onRefuse: vi.fn(),
  };
  render(TaskListView, {
    props: {
      data: {
        area: 'infra',
        view: 'list',
        tasks: [taskFixture()],
        total: 1,
        alerts: { overdue: 1, dueSoon: 0 },
        filter: { search: '', status: '', origin: '', ownerId: '', mine: false, overdue: false },
        activeFilterCount: 0,
        page: 1,
        pageSize: 15,
        month: '2026-11',
        people: [],
        selected: null,
        removing: null,
        today: '2026-11-23',
        now: TEST_NOW,
        ...over,
      },
      state: {
        isLoading: false,
        isEmpty: false,
        isFilteredOut: false,
        isTruncated: false,
        isMutating: false,
        error: null,
        actionError: null,
        ...state,
      },
      actions,
    },
  });
  return actions;
}

describe('AzuosTaskListView', () => {
  // feliz
  it('lists the tasks, switches the view, filters the overdue ones and creates a new one', async () => {
    const actions = setup();

    expect(
      screen.getByRole('button', { name: 'Abrir a tarefa Trocar o switch da sala 2' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Quadro' }));
    expect(actions.onViewChange).toHaveBeenCalledWith('board');
    await userEvent.click(screen.getByRole('button', { name: /Atrasadas/ }));
    expect(actions.onFilterChange).toHaveBeenCalledWith('overdue', true);
    await userEvent.click(screen.getByRole('button', { name: 'Nova tarefa' }));
    expect(actions.onNew).toHaveBeenCalled();
  });

  // triste
  it('explains the empty list and the list emptied by filters', () => {
    setup({ tasks: [], total: 0 }, { isEmpty: true });
    expect(screen.getByText('Nenhuma tarefa ainda')).toBeInTheDocument();
  });

  // triste
  it('shows the error with a retry', async () => {
    const actions = setup({ tasks: [] }, { error: 'A API está fora do ar.' });
    expect(screen.getByText('A API está fora do ar.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }));
    expect(actions.onRetry).toHaveBeenCalled();
  });
});
