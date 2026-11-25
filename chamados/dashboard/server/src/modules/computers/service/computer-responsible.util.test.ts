import { type DirectoryUser } from '@template/shared/schemas/user.schema';
import { describe, expect, it } from 'vitest';

import { normalizePersonName, peopleMatching, responsibleFilterOf } from './computer-responsible.util';

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

describe('responsibleFilterOf', () => {
  // feliz
  it('filters by the directory id, which is what the record keeps', () => {
    expect(responsibleFilterOf('person-1')).toEqual({ kind: 'person', id: 'person-1' });
  });

  // feliz
  it('asks for machines without responsible on the "none" choice', () => {
    expect(responsibleFilterOf('none')).toEqual({ kind: 'none' });
  });

  // triste
  it('applies no filter when none was asked', () => {
    expect(responsibleFilterOf(undefined)).toBeUndefined();
  });
});

describe('peopleMatching', () => {
  const people = [person({ id: 'person-1', name: 'Ana  Exemplo' }), person({ id: 'person-2', name: 'Bruno Teste' })];

  // feliz
  it('finds the ids of the people whose name contains the search, ignoring case and spaces', () => {
    expect(peopleMatching(' ana exemplo', people)).toEqual(['person-1']);
    expect(peopleMatching('E', people)).toEqual(['person-1', 'person-2']);
  });

  // triste
  it('finds nobody for an empty search or a name outside the directory', () => {
    expect(peopleMatching(undefined, people)).toEqual([]);
    expect(peopleMatching('   ', people)).toEqual([]);
    expect(peopleMatching('Carla', people)).toEqual([]);
  });
});
