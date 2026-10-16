import { afterEach, describe, expect, it, vi } from 'vitest';

import { type Env } from '../config/env.schema';
import { AdminConsoleProfileProvider } from './admin-console-profile.provider';

const ENV = {
  ADMIN_CONSOLE_URL: 'http://admin-console.interno',
  ADMIN_CONSOLE_COOKIE_PREFIX: 'azuos_homo',
  ADMIN_CONSOLE_TIMEOUT_MS: 4000,
} as Env;

const COOKIES =
  'sidebar=1; azuos_homo_access_token=jwt-de-acesso; azuos_homo_refresh_token=renovacao';

function answer(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AdminConsoleProfileProvider', () => {
  // feliz
  it('reads the profile of who is logged in', async () => {
    vi.stubGlobal(
      'fetch',
      answer({
        data: {
          user: {
            name: 'Bia Costa',
            email: 'bia@azuos.com.br',
            profile: { phone: '62988887777', department: 'Fiscal', jobTitle: null },
          },
        },
      }),
    );

    await expect(new AdminConsoleProfileProvider(ENV).fetchMine(COOKIES)).resolves.toEqual({
      name: 'Bia Costa',
      email: 'bia@azuos.com.br',
      phone: '62988887777',
      department: 'Fiscal',
      jobTitle: null,
    });
  });

  /* O de renovação, reapresentado por outro processo, derrubaria a sessão: só o de acesso vai. */
  it('forwards only the access cookie, never the refresh one', async () => {
    const fetchMock = answer({ data: { user: { name: 'Bia', email: 'bia@azuos.com.br' } } });
    vi.stubGlobal('fetch', fetchMock);

    await new AdminConsoleProfileProvider(ENV).fetchMine(COOKIES);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://admin-console.interno/api/me/profile',
      expect.objectContaining({
        headers: expect.objectContaining({ cookie: 'azuos_homo_access_token=jwt-de-acesso' }),
      }),
    );
  });

  // triste
  it('asks nothing without the access cookie', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(new AdminConsoleProfileProvider(ENV).fetchMine('sidebar=1')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  /* Falha não impede ninguém de abrir chamado: só vem menos coisa preenchida. */
  it('gives nothing when the admin-console refuses or is down', async () => {
    vi.stubGlobal('fetch', answer({}, 401));
    await expect(new AdminConsoleProfileProvider(ENV).fetchMine(COOKIES)).resolves.toBeNull();

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(new AdminConsoleProfileProvider(ENV).fetchMine(COOKIES)).resolves.toBeNull();
  });
});
