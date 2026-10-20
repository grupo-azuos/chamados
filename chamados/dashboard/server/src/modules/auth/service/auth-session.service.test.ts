import { ServiceUnavailableException, UnsupportedMediaTypeException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Env } from '../../../lib/config/env.schema';
import { AuthSessionService } from './auth-session.service';

const env = {
  ADMIN_CONSOLE_URL: 'https://login.example.com',
  ADMIN_CONSOLE_COOKIE_PREFIX: 'demo',
  ADMIN_CONSOLE_TIMEOUT_MS: 1000,
} as Env;
const expired = [
  'demo_access_token=; Domain=.example.com; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax',
  'demo_refresh_token=; Domain=.example.com; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax',
];
afterEach(() => vi.unstubAllGlobals());

describe('AuthSessionService', () => {
  // feliz
  it('revokes the session upstream and preserves the exact cookie-clearing attributes', async () => {
    const headers = new Headers();
    for (const cookie of expired) headers.append('set-cookie', cookie);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204, headers }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await new AuthSessionService(env).logout(
      'other_session=private; demo_access_token=access; demo_refresh_token=refresh',
      'application/json',
    );

    expect(result).toEqual(expired);
    expect(fetchMock).toHaveBeenCalledWith(new URL('https://login.example.com/api/auth/logout'),
      expect.objectContaining({
        method: 'POST',
        redirect: 'error',
        headers: expect.objectContaining({ cookie: 'demo_access_token=access; demo_refresh_token=refresh' }),
      }),
    );
  });

  // triste
  it('rejects a cross-site form before contacting the identity server', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(new AuthSessionService(env).logout('demo_access_token=access', 'text/plain'))
      .rejects.toBeInstanceOf(UnsupportedMediaTypeException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports failure if upstream does not confirm that both cookies were cleared', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(new AuthSessionService(env).logout('demo_access_token=access', 'application/json'))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('reports a network failure instead of claiming that the session ended', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(new AuthSessionService(env).logout('demo_access_token=access', 'application/json'))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
