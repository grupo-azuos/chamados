import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { accountProfileApi } from './account-profile.api';

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
