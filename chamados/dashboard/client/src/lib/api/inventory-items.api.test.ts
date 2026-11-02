import { describe, expect, it, vi } from 'vitest';

vi.mock('./http-client', () => ({ apiRequest: vi.fn(), uploadFile: vi.fn() }));

const { apiRequest, uploadFile } = await import('./http-client');
const { inventoryItemsApi } = await import('./inventory-items.api');

const values = {
  name: 'Cadeira giratória',
  category: 'furniture',
  unit: 'unit',
  location: 'Copa',
  code: 'PAT-0101',
  note: '',
} as never;

describe('inventoryItemsApi', () => {
  // feliz
  it('uploads the photo first and records the product with its key', async () => {
    vi.mocked(uploadFile).mockResolvedValue({ key: 'fotos/cadeira.png' } as never);
    vi.mocked(apiRequest).mockResolvedValue({ id: 1 });
    const photo = new File(['x'], 'cadeira.png', { type: 'image/png' });

    await inventoryItemsApi.create(values, photo);

    expect(uploadFile).toHaveBeenCalledWith('/inventory-items/photo/upload-url', photo);
    expect(apiRequest).toHaveBeenCalledWith('/inventory-items', {
      method: 'POST',
      body: expect.objectContaining({ name: 'Cadeira giratória', photo: { key: 'fotos/cadeira.png' }, removePhoto: undefined }),
    });
  });

  // feliz
  it('updates without touching the photo, or asking to drop it', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ id: 1 });
    vi.mocked(uploadFile).mockClear();

    await inventoryItemsApi.update(4, values, null);
    expect(uploadFile).not.toHaveBeenCalled();
    expect(apiRequest).toHaveBeenLastCalledWith('/inventory-items/4', {
      method: 'PATCH',
      body: expect.objectContaining({ photo: undefined, removePhoto: undefined }),
    });

    await inventoryItemsApi.update(4, values, null, true);
    expect(apiRequest).toHaveBeenLastCalledWith('/inventory-items/4', {
      method: 'PATCH',
      body: expect.objectContaining({ removePhoto: true }),
    });
  });

  // feliz
  it('reads, lists, moves and removes products', async () => {
    vi.mocked(apiRequest).mockResolvedValue(undefined);

    await inventoryItemsApi.findById(9);
    expect(apiRequest).toHaveBeenLastCalledWith('/inventory-items/9');
    await inventoryItemsApi.list({ search: 'cadeira' });
    expect(apiRequest).toHaveBeenLastCalledWith('/inventory-items', { query: { search: 'cadeira' } });
    await inventoryItemsApi.movements({ type: 'disposal' } as never);
    expect(apiRequest).toHaveBeenLastCalledWith('/inventory-items/movements', { query: { type: 'disposal' } });
    await inventoryItemsApi.createMovement(9, { type: 'out', quantity: 1 } as never);
    expect(apiRequest).toHaveBeenLastCalledWith('/inventory-items/9/movements', { method: 'POST', body: { type: 'out', quantity: 1 } });
    await inventoryItemsApi.remove(9);
    expect(apiRequest).toHaveBeenLastCalledWith('/inventory-items/9', { method: 'DELETE' });
  });
});
