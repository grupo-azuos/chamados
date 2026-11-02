import { describe, expect, it } from 'vitest';

import { githubAuthorizationSchema, githubConnectionSchema } from './github-connection.schema';

describe('github connection contract', () => {
  // feliz
  it('accepts the status and the authorization address', () => {
    expect(githubConnectionSchema.parse({ isConfigured: true, isLinked: false, login: null })).toBeTruthy();
    expect(githubAuthorizationSchema.parse({ url: 'https://github.com/login/oauth' })).toBeTruthy();
  });

  // triste
  it('refuses an authorization that is not an address', () => {
    expect(githubAuthorizationSchema.safeParse({ url: 'nada' }).success).toBe(false);
  });
});
