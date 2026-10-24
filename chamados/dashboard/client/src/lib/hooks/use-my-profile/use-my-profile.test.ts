import { describe, expect, it } from 'vitest';

import { mergePerson, toBirthDateLabel } from './use-my-profile.svelte';

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
