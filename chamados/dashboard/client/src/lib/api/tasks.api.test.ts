import { describe, expect, it, vi } from 'vitest';

vi.mock('./http-client', () => ({ apiRequest: vi.fn() }));

const { apiRequest } = await import('./http-client');
const { tasksApi } = await import('./tasks.api');

describe('tasksApi', () => {
  // feliz
  it('lists the tasks of an area sending the flags only when they are on', async () => {
    vi.mocked(apiRequest).mockResolvedValue(undefined);

    await tasksApi.list({ area: 'infra', page: 2, mine: true, overdue: false, search: 'switch' });

    expect(apiRequest).toHaveBeenLastCalledWith('/tasks', {
      query: expect.objectContaining({ area: 'infra', page: 2, mine: 'true', overdue: undefined, search: 'switch' }),
    });
  });

  // feliz
  it('writes, moves and removes a task by its address', async () => {
    vi.mocked(apiRequest).mockResolvedValue(undefined);

    await tasksApi.setStatus(4, { status: 'done' });
    expect(apiRequest).toHaveBeenLastCalledWith('/tasks/4/status', { method: 'POST', body: { status: 'done' } });
    await tasksApi.setStepDone(4, 9, true);
    expect(apiRequest).toHaveBeenLastCalledWith('/tasks/4/steps/9', { method: 'PATCH', body: { done: true } });
    await tasksApi.removeLink(4, 2);
    expect(apiRequest).toHaveBeenLastCalledWith('/tasks/4/links/2', { method: 'DELETE' });
    await tasksApi.remove(4);
    expect(apiRequest).toHaveBeenLastCalledWith('/tasks/4', { method: 'DELETE' });
  });

  // triste
  it('does not send the "mine" flag when it is off', async () => {
    vi.mocked(apiRequest).mockResolvedValue(undefined);

    await tasksApi.list({ area: 'infra' });

    expect(apiRequest).toHaveBeenLastCalledWith('/tasks', {
      query: expect.objectContaining({ mine: undefined, overdue: undefined }),
    });
  });
});
