import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mergePerson, toBirthDateLabel, type useMyProfileModel } from './use-my-profile.svelte';

const user = {
  id: 'u-1',
  email: 'ana@grupoazuos.com.br',
  name: 'Ana (sessão)',
  role: 'superadmin' as const,
  image: null,
};
const account = {
  name: 'Ana Souza',
  email: 'ana@grupoazuos.com.br',
  role: 'admin' as const,
  profile: {
    avatarUrl: 'https://admin-console.test/api/users/1/avatar',
    jobTitle: 'Analista de TI',
    department: 'Tecnologia',
    phone: '11912345678',
    birthDate: '1990-03-25',
    bio: null,
  },
};

describe('mergePerson', () => {
  // feliz
  it('fills the card from the account and keeps the role of the Chamados', () => {
    const person = mergePerson(user as never, account, [
      { name: 'Paralegal', presentation: { url: 'https://paralegal.test' }, access: { role: 'user' } },
    ]);

    expect(person).toMatchObject({
      name: 'Ana Souza',
      roleLabel: 'Super Admin',
      jobTitle: 'Analista de TI',
      birthDateLabel: '25/03/1990',
      systems: [{ name: 'Paralegal', url: 'https://paralegal.test', roleLabel: 'Usuário' }],
    });
  });

  // triste
  it('falls back to the session when the admin console does not answer', () => {
    expect(mergePerson(user as never, undefined, undefined)).toMatchObject({
      name: 'Ana (sessão)',
      jobTitle: null,
      systems: undefined,
    });
  });

  it('has nobody without either source', () => {
    expect(mergePerson(undefined, undefined, undefined)).toBeNull();
  });
});

describe('toBirthDateLabel', () => {
  it('writes the day the Brazilian way and ignores a malformed one', () => {
    expect(toBirthDateLabel('1990-03-25')).toBe('25/03/1990');
    expect(toBirthDateLabel('25/03/1990')).toBeNull();
  });
});

vi.mock('$lib/api/auth.api', () => ({
  authApi: { config: vi.fn() },
}));

/* Só as chamadas são fingidas: `accountOrigin` e `accountProfileUrl` são regra, e ficam reais. */
vi.mock('$lib/api/account-profile.api', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  accountProfileApi: { me: vi.fn(), systems: vi.fn() },
}));

const { authApi } = await import('$lib/api/auth.api');
const { accountProfileApi } = await import('$lib/api/account-profile.api');
const { default: Harness } = await import('./use-my-profile-harness.test.svelte');
const { render } = await import('@testing-library/svelte');

type ProfileModel = ReturnType<typeof useMyProfileModel>;

function mountModel(sessionUser: typeof user | undefined): ProfileModel {
  let model!: ProfileModel;
  render(Harness, {
    props: { user: sessionUser as never, onReady: (ready: ProfileModel) => (model = ready) },
  });

  return model;
}

describe('useMyProfileModel', () => {
  beforeEach(() => {
    vi.mocked(authApi.config).mockResolvedValue({ accountUrl: 'https://conta.azuos.test/login' } as never);
    vi.mocked(accountProfileApi.me).mockResolvedValue(account);
    vi.mocked(accountProfileApi.systems).mockResolvedValue([
      { name: 'Paralegal', presentation: { url: 'https://paralegal.test' }, access: { role: 'user' } },
    ]);
  });

  // feliz
  it('reads the card from the account, at the address the API configured', async () => {
    const model = mountModel(user);
    expect(model.state.isLoading).toBe(false);

    await vi.waitFor(() => expect(model.data.person?.name).toBe('Ana Souza'), { timeout: 4_000 });
    expect(accountProfileApi.me).toHaveBeenCalledWith('https://conta.azuos.test');
    expect(model.data.person?.systems).toHaveLength(1);
    await vi.waitFor(() => expect(model.data.accountUrl).toContain('conta.azuos.test'));
  });

  it('toggles the theme and asks the account again on retry', async () => {
    const model = mountModel(user);
    const before = model.data.theme;

    model.actions.onToggleTheme();
    expect(model.data.theme).not.toBe(before);
    model.actions.onToggleTheme();

    await vi.waitFor(() => expect(model.data.person?.name).toBe('Ana Souza'), { timeout: 4_000 });
    model.actions.onRetry();
    await vi.waitFor(() => expect(accountProfileApi.me).toHaveBeenCalledTimes(2));
  });

  // triste
  it('falls back to the session while the account does not answer', async () => {
    vi.mocked(accountProfileApi.me).mockRejectedValue(new Error('fora'));
    vi.mocked(accountProfileApi.systems).mockRejectedValue(new Error('fora'));
    const model = mountModel(user);

    await vi.waitFor(() => expect(model.data.person?.name).toBe('Ana (sessão)'), { timeout: 4_000 });
    expect(model.data.person?.systems).toBeUndefined();
    expect(model.state.error).toBeNull();
  });

  it('is loading only without a session and before the account answers', async () => {
    vi.mocked(accountProfileApi.me).mockReturnValue(new Promise(() => {}));
    const model = mountModel(undefined);

    expect(model.state.isLoading).toBe(true);
    expect(model.data.person).toBeNull();
  });
});
