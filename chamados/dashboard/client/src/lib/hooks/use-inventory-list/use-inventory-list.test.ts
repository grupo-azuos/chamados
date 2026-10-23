import { type InventoryItem } from '@template/shared/schemas/inventory-item.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-inventory-list-harness.test.svelte';
import {
  type InventoryListModel,
} from './use-inventory-list.svelte';

vi.mock('$lib/api/inventory-items.api', () => ({
  inventoryItemsApi: { list: vi.fn(), remove: vi.fn() },
}));

const { inventoryItemsApi } = await import('$lib/api/inventory-items.api');

function item(over: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 1,
    name: 'Cadeira giratória',
    category: 'furniture',
    unit: 'unit',
    location: 'Sala da contabilidade',
    code: 'PAT-0101',
    note: null,
    photoUrl: 'https://r2.exemplo/foto.webp',
    balance: 3,
    createdAt: '2026-09-01T12:00:00.000Z',
    createdBy: 'manutencao@azuos.local',
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

function page(items: InventoryItem[], total = items.length) {
  return { items, total, page: 1, pageSize: 200 };
}

function mountModel(): InventoryListModel {
  let model!: InventoryListModel;
  render(Harness, { props: { onReady: (ready: InventoryListModel) => (model = ready) } });

  return model;
}


beforeEach(() => {
  vi.mocked(inventoryItemsApi.list)
    .mockReset()
    .mockResolvedValue(page([item()]));
  vi.mocked(inventoryItemsApi.remove).mockReset().mockResolvedValue(undefined);
});

describe('useInventoryListModel', () => {
  // feliz
  it('lists the products that came from the API', async () => {
    const model = mountModel();

    await waitFor(() => expect(model.data.items).toHaveLength(1));
    expect(model.data.total).toBe(1);
    expect(model.state.isEmpty).toBe(false);
  });

  it('asks the API again with the search that was typed', async () => {
    const model = mountModel();
    await waitFor(() => expect(inventoryItemsApi.list).toHaveBeenCalled());

    model.actions.onSearchChange('café');

    await waitFor(() =>
      expect(inventoryItemsApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'café' }),
      ),
    );
  });

  it('filters by category', async () => {
    const model = mountModel();
    await waitFor(() => expect(inventoryItemsApi.list).toHaveBeenCalled());

    model.actions.onCategoryChange('pantry');

    await waitFor(() =>
      expect(inventoryItemsApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'pantry' }),
      ),
    );
  });

  /* Excluir é irreversível: primeiro a pergunta, só depois a chamada. */
  it('only deletes after the confirmation', async () => {
    const model = mountModel();
    await waitFor(() => expect(model.data.items).toHaveLength(1));

    model.actions.onAskDelete(item());
    expect(model.data.deleting?.id).toBe(1);
    expect(inventoryItemsApi.remove).not.toHaveBeenCalled();

    model.actions.onConfirmDelete();
    await waitFor(() => expect(inventoryItemsApi.remove).toHaveBeenCalledWith(1));
  });

  it('forgets the product when the deletion is cancelled', async () => {
    const model = mountModel();
    await waitFor(() => expect(model.data.items).toHaveLength(1));

    model.actions.onAskDelete(item());
    model.actions.onCancelDelete();

    expect(model.data.deleting).toBeNull();
    expect(inventoryItemsApi.remove).not.toHaveBeenCalled();
  });

  // triste
  /* Vazio só é vazio DEPOIS que a consulta terminou. */
  it('does not call the inventory empty while it is still loading', () => {
    const model = mountModel();

    expect(model.state.isLoading).toBe(true);
    expect(model.state.isEmpty).toBe(false);
  });

  /* "Sem foto" é filtrado no SQL: a tela pede ao servidor, não corta o que veio. */
  it('asks the server for the products without a photo', async () => {
    const model = mountModel();
    await waitFor(() => expect(inventoryItemsApi.list).toHaveBeenCalled());

    model.actions.onWithoutPhotoOnlyChange(true);

    await waitFor(() =>
      expect(inventoryItemsApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ withoutPhotoOnly: true }),
      ),
    );
  });

  it('separates empty from hidden by a filter', async () => {
    vi.mocked(inventoryItemsApi.list).mockResolvedValue(page([]));
    const model = mountModel();

    await waitFor(() => expect(model.state.isEmpty).toBe(true));
    expect(model.state.isFilteredOut).toBe(false);

    model.actions.onCategoryChange('pantry');

    await waitFor(() => expect(model.state.isFilteredOut).toBe(true));
    expect(model.state.isEmpty).toBe(false);
  });

  it('shows the reason when the list fails', async () => {
    vi.mocked(inventoryItemsApi.list).mockRejectedValue(
      new ApiError(500, 'Não consegui falar com o servidor.'),
    );
    const model = mountModel();

    await waitFor(() => expect(model.state.error).toBe('Não consegui falar com o servidor.'));
  });

  /* A falha da exclusão fica NA TELA, com o motivo, e o produto continua esperando. */
  it('keeps the question open when the deletion fails, with the reason', async () => {
    vi.mocked(inventoryItemsApi.remove).mockRejectedValue(
      new ApiError(404, 'Produto não encontrado.'),
    );
    const model = mountModel();
    await waitFor(() => expect(model.data.items).toHaveLength(1));

    model.actions.onAskDelete(item());
    model.actions.onConfirmDelete();

    await waitFor(() => expect(model.state.deleteError).toBe('Produto não encontrado.'));
    expect(model.data.deleting?.id).toBe(1);
  });

  it('does nothing when the confirmation comes without a product (edge case)', () => {
    const model = mountModel();

    model.actions.onConfirmDelete();

    expect(inventoryItemsApi.remove).not.toHaveBeenCalled();
  });
});
