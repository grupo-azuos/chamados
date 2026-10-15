import { type Request, type Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { type Env } from '../config/env.schema';
import { AuthenticationMiddleware } from './authentication.middleware';
import { MOCK_IDENTITY, type IdentityProvider } from './identity.provider';
import { type RequestUser } from './request-user.type';

const HEADERS = {
  'x-forwarded-user-id': '11111111-1111-4111-8111-111111111111',
  'x-forwarded-user-email': 'ana@empresa.com.br',
  'x-forwarded-user-name': 'Ana Souza',
  'x-forwarded-user-role': 'admin',
};

function setup(env: Partial<Env>) {
  const resolve = vi.fn(async (forwarded: { id: string; email: string; name: string }) => ({
    id: forwarded.id,
    email: forwarded.email,
    name: forwarded.name,
    role: 'user' as const,
  }));
  const middleware = new AuthenticationMiddleware(
    { resolve } as unknown as IdentityProvider,
    { NODE_ENV: 'development', ...env } as Env,
  );

  async function run(headers: Record<string, string>): Promise<RequestUser | undefined> {
    const request = { headers } as unknown as Request & { user?: RequestUser };
    await middleware.use(request, {} as Response, vi.fn());

    return request.user;
  }

  return { run, resolve };
}

describe('AuthenticationMiddleware', () => {
  // feliz
  it('identifies the person the admin-console forwarded', async () => {
    const { run } = setup({ USER_MOCK: 'false' });

    expect((await run(HEADERS))?.email).toBe('ana@empresa.com.br');
  });

  it('uses the development person only when there is no proxy and the mock is on', async () => {
    const { run } = setup({ USER_MOCK: 'true' });

    expect((await run({}))?.email).toBe(MOCK_IDENTITY.email);
  });

  // triste
  /* Em produção, sem cabeçalho é quem chegou à API sem passar pelo proxy: ninguém. */
  it('leaves the request anonymous without headers when the mock is off', async () => {
    const { run, resolve } = setup({ NODE_ENV: 'production' });

    expect(await run({})).toBeUndefined();
    expect(resolve).not.toHaveBeenCalled();
  });

  /* O furo mais caro: cabeçalho pela metade NUNCA é completado com a pessoa de desenvolvimento. */
  it('never completes a half forwarded identity with the development person', async () => {
    const { run, resolve } = setup({ USER_MOCK: 'true' });
    const { 'x-forwarded-user-role': _role, ...partial } = HEADERS;

    expect(await run(partial)).toBeUndefined();
    expect(resolve).not.toHaveBeenCalled();
  });
});
