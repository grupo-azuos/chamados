import { describe, expect, it, vi } from 'vitest';

vi.mock('./http-client', () => ({ apiRequest: vi.fn() }));

const { apiRequest } = await import('./http-client');
const { maintenancesApi } = await import('./maintenances.api');

describe('maintenancesApi', () => {
  // feliz
  it('reads, writes and removes a maintenance by its address', async () => {
    vi.mocked(apiRequest).mockResolvedValue(undefined);

    await maintenancesApi.findById(4);
    expect(apiRequest).toHaveBeenLastCalledWith('/maintenances/4');
    await maintenancesApi.create({ type: 'cleaning' } as never);
    expect(apiRequest).toHaveBeenLastCalledWith('/maintenances', { method: 'POST', body: { type: 'cleaning' } });
    await maintenancesApi.update(4, { type: 'other' } as never);
    expect(apiRequest).toHaveBeenLastCalledWith('/maintenances/4', { method: 'PATCH', body: { type: 'other' } });
    await maintenancesApi.remove(4);
    expect(apiRequest).toHaveBeenLastCalledWith('/maintenances/4', { method: 'DELETE' });
  });

  // feliz
  it('schedules, reschedules and cancels the visit of a machine', async () => {
    vi.mocked(apiRequest).mockResolvedValue(undefined);

    await maintenancesApi.saveSchedule(3, { scheduledFor: '2026-11-05' } as never);
    expect(apiRequest).toHaveBeenLastCalledWith('/maintenances/schedules/3', { method: 'PUT', body: { scheduledFor: '2026-11-05' } });
    await maintenancesApi.cancelSchedule(3);
    expect(apiRequest).toHaveBeenLastCalledWith('/maintenances/schedules/3', { method: 'DELETE' });
    await maintenancesApi.schedules();
    expect(apiRequest).toHaveBeenLastCalledWith('/maintenances/schedules', { query: { computerId: undefined } });
  });
});
