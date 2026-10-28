import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authApi } from '$lib/api/auth.api';
import { ApiError } from '$lib/api/http-client';

import { load } from './+layout';

vi.mock('$lib/api/auth.api', () => ({ authApi: { me: vi.fn() } }));

const me = vi.mocked(authApi.me);

describe('a rota da central de chamados (/support e /support/profile)', () => {
  beforeEach(() => {
    me.mockReset();
  });

  it('entrega o usuário autenticado para a tela', async () => {
    const user = {
      id: 'user-1',
      name: 'Pessoa de Teste',
      role: 'user',
      roles: {},
    } as Awaited<ReturnType<typeof authApi.me>>;
    me.mockResolvedValue(user);

    await expect(load()).resolves.toEqual({ user });
  });

  it('exige autenticação e não deixa requisição anônima passar', async () => {
    const failure = new ApiError(401, 'Unauthorized');
    me.mockRejectedValue(failure);

    await expect(load()).rejects.toBe(failure);
  });
});
