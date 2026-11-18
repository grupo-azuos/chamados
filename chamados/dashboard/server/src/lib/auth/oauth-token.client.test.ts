import { afterEach, describe, expect, it, vi } from 'vitest';

import { OAuthTokenClient } from './oauth-token.client';

const env = {
  ADMIN_CONSOLE_URL: 'https://login.example.test',
  ADMIN_CONSOLE_CLIENT_SECRET: 'um_test_example',
  ADMIN_CONSOLE_TIMEOUT_MS: 4000,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('OAuthTokenClient', () => {
  it('uses Basic only at the issuer and coalesces concurrent requests', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'signed.jwt.value',
          token_type: 'Bearer',
          expires_in: 300,
        }),
      ),
    );
    vi.stubGlobal('fetch', fetcher);
    const client = new OAuthTokenClient(env, 'app:shared-api');
    expect(await Promise.all([client.authorization(), client.authorization()])).toEqual([
      'Bearer signed.jwt.value',
      'Bearer signed.jwt.value',
    ]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, request] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.href).toBe('https://login.example.test/api/oauth2/token');
    expect(request.headers).toMatchObject({
      authorization: `Basic ${Buffer.from(':um_test_example').toString('base64')}`,
    });
    expect(String(request.body)).toBe('grant_type=client_credentials&audience=app%3Ashared-api');
  });

  it('expires early and retries a failed renewal without returning stale credentials', async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'first', token_type: 'Bearer', expires_in: 300 }),
        ),
      )
      .mockResolvedValueOnce(new Response('secret must not appear', { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'renewed', token_type: 'Bearer', expires_in: 300 }),
        ),
      );
    vi.stubGlobal('fetch', fetcher);
    const client = new OAuthTokenClient(env, 'admin-console');
    await client.authorization();
    vi.advanceTimersByTime(271_000);
    await expect(client.authorization()).rejects.toThrow('OAuth token endpoint answered 401');
    expect(await client.authorization()).toBe('Bearer renewed');
  });

  it('refuses missing configuration and malformed responses', async () => {
    await expect(new OAuthTokenClient({}, 'admin-console').authorization()).rejects.toThrow(
      'Configure',
    );
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
    await expect(new OAuthTokenClient(env, 'admin-console').authorization()).rejects.toThrow();
  });
});
