import { describe, expect, it, vi } from 'vitest';

vi.mock('./http-client', () => ({ apiRequest: vi.fn() }));

const { apiRequest } = await import('./http-client');
const { partsApi } = await import('./parts.api');

describe('partsApi', () => {
  // feliz
  it('reads, registers and corrects a part by its address', async () => {
    vi.mocked(apiRequest).mockResolvedValue(undefined);

    await partsApi.findById(2);
    expect(apiRequest).toHaveBeenLastCalledWith('/parts/2');
    await partsApi.create({ name: 'SSD' } as never);
    expect(apiRequest).toHaveBeenLastCalledWith('/parts', { method: 'POST', body: { name: 'SSD' } });
    await partsApi.update(2, { name: 'SSD 480' } as never);
    expect(apiRequest).toHaveBeenLastCalledWith('/parts/2', { method: 'PATCH', body: { name: 'SSD 480' } });
  });

  // feliz
  it('moves a part in and out, corrects a line and removes it giving the balance back', async () => {
    vi.mocked(apiRequest).mockResolvedValue(undefined);

    await partsApi.createMovement(2, { type: 'out', quantity: 1 } as never);
    expect(apiRequest).toHaveBeenLastCalledWith('/parts/2/movements', { method: 'POST', body: { type: 'out', quantity: 1 } });
    await partsApi.updateMovement(9, { note: 'corrigido' } as never);
    expect(apiRequest).toHaveBeenLastCalledWith('/parts/movements/9', { method: 'PATCH', body: { note: 'corrigido' } });
    await partsApi.removeMovement(9);
    expect(apiRequest).toHaveBeenLastCalledWith('/parts/movements/9', { method: 'DELETE' });
  });
});
