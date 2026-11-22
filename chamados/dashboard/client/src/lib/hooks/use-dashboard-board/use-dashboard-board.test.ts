import { page } from '$app/state';
import { type Board, type Widget } from '@template/shared/schemas/dashboard-board.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-dashboard-board-harness.test.svelte';
import { type DashboardBoardModel } from './use-dashboard-board.svelte';

vi.mock('$lib/api/dashboard-boards.api', () => ({
  dashboardBoardsApi: { board: vi.fn(), saveBoard: vi.fn(), data: vi.fn() },
}));

vi.mock('$lib/api/departments.api', () => ({
  departmentsApi: { catalog: vi.fn().mockResolvedValue({ rh: [], local: [], isRhAvailable: false }) },
}));
vi.mock('$lib/api/tickets.api', () => ({
  ticketsApi: { assigneeOptions: vi.fn().mockResolvedValue([]), peopleOptions: vi.fn().mockResolvedValue([]) },
}));

const { dashboardBoardsApi } = await import('$lib/api/dashboard-boards.api');

const WIDGET: Widget = {
  id: 'a',
  kind: 'column',
  title: 'Chamados por situação',
  source: 'infraTickets',
  groupBy: 'status',
  splitBy: null,
  filterId: null,
  onlyMine: false,
  period: 'all',
  window: null,
};

const BOARD: Board = {
  module: 'infra',
  scope: 'team',
  widgets: [WIDGET],
  layout: [{ i: 'a', x: 0, y: 0, w: 2, h: 2 }],
  filters: [],
  updatedAt: null,
  updatedBy: null,
  canEdit: true,
};

const DATA = { total: 3, grandTotal: 5, series: [{ key: 'open', label: 'Aberto', value: 3 }], cells: [] };

function mount(): DashboardBoardModel {
  let model!: DashboardBoardModel;
  render(Harness, { props: { module: 'infra', onReady: (ready: DashboardBoardModel) => (model = ready) } });

  return model;
}

describe('useDashboardBoardModel', () => {
  beforeEach(() => {
    localStorage.clear();
    (page as { data: Record<string, unknown> }).data = {
      user: { id: 'u-bia', name: 'Bia', email: 'bia@empresa.com.br', role: 'user', roles: { infra: 'user' } },
    };
    vi.mocked(dashboardBoardsApi.board).mockReset().mockResolvedValue(BOARD);
    vi.mocked(dashboardBoardsApi.data).mockReset().mockResolvedValue(DATA);
    vi.mocked(dashboardBoardsApi.saveBoard).mockReset();
  });

  // feliz
  it('opens the team board of the module and counts each block', async () => {
    const model = mount();

    await waitFor(() => expect(model.data.results.a?.data).toEqual(DATA));
    expect(dashboardBoardsApi.board).toHaveBeenCalledWith('infra', 'team');
    expect(model.data.scopes.map((scope) => scope.value)).toEqual(['team', 'personal']);
  });

  // feliz
  it('builds in a draft that only "Save" writes', async () => {
    vi.mocked(dashboardBoardsApi.saveBoard).mockResolvedValue({ ...BOARD, widgets: [] , layout: [] });
    const model = mount();
    await waitFor(() => expect(model.data.widgets).toHaveLength(1));

    model.actions.onStartEdit();
    model.actions.onRemoveWidget('a');
    expect(model.data.widgets).toHaveLength(0);
    expect(dashboardBoardsApi.saveBoard).not.toHaveBeenCalled();

    model.actions.onSave();
    await waitFor(() => expect(model.state.isEditing).toBe(false));
    expect(dashboardBoardsApi.saveBoard).toHaveBeenCalledWith('infra', 'team', { widgets: [], layout: [], filters: [] });
  });

  // triste
  it('drops the draft when the person gives up', async () => {
    const model = mount();
    await waitFor(() => expect(model.data.widgets).toHaveLength(1));

    model.actions.onStartEdit();
    model.actions.onRemoveWidget('a');
    model.actions.onCancelEdit();

    expect(model.data.widgets).toHaveLength(1);
  });

  // triste
  it('refuses a tab the person cannot see', async () => {
    const model = mount();
    await waitFor(() => expect(model.state.isLoading).toBe(false));

    model.actions.onScopeChange('manager');

    expect(model.data.scope).toBe('team');
  });

  // triste
  it('keeps the draft open with the reason when saving is refused', async () => {
    vi.mocked(dashboardBoardsApi.saveBoard).mockRejectedValue(new ApiError(422, 'Passa da cota'));
    const model = mount();
    await waitFor(() => expect(model.data.widgets).toHaveLength(1));

    model.actions.onStartEdit();
    model.actions.onSave();

    await waitFor(() => expect(model.state.error).toBe('Não salvei o painel: Passa da cota'));
    expect(model.state.isEditing).toBe(true);
  });
});
