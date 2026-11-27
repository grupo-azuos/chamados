import { describe, expect, it } from 'vitest';

import { personIdsByName, personNameKey } from './person-name.util';

describe('personNameKey', () => {
  // feliz
  it('ignores accents, case and extra spaces', () => {
    expect(personNameKey('  Leyla   Souzá ')).toBe(personNameKey('leyla souza'));
  });

  // triste
  it('nome diferente continua diferente', () => {
    expect(personNameKey('Leyla')).not.toBe(personNameKey('Leila'));
  });
});

describe('personIdsByName', () => {
  // feliz
  it('finds each person id by name', () => {
    const ids = personIdsByName([
      { id: 'a', name: 'Ana Souza' },
      { id: 'b', name: 'Bruno Lima' },
    ]);

    expect(ids.get(personNameKey('ana souza'))).toBe('a');
  });

  // triste
  it('gives no id to a repeated name, since it is ambiguous', () => {
    const ids = personIdsByName([
      { id: 'a', name: 'Ana Souza' },
      { id: 'c', name: 'ANA SOUZA' },
    ]);

    expect(ids.has(personNameKey('Ana Souza'))).toBe(false);
  });
});
