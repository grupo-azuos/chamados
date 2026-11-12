import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-ticket-stock-items-harness.test.svelte';
import { type TicketStockItemsModel } from './use-ticket-stock-items.svelte';

vi.mock('$lib/api/tickets.api', () => ({
  ticketsApi: {
    stockItems: vi.fn(),
    stockOptions: vi.fn(),
    addStockItem: vi.fn(),
    removeStockItem: vi.fn(),
  },
}));

const { ticketsApi } = await import('$lib/api/tickets.api');

function mountModel(): TicketStockItemsModel {
  let model: TicketStockItemsModel | undefined;
  render(Harness, {
    props: { ticketId: 49, onReady: (ready: TicketStockItemsModel) => (model = ready) },
  });
  if (!model) throw new Error('model not ready');

  return model;
}

const partLine = {
  id: 10,
  ticketId: 49,
  source: 'parts' as const,
  itemId: 1,
  name: 'Mouse USB',
  direction: 'out' as const,
  quantity: 2,
  settledAt: null,
  createdAt: '2026-11-12T12:00:00.000Z',
  createdByName: 'Ana Lima',
};

describe('useTicketStockItemsModel', () => {
  beforeEach(() => {
    vi.mocked(ticketsApi.stockItems).mockResolvedValue([
      partLine,
      { ...partLine, id: 11, source: 'inventory', name: 'Cadeira' },
    ]);
    vi.mocked(ticketsApi.stockOptions).mockResolvedValue([{ id: 1, name: 'Mouse USB', available: 3 }]);
    vi.mocked(ticketsApi.addStockItem).mockReset();
    vi.mocked(ticketsApi.removeStockItem).mockReset();
  });

  // feliz
  it('shows only the items of its own shelf, and adds one', async () => {
    vi.mocked(ticketsApi.addStockItem).mockResolvedValue(partLine);
    const model = mountModel();
    await waitFor(() => expect(model.state.isLoading).toBe(false));

    expect(model.data.items.map((line) => line.id)).toEqual([10]);

    model.actions.onChange('itemId', '1');
    model.actions.onChange('quantity', '2');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(ticketsApi.addStockItem).toHaveBeenCalledWith(49, {
        source: 'parts',
        itemId: 1,
        direction: 'out',
        quantity: 2,
      }),
    );
  });

  it('removes an item', async () => {
    vi.mocked(ticketsApi.removeStockItem).mockResolvedValue(undefined);
    const model = mountModel();

    model.actions.onRemove(10);

    await waitFor(() => expect(ticketsApi.removeStockItem).toHaveBeenCalledWith(49, 10));
  });

  // triste
  it('does not send without an item, saying what is missing', async () => {
    const model = mountModel();

    model.actions.onSubmit();

    expect(model.data.errors.itemId).toBe('Escolha o item');
    expect(ticketsApi.addStockItem).not.toHaveBeenCalled();
  });

  it('starts the choice again when the direction changes', () => {
    const model = mountModel();

    model.actions.onChange('itemId', '1');
    model.actions.onChange('direction', 'in');

    expect(model.data.values).toMatchObject({ itemId: '', direction: 'in' });
  });

  it('shows the refusal of the server', async () => {
    vi.mocked(ticketsApi.addStockItem).mockRejectedValue(
      new ApiError(422, 'Só há 1 de Mouse USB disponível no depósito.'),
    );
    const model = mountModel();

    model.actions.onChange('itemId', '1');
    model.actions.onSubmit();

    await waitFor(() => expect(model.state.error).toMatch(/Só há 1/));
  });
});
