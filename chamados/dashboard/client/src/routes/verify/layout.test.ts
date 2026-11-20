import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authApi } from '$lib/api/auth.api';
import { ApiError } from '$lib/api/http-client';

import { load } from './+layout';

vi.mock('$lib/api/auth.api', () => ({ authApi: { me: vi.fn() } }));

const me = vi.mocked(authApi.me);

describe('the document verification layout (/verify)', () => {
  beforeEach(() => {
    me.mockReset();
  });

  it('hands the signed-in user to the verification screens', async () => {
    const user = {
      id: 'user-1',
      name: 'Pessoa de Teste',
      role: 'user',
      roles: {},
    } as Awaited<ReturnType<typeof authApi.me>>;
    me.mockResolvedValue(user);

    await expect(load()).resolves.toEqual({ user });
  });

  it('requires sign-in and lets no anonymous request through', async () => {
    const failure = new ApiError(401, 'Unauthorized');
    me.mockRejectedValue(failure);

    await expect(load()).rejects.toBe(failure);
  });
});
