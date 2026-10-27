import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { accountOrigin, accountProfileApi, accountProfileUrl } from './account-profile.api';

const fetchMock = vi.fn();

beforeEach(() => vi.stubGlobal('fetch', fetchMock));

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('accountProfileApi', () => {
  // feliz
  it('reads the profile from the admin console with the session cookie', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ data: { user: { name: 'Ana' } } })));

    await expect(accountProfileApi.me('https://admin-console.test/profile')).resolves.toEqual({ name: 'Ana' });

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.href).toBe('https://admin-console.test/api/me/profile');
    expect(init.credentials).toBe('include');
  });

  it('reads the systems the person opens', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ data: { systems: [] } })));

    await expect(accountProfileApi.systems('https://admin-console.test/profile')).resolves.toEqual([]);
  });

  // triste
  it('fails clearly when the admin console refuses', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 401 }));

    await expect(accountProfileApi.me('https://admin-console.test/profile')).rejects.toThrow('admin-console');
  });
});

describe('accountOrigin', () => {
  // feliz
  it('uses the address the server configured', () => {
    expect(accountOrigin('https://login.grupoazuos.com.br/entrar', 'chamados.grupoazuos.com.br')).toBe(
      'https://login.grupoazuos.com.br',
    );
  });

  /* O homo não tem `ADMIN_CONSOLE_LOGIN_URL`: sem esta regra a ficha do perfil vinha vazia. */
  it('finds the account from the domain when the server configured none', () => {
    expect(accountOrigin(null, 'chamados.homo.grupoazuos.com.br')).toBe(
      'https://admin-console.homo.grupoazuos.com.br',
    );
    expect(accountOrigin(null, 'chamados.grupoazuos.com.br')).toBe(
      'https://admin-console.grupoazuos.com.br',
    );
    expect(accountOrigin(null, 'localhost')).toBe('http://localhost:5000');
  });

  // triste
  it('refuses an unknown domain without a configured address', () => {
    expect(() => accountOrigin(null, 'chamados.outra-empresa.com')).toThrow('Sem endereço da conta.');
  });
});

describe('accountProfileUrl', () => {
  // feliz
  it('points the edit button at the account profile, found from the domain', () => {
    expect(accountProfileUrl(null, 'chamados.homo.grupoazuos.com.br')).toBe(
      'https://admin-console.homo.grupoazuos.com.br/profile',
    );
    expect(accountProfileUrl('https://conta.example/login', 'chamados.grupoazuos.com.br')).toBe(
      'https://conta.example/profile',
    );
  });

  // triste
  it('offers no button on an unknown domain', () => {
    expect(accountProfileUrl(null, 'example.com')).toBeNull();
  });
});
