import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-history-harness.test.svelte';
import { EMPTY_HISTORY_FILTER, toHistoryQuery, type HistoryModel } from './use-history.svelte';

vi.mock('$lib/api/history.api', () => ({ historyApi: { list: vi.fn() } }));

const { historyApi } = await import('$lib/api/history.api');

const ENTRY = {
  id: '1',
  action: 'tickets.update',
  kind: 'updated' as const,
  target: { type: 'tickets', id: '7', label: 'CH-7' },
  changes: [],
  actor: { id: 'u-ana', name: 'Ana' },
  occurredAt: '2026-11-20T13:00:00.000Z',
};

function mountModel(): HistoryModel {
  let model!: HistoryModel;
  render(Harness, { props: { onReady: (ready: HistoryModel) => (model = ready) } });

  return model;
}

beforeEach(() => {
  vi.mocked(historyApi.list).mockReset().mockResolvedValue({ items: [ENTRY], total: 1, page: 1, pageSize: 50 });
});

describe('useHistoryModel', () => {
  // feliz
  it('lists the history of the module of the page', async () => {
    const model = mountModel();

    await waitFor(() => expect(model.data.entries).toHaveLength(1));
    expect(model.data.total).toBe(1);
    expect(historyApi.list).toHaveBeenCalledWith(expect.objectContaining({ module: 'infra', page: 1 }));
  });

  // feliz
  it('goes back to the first page when the filter changes', async () => {
    const model = mountModel();
    await waitFor(() => expect(model.data.entries).toHaveLength(1));

    model.actions.onPageChange(3);
    await waitFor(() => expect(model.data.page).toBe(3));
    model.actions.onFilterChange({ who: 'mine' });

    await waitFor(() => expect(model.data.page).toBe(1));
    expect(historyApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ actor: 'me', page: 1 }));
    model.actions.onClearFilters();
    await waitFor(() => expect(model.data.filter).toEqual(EMPTY_HISTORY_FILTER));
  });

  // triste
  it('tells why it did not load', async () => {
    vi.mocked(historyApi.list).mockRejectedValue(new ApiError(503, 'Serviço fora do ar.'));
    const model = mountModel();

    await waitFor(() => expect(model.state.error).toBe('Serviço fora do ar.'));
    expect(model.data.entries).toEqual([]);
  });
});

describe('toHistoryQuery', () => {
  // feliz
  it('sends what is filled', () => {
    expect(
      toHistoryQuery('sistema', { ...EMPTY_HISTORY_FILTER, kind: 'created', search: ' CH ', from: '2026-11-01' }, 2),
    ).toMatchObject({ module: 'sistema', page: 2, kind: 'created', search: 'CH', from: '2026-11-01' });
  });

  // triste
  it('leaves out what is empty', () => {
    const query = toHistoryQuery('infra', EMPTY_HISTORY_FILTER, 1);

    expect(query.actor).toBeUndefined();
    expect(query.search).toBeUndefined();
    expect(query.targetType).toBeUndefined();
  });
});
