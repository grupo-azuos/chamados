import { describe, expect, it } from 'vitest';

import { MOCK_IDENTITY } from './identity.provider';
import { withoutMockIdentity } from './mock-identity.util';

const PRODUCTION = { NODE_ENV: 'production', USER_MOCK: undefined } as const;
const DEVELOPMENT = { NODE_ENV: 'development', USER_MOCK: undefined } as const;

const REAL = { userId: 'u-real', userEmail: 'pessoa@exemplo.com' };
const MOCK_BY_EMAIL = { userId: null, userEmail: 'DEV@chamados.local' };
const MOCK_BY_ID = { userId: MOCK_IDENTITY.id, userEmail: 'dev@chamados.local' };

describe('withoutMockIdentity', () => {
  // feliz
  /* Em produção a pessoa de desenvolvimento não entra, então os acessos dela somem das listas. */
  it('drops the development person in production, by id or by e-mail', () => {
    expect(withoutMockIdentity([REAL, MOCK_BY_EMAIL, MOCK_BY_ID], PRODUCTION)).toEqual([REAL]);
  });

  // feliz
  /* Na máquina de quem programa ela É quem usa o painel: tirá-la ali esconderia o próprio acesso. */
  it('keeps the development person while the mock is on', () => {
    expect(withoutMockIdentity([REAL, MOCK_BY_ID], DEVELOPMENT)).toEqual([REAL, MOCK_BY_ID]);
  });

  // triste
  /* Mock desligado à força fora de produção: vale a mesma regra de produção. */
  it('drops the development person when USER_MOCK is false', () => {
    expect(
      withoutMockIdentity([MOCK_BY_EMAIL], { NODE_ENV: 'development', USER_MOCK: 'false' }),
    ).toEqual([]);
  });

  // triste
  it('keeps everyone when no row is the development person', () => {
    expect(withoutMockIdentity([REAL], PRODUCTION)).toEqual([REAL]);
  });
});
