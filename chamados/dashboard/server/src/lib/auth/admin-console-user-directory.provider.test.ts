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

function directoryPage(users: unknown[], totalPages = 1) {
  return { data: { users }, meta: { pagination: { totalPages } } };
}

const directoryPerson = (id: string, name: string) => ({ id, name, email: `${id}@example.invalid` });

describe('AdminConsoleUserDirectoryProvider office directory', () => {
  // feliz
  it('loads every page independently from system access and orders names across pages', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => directoryPage([directoryPerson('u-2', 'Bruno')], 2) })
      .mockResolvedValueOnce({ ok: true, json: async () => directoryPage([directoryPerson('u-1', 'Ana')], 2) });
    vi.stubGlobal('fetch', fetchMock);
    const users = await new AdminConsoleUserDirectoryProvider(ENV).listAllUsers();
    expect(users.map((user) => user.name)).toEqual(['Ana', 'Bruno']);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'http://admin-console.interno/api/users?page=1&pageSize=200',
      'http://admin-console.interno/api/users?page=2&pageSize=200',
    ]);
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      headers: expect.objectContaining({ authorization: 'Bearer um_chamados_segredo-de-teste' }),
    }));
  });

  it('keeps complete and access-scoped caches separate', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { people: [directoryPerson('u-1', 'Ana')] } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => directoryPage([directoryPerson('u-1', 'Ana'), directoryPerson('u-2', 'Bruno')]) });
    vi.stubGlobal('fetch', fetchMock);
    const provider = new AdminConsoleUserDirectoryProvider(ENV);
    expect(await provider.listUsers()).toHaveLength(1);
    expect(await provider.listAllUsers()).toHaveLength(2);
    expect(await provider.listUsers()).toHaveLength(1);
    expect(await provider.listAllUsers()).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('expires the complete directory cache after one minute', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(100_000);
    const fetchMock = answer(directoryPage([directoryPerson('u-1', 'Ana')]));
    vi.stubGlobal('fetch', fetchMock);
    try {
      const provider = new AdminConsoleUserDirectoryProvider(ENV);
      await provider.listAllUsers();
      now.mockReturnValue(160_001);
      await provider.listAllUsers();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally { now.mockRestore(); }
  });

  it('returns the empty directory when the upstream confirms that there are no users', async () => {
    vi.stubGlobal('fetch', answer(directoryPage([], 0)));
    expect(await new AdminConsoleUserDirectoryProvider(ENV).listAllUsers()).toEqual([]);
  });

  // triste
  it('fails rather than silently truncating a response without pagination', async () => {
    vi.stubGlobal('fetch', answer({ data: { users: [directoryPerson('u-1', 'Ana')] } }));
    await expect(new AdminConsoleUserDirectoryProvider(ENV).listAllUsers()).rejects.toThrow(ServiceUnavailableException);
  });

  it('does not cache a partial list when a later page fails', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => directoryPage([directoryPerson('u-1', 'Ana')], 2) })
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, json: async () => directoryPage([directoryPerson('u-1', 'Ana'), directoryPerson('u-2', 'Bruno')]) });
    vi.stubGlobal('fetch', fetchMock);
    const provider = new AdminConsoleUserDirectoryProvider(ENV);
    await expect(provider.listAllUsers()).rejects.toThrow(ServiceUnavailableException);
    expect(await provider.listAllUsers()).toHaveLength(2);
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe('http://admin-console.interno/api/users?page=1&pageSize=200');
  });
});
