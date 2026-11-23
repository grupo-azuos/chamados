import { type DirectoryUser } from '@template/shared/schemas/user.schema';
import { describe, expect, it } from 'vitest';

import {
  indexPeopleByName,
  normalizePersonName,
  responsibleFilterOf,
  responsiblePersonOf,
} from './computer-responsible.util';

const person = (overrides: Partial<DirectoryUser>): DirectoryUser => ({
  id: 'person-1',
  name: 'Ana Exemplo',
  email: 'ana@exemplo.invalid',
  image: null,
  banned: false,
  ...overrides,
});

describe('normalizePersonName', () => {
  // feliz
  it('ignores extra spaces and letter case, like the person who typed it would', () => {
    expect(normalizePersonName('  ana   EXEMPLO ')).toBe('ana exemplo');
  });

  // triste
  it('turns a blank name into an empty key that matches nobody', () => {
    expect(normalizePersonName('   ')).toBe('');
  });
});

describe('responsiblePersonOf', () => {
  const index = indexPeopleByName([
    person({ id: 'person-1', name: 'Ana Exemplo', image: '/avatars/ana.png' }),
    person({ id: 'person-2', name: 'Bruno Exemplo' }),
  ]);

  // feliz
  it('finds the directory person and photo behind the typed responsible name', () => {
    expect(responsiblePersonOf('ana exemplo ', index)).toEqual({ id: 'person-1', avatarUrl: '/avatars/ana.png' });
    expect(responsiblePersonOf('Bruno Exemplo', index)).toEqual({ id: 'person-2', avatarUrl: null });
  });

  // triste
  it('returns nobody for a machine without responsible or with a name outside the directory', () => {
    expect(responsiblePersonOf(null, index)).toBeNull();
    expect(responsiblePersonOf('Pessoa Desconhecida', index)).toBeNull();
  });

  // triste
  it('keeps the active account when a blocked one has the same name', () => {
    const shared = indexPeopleByName([
      person({ id: 'old', name: 'Ana Exemplo', banned: true, image: '/old.png' }),
      person({ id: 'new', name: 'Ana Exemplo', image: '/new.png' }),
    ]);

    expect(responsiblePersonOf('Ana Exemplo', shared)).toEqual({ id: 'new', avatarUrl: '/new.png' });
  });
});

describe('responsibleFilterOf', () => {
  const people = [person({ id: 'person-1', name: ' Ana  Exemplo ' })];

  // feliz
  it('translates the directory id into the normalized name the record keeps', () => {
    expect(responsibleFilterOf('person-1', people)).toEqual({ kind: 'name', name: 'ana exemplo' });
  });

  // feliz
  it('asks for machines without responsible on the "none" choice', () => {
    expect(responsibleFilterOf('none', people)).toEqual({ kind: 'none' });
  });

  // triste
  it('matches no machine when the chosen person left the directory, instead of showing all', () => {
    expect(responsibleFilterOf('gone', people)).toEqual({ kind: 'nobody' });
  });

  // triste
  it('applies no filter when none was asked', () => {
    expect(responsibleFilterOf(undefined, people)).toBeUndefined();
  });
});
