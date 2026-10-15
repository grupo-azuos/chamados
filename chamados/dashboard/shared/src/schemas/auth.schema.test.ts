import { describe, expect, it } from 'vitest';

import { authConfigSchema } from './auth.schema';

describe('authConfigSchema', () => {
  // feliz
  it('accepts the address of the admin-console account screen', () => {
    expect(authConfigSchema.parse({ accountUrl: 'https://login.exemplo.com.br' }).accountUrl).toBe(
      'https://login.exemplo.com.br',
    );
  });

  it('accepts no address, when the server was not configured', () => {
    expect(authConfigSchema.parse({ accountUrl: null }).accountUrl).toBeNull();
  });

  // triste
  it('refuses an address that is not a URL', () => {
    expect(authConfigSchema.safeParse({ accountUrl: 'login' }).success).toBe(false);
  });
});
