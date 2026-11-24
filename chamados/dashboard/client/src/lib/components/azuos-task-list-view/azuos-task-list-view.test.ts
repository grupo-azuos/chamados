import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type TaskListModel } from '$lib/hooks/use-task-list/use-task-list.svelte';
import { TEST_NOW, taskFixture } from '$lib/utils/task-fixture.test-support';
import TaskListView, { taskFilterPanelOf } from './azuos-task-list-view.svelte';

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
    onShiftWindow: vi.fn(),
    onWindowToday: vi.fn(),
    onZoom: vi.fn(),
    onOpen: vi.fn(),
    onClose: vi.fn(),
    onMove: vi.fn(),
    onStage: vi.fn(),
    onToggleStep: vi.fn(),
    onRemoveLink: vi.fn(),
    onAskRemove: vi.fn(),
    onCancelRemove: vi.fn(),
    onConfirmRemove: vi.fn(),
    onRestore: vi.fn(),
    onRetry: vi.fn(),
    onNew: vi.fn(),
    onRefuse: vi.fn(),
    map: { onPeopleChange: vi.fn(), onIslandMove: vi.fn(), onResetLayout: vi.fn() },
    onNewStage: vi.fn(),
    onEditStage: vi.fn(),
  };
  render(TaskListView, {
    props: {
      data: {
        area: 'infra',
        view: 'list',
        tasks: [taskFixture()],
        total: 1,
        alerts: { overdue: 1, dueSoon: 0 },
        filter: {
          search: '',
          status: '',
          origin: '',
          ownerId: '',
          mine: false,
          overdue: false,
          archived: 'hide' as const,
        },
        activeFilterCount: 0,
        page: 1,
        pageSize: 15,
        month: '2026-11',
        window: { from: '2026-11-16', to: '2026-12-20' },
        zoom: 'month',
        map: { peopleIds: [], positions: {} },
        stages: [],
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

  // feliz
  it('shows "Em uso / Arquivadas" below the filters and asks for the archived ones', async () => {
    const actions = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Arquivadas' }));

    expect(actions.onFilterChange).toHaveBeenCalledWith('archived', 'only');
  });

  // triste
  it('turns the hidden filters into chips, and the map drops the owner field', () => {
    const base = {
      view: 'list' as const,
      filter: {
        search: '',
        status: 'open' as const,
        origin: '' as const,
        ownerId: 'ana',
        mine: false,
        overdue: true,
        archived: 'hide' as const,
      },
      stages: [],
      people: [{ id: 'ana', name: 'Ana Prado', photo: null }],
    };

    const panel = taskFilterPanelOf(base as never);
    expect(panel.chips.map((chip) => chip.label)).toEqual([
      'Responsável: Ana Prado',
      'Aberta',
      'Atrasadas',
    ]);
    expect(panel.canClear).toBe(true);
    expect(taskFilterPanelOf({ ...base, view: 'map' } as never).primary).toBeUndefined();
  });
});
