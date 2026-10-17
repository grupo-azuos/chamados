import { isRedirect } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authApi } from '$lib/api/auth.api';
import { ApiError } from '$lib/api/http-client';

import { load } from './+layout';

vi.mock('$lib/api/auth.api', () => ({ authApi: { me: vi.fn() } }));

const me = vi.mocked(authApi.me);

describe('a guarda de sessão', () => {
  beforeEach(() => {
    me.mockReset();
  });

  // feliz
  it('hands the signed-in person to the screens', async () => {
    const user = {
      id: 'user-1',
      name: 'Pessoa de Teste',
      role: 'admin',
      roles: { infra: 'admin' },
    } as Awaited<ReturnType<typeof authApi.me>>;
    me.mockResolvedValue(user);

    await expect(load()).resolves.toEqual({ user });
  });

  // triste
  it('lets 401 failure through when there is no session', async () => {
    const failure = new ApiError(401, 'Unauthorized');
    me.mockRejectedValue(failure);

    await expect(load()).rejects.toBe(failure);
  });

  /* Sem módulo nenhum, o usuário vai para a Central de Chamados (/support). */
  it('sends who has no module to the support screen', async () => {
    me.mockResolvedValue({
      id: 'user-2',
      name: 'Sem Módulo',
      role: 'user',
      roles: {},
    } as Awaited<ReturnType<typeof authApi.me>>);

    const thrown: unknown = await load().catch((error: unknown) => error);

    expect(isRedirect(thrown)).toBe(true);
    expect(thrown).toMatchObject({ status: 307, location: '/support' });
  });

  /* API fora do ar não é "sem sessão": o erro sobe, em vez de tirar a pessoa da tela. */
  it('lets any other failure through instead of redirecting', async () => {
    const failure = new ApiError(500, 'Internal Server Error');
    me.mockRejectedValue(failure);

    await expect(load()).rejects.toBe(failure);
  });
});
