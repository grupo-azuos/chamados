import { render, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-archived-items-harness.test.svelte';
import { type ArchivedItemsModel } from './use-archived-items.svelte';

type Row = { id: number; name: string };

function mountModel(overrides: { fetch?: () => Promise<Row[]>; restore?: (key: string) => Promise<unknown> } = {}) {
  const fetch = vi.fn(overrides.fetch ?? (async () => [{ id: 7, name: 'Cadeira giratória' }]));
  const restore = vi.fn(overrides.restore ?? (async () => undefined));
  let model!: ArchivedItemsModel;
  render(Harness, {
    props: {
      options: {
        queryKey: ['inventory-items', 'archived'],
        fetch,
        toItem: (row: Row) => ({
          key: String(row.id),
          label: row.name,
          archivedAt: '2026-11-20T12:00:00.000Z',
          canRestore: true,
        }),
        restore,
        invalidate: [['inventory-items']],
      },
      onReady: (ready: ArchivedItemsModel) => (model = ready),
    },
  });

  return { model, fetch, restore };
}

describe('useArchivedItemsModel', () => {
  // feliz
  it('fetches the removed only once the block is opened', async () => {
    const { model, fetch } = mountModel();

    expect(fetch).not.toHaveBeenCalled();
    expect(model.state.isLoading).toBe(false);

    model.actions.onOpenChange(true);

    await waitFor(() => expect(model.data.items).toHaveLength(1));
    expect(model.data.items[0]).toMatchObject({ key: '7', label: 'Cadeira giratória' });
  });

  // feliz
  it('undoes one item by its key', async () => {
    const { model, restore } = mountModel();
    model.actions.onOpenChange(true);
    await waitFor(() => expect(model.data.items).toHaveLength(1));

    model.actions.onRestore('7');

    await waitFor(() => expect(restore).toHaveBeenCalledWith('7'));
  });

  // triste
  it('shows the reason when the undo is refused', async () => {
    const { model } = mountModel({
      restore: async () => {
        throw new ApiError(409, 'Isto já voltou ao chamado por outro caminho.');
      },
    });
    model.actions.onOpenChange(true);
    await waitFor(() => expect(model.data.items).toHaveLength(1));

    model.actions.onRestore('7');

    await waitFor(() =>
      expect(model.state.error).toBe('Isto já voltou ao chamado por outro caminho.'),
    );
  });

  // triste
  it('shows the reason when the removed cannot be loaded', async () => {
    const { model } = mountModel({
      fetch: async () => {
        throw new ApiError(500, 'Não consegui carregar os removidos.');
      },
    });

    model.actions.onOpenChange(true);

    await waitFor(() => expect(model.state.error).toBe('Não consegui carregar os removidos.'));
  });
});
