import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type UserDirectoryProvider } from '../../../lib/auth/user-directory.type';
import { type Env } from '../../../lib/config/env.schema';
import { AuthController } from './auth.controller';

const USER: RequestUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'ana@example.com',
  name: 'Ana',
  role: 'admin',
  roles: { infra: 'admin' },
};

function directory(overrides: Partial<UserDirectoryProvider> = {}): UserDirectoryProvider {
  return {
    listUsers: vi.fn().mockResolvedValue([]),
    getUserById: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe('AuthController', () => {
  // feliz
  it('delivers the address of the admin-console account screen', () => {
    const env = { ADMIN_CONSOLE_LOGIN_URL: 'https://login.example.com' } as Env;

    expect(new AuthController(env, directory()).config()).toEqual({
      accountUrl: 'https://login.example.com',
    });
  });

  it('delivers the current person with the photo from the admin-console', async () => {
    const photo = directory({
      getUserById: vi.fn().mockResolvedValue({
        id: USER.id,
        name: 'Ana',
        email: USER.email,
        image: 'https://login.example.com/api/users/1/avatar?v=2',
      }),
    });

    await expect(new AuthController({} as Env, photo).me(USER)).resolves.toEqual({
      ...USER,
      image: 'https://login.example.com/api/users/1/avatar?v=2',
    });
  });

  // triste
  it('offers no account address when the server was not configured', () => {
    expect(new AuthController({} as Env, directory()).config()).toEqual({ accountUrl: null });
  });

  /* O admin-console fora do ar não pode esconder de alguém quem ele é: só a foto some. */
  it('still answers who the person is when the admin-console is down', async () => {
    const down = directory({ getUserById: vi.fn().mockRejectedValue(new Error('offline')) });

    await expect(new AuthController({} as Env, down).me(USER)).resolves.toEqual({
      ...USER,
      image: null,
    });
  });
});
