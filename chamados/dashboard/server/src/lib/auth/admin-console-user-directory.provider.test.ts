import { ServiceUnavailableException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type Env } from '../config/env.schema';
import { AdminConsoleUserDirectoryProvider } from './admin-console-user-directory.provider';

const ENV = {
  ADMIN_CONSOLE_URL: 'http://admin-console.interno/',
  ADMIN_CONSOLE_TOKEN: 'um_chamados_segredo-de-teste',
  ADMIN_CONSOLE_TIMEOUT_MS: 4000,
} as Env;

function answer(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AdminConsoleUserDirectoryProvider', () => {
  // feliz
  it('lists who has access to this system, with role and photo, sending the service token', async () => {
    const fetchMock = answer({
      data: {
        people: [
          {
            id: 'u-2',
            name: 'Bia',
            email: 'bia@empresa.com.br',
            role: 'manager',
            presentation: { avatarUrl: null },
          },
          {
            id: 'u-1',
            name: 'Ana',
            email: 'ana@empresa.com.br',
            role: 'admin',
            presentation: { avatarUrl: 'https://login/x.png' },
          },
        ],
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    const users = await new AdminConsoleUserDirectoryProvider(ENV).listUsers();

    expect(users.map((user) => [user.name, user.role, user.image])).toEqual([
      ['Ana', 'admin', 'https://login/x.png'],
      ['Bia', 'manager', null],
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://admin-console.interno/api/systems/me/access',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer um_chamados_segredo-de-teste' }),
      }),
    );
  });

  it('finds one person by id in the directory', async () => {
    vi.stubGlobal(
      'fetch',
      answer({
        data: {
          users: [
            { id: 'u-1', name: 'Ana', email: 'ana@empresa.com.br', profile: { avatarUrl: null } },
          ],
        },
      }),
    );

    expect((await new AdminConsoleUserDirectoryProvider(ENV).getUserById('u-1'))?.name).toBe('Ana');
  });

  /* Na máquina local, a pessoa de desenvolvimento é achada sem perguntar ao admin-console. */
  it('finds the development person locally when the mock is on', async () => {
    const fetchMock = answer({});
    vi.stubGlobal('fetch', fetchMock);

    const user = await new AdminConsoleUserDirectoryProvider({
      ...ENV,
      USER_MOCK: 'true',
    }).getUserById('00000000-0000-0000-0000-000000000001');

    expect(user).toMatchObject({ email: 'dev@chamados.local', banned: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // triste
  /* Em produção o mock é recusado: o mesmo id vira uma pergunta normal ao admin-console. */
  it('does not invent the development person when the mock is off', async () => {
    const fetchMock = answer({ data: { users: [] } });
    vi.stubGlobal('fetch', fetchMock);

    const user = await new AdminConsoleUserDirectoryProvider({
      ...ENV,
      USER_MOCK: 'false',
    }).getUserById('00000000-0000-0000-0000-000000000001');

    expect(user).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  /* Lista que não pôde ser lida não é "ninguém tem acesso": é erro, com o motivo. */
  it('fails loudly instead of answering an empty list when the admin-console refuses', async () => {
    vi.stubGlobal('fetch', answer({}, 401));

    await expect(new AdminConsoleUserDirectoryProvider(ENV).listUsers()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('fails loudly when the address is not configured', async () => {
    const provider = new AdminConsoleUserDirectoryProvider({
      ...ENV,
      ADMIN_CONSOLE_URL: undefined,
    });

    await expect(provider.listUsers()).rejects.toThrow(ServiceUnavailableException);
  });

  /* Nada do outro lado é confiado: pessoa sem id, nome ou e-mail válido some da lista. */
  it('drops people without id, name or a valid e-mail', async () => {
    vi.stubGlobal(
      'fetch',
      answer({
        data: {
          people: [
            { id: 'u-1', name: '', email: 'x@y.z' },
            { id: '', name: 'X', email: 'x@y.z' },
            { id: 'u-3', name: 'Y', email: 'nao-e-email' },
            { id: 7, name: 'Z', email: 'z@y.z' },
          ],
        },
      }),
    );

    expect(await new AdminConsoleUserDirectoryProvider(ENV).listUsers()).toEqual([]);
  });
});
