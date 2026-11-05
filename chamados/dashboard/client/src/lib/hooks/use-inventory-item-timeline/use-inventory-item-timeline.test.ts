import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-inventory-item-timeline-harness.test.svelte';
import { type InventoryItemTimelineModel } from './use-inventory-item-timeline.svelte';

vi.mock('$lib/api/inventory-items.api', () => ({
  inventoryItemsApi: {
    events: vi.fn(),
    addEvent: vi.fn(),
  },
}));

const { inventoryItemsApi } = await import('$lib/api/inventory-items.api');

function mountModel(itemId: number | null = 10): InventoryItemTimelineModel {
  let model: InventoryItemTimelineModel | undefined;
  render(Harness, {
    props: { itemId, onReady: (ready: InventoryItemTimelineModel) => (model = ready) },
  });
  if (!model) throw new Error('model not ready');

  return model;
}

const mockEvent = {
  id: 1,
  itemId: 10,
  type: 'defeito' as const,
  description: 'Pé quebrado',
  authorName: 'Ana Silva',
  createdBy: 'ana@empresa.com.br',
  createdAt: '2026-11-05T12:00:00.000Z',
};

describe('useInventoryItemTimelineModel', () => {
  beforeEach(() => {
    vi.mocked(inventoryItemsApi.events).mockResolvedValue([mockEvent]);
    vi.mocked(inventoryItemsApi.addEvent).mockResolvedValue(mockEvent);
  });

  it('loads events for given item id', async () => {
    const model = mountModel(10);
    await waitFor(() => expect(model.data.events).toHaveLength(1));
    expect(model.data.events[0]?.type).toBe('defeito');
    expect(model.data.events[0]?.description).toBe('Pé quebrado');
  });

  it('changes type and description in the form', () => {
    const model = mountModel(10);
    model.actions.onTypeChange('troca');
    model.actions.onDescriptionChange('Novo rodízio instalado');

    expect(model.data.type).toBe('troca');
    expect(model.data.description).toBe('Novo rodízio instalado');
  });

  it('rejects submitting empty description', async () => {
    const model = mountModel(10);
    model.actions.onDescriptionChange('   ');
    const success = await model.actions.onSubmit();

    expect(success).toBe(false);
    expect(model.state.formError).toBe('A descrição da ocorrência não pode ficar vazia.');
    expect(inventoryItemsApi.addEvent).not.toHaveBeenCalled();
  });

  it('successfully submits and clears the form', async () => {
    const model = mountModel(10);
    model.actions.onTypeChange('manutencao');
    model.actions.onDescriptionChange('Lubrificação realizada');

    const success = await model.actions.onSubmit();
    expect(success).toBe(true);
    expect(inventoryItemsApi.addEvent).toHaveBeenCalledWith(10, {
      type: 'manutencao',
      description: 'Lubrificação realizada',
    });
    expect(model.data.description).toBe('');
    expect(model.state.formError).toBeNull();
  });

  it('handles API error on submit', async () => {
    vi.mocked(inventoryItemsApi.addEvent).mockRejectedValue(
      new ApiError(422, 'Falha ao registrar ocorrência'),
    );

    const model = mountModel(10);
    model.actions.onDescriptionChange('Falha');
    const success = await model.actions.onSubmit();

    expect(success).toBe(false);
    expect(model.state.formError).toBe('Falha ao registrar ocorrência');
  });
});
