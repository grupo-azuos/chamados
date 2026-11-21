import { type SavedFilter } from '@template/shared/schemas/dashboard-board.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-saved-filters-harness.test.svelte';
import { type SavedFiltersModel } from './use-saved-filters.svelte';

vi.mock('$lib/api/dashboard-boards.api', () => ({
  dashboardBoardsApi: {
    filters: vi.fn(),
    createFilter: vi.fn(),
    updateFilter: vi.fn(),
    archiveFilter: vi.fn(),
    restoreFilter: vi.fn(),
  },
}));

const { dashboardBoardsApi } = await import('$lib/api/dashboard-boards.api');

const FILTER: SavedFilter = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Urgentes',
  description: null,
  source: 'infraTickets',
  scope: 'shared',
  tree: { combinator: 'and', rules: [] },
  ownerId: 'u-ana',
  ownerName: 'Ana Lima',
  canEdit: true,
  archive: null,
  updatedAt: '2026-11-20T12:00:00.000Z',
};

const BODY = { name: 'Urgentes', description: null, source: 'infraTickets' as const, scope: 'shared' as const, tree: { combinator: 'and' as const, rules: [] } };

function mount(): SavedFiltersModel {
  let model!: SavedFiltersModel;
  render(Harness, { props: { onReady: (ready: SavedFiltersModel) => (model = ready) } });

  return model;
}

describe('useSavedFiltersModel', () => {
  beforeEach(() => {
    vi.mocked(dashboardBoardsApi.filters).mockReset().mockImplementation(async (_module, archived) => (archived === 'only' ? [] : [FILTER]));
    vi.mocked(dashboardBoardsApi.createFilter).mockReset().mockResolvedValue(FILTER);
    vi.mocked(dashboardBoardsApi.updateFilter).mockReset().mockResolvedValue(FILTER);
    vi.mocked(dashboardBoardsApi.archiveFilter).mockReset().mockResolvedValue(FILTER);
  });

  // feliz
  it('lists the filters of the module and saves a new one', async () => {
    const model = mount();
    await waitFor(() => expect(model.data.filters).toHaveLength(1));

    model.actions.onNew();
    model.actions.onSave(null, BODY);

    await waitFor(() => expect(dashboardBoardsApi.createFilter).toHaveBeenCalledWith('infra', BODY));
    await waitFor(() => expect(model.data.editing).toBeNull());
  });

  // feliz
  it('saves an edited filter by its id, and archives one', async () => {
    const model = mount();
    await waitFor(() => expect(model.data.filters).toHaveLength(1));

    model.actions.onEdit(FILTER);
    model.actions.onSave(FILTER.id, BODY);
    model.actions.onArchive(FILTER.id);

    await waitFor(() => expect(dashboardBoardsApi.updateFilter).toHaveBeenCalledWith('infra', FILTER.id, BODY));
    await waitFor(() => expect(dashboardBoardsApi.archiveFilter).toHaveBeenCalledWith('infra', FILTER.id));
  });

  // triste
  it('keeps the form open with the reason when saving is refused', async () => {
    vi.mocked(dashboardBoardsApi.createFilter).mockRejectedValue(new ApiError(422, 'O filtro passa de 50 condições.'));
    const model = mount();

    model.actions.onNew();
    model.actions.onSave(null, BODY);

    await waitFor(() => expect(model.state.error).toBe('O filtro passa de 50 condições.'));
    expect(model.data.editing).toBe('new');
  });
});
