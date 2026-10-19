import { afterEach, describe, expect, it, vi } from 'vitest';

import { networkOrOffline } from './network-or-offline.util';

afterEach(() => vi.unstubAllGlobals());

describe('networkOrOffline', () => {
  // feliz: a resposta autenticada e os redirecionamentos não são guardados nem substituídos.
  it('returns the network response without reading the offline cache', async () => {
    const response = new Response(null, {
      status: 302,
      headers: { Location: 'https://login.test/' },
    });
    const fetcher = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetcher);
    const loadOffline = vi.fn();
    const request = new Request('https://dashboard.test/');

    expect(await networkOrOffline(request, loadOffline)).toBe(response);
    expect(fetcher).toHaveBeenCalledWith(request);
    expect(loadOffline).not.toHaveBeenCalled();
  });

  // triste: sessão expirada e falha do servidor não podem virar um aviso de falta de internet.
  it.each([401, 403, 500])('preserves HTTP %s responses', async (status) => {
    const response = new Response('Server response', { status });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    const loadOffline = vi.fn();

    expect(await networkOrOffline(new Request('https://dashboard.test/'), loadOffline)).toBe(
      response,
    );
    expect(loadOffline).not.toHaveBeenCalled();
  });

  it('uses the static offline page only when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network unavailable')));
    const fallback = new Response('Offline page');
    const loadOffline = vi.fn().mockResolvedValue(fallback);

    expect(await networkOrOffline(new Request('https://dashboard.test/'), loadOffline)).toBe(
      fallback,
    );
    expect(loadOffline).toHaveBeenCalledOnce();
  });

  it('returns an unavailable response if no offline page was cached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network unavailable')));

    const response = await networkOrOffline(
      new Request('https://dashboard.test/'),
      async () => undefined,
    );

    expect(response.status).toBe(503);
    expect(await response.text()).toContain('Sem conexão');
  });
});
