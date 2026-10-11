import { describe, expect, it } from 'vitest';

import { assertValidSessionId, isValidSessionId } from './session-id.util.js';

describe('isValidSessionId', () => {
  // feliz
  it('accepts the ids the auth provider hands out', () => {
    expect(isValidSessionId('3f1c9a52-7d5e-4c0b-9a1e-2b6f0d8e4c11')).toBe(true);
    expect(isValidSessionId('user_42')).toBe(true);
    expect(isValidSessionId('a'.repeat(64))).toBe(true);
  });

  // triste
  /* O id vira nome de pasta: separador de caminho ou ponto sairia da pasta de dados. */
  it('refuses path separators, dots and empty ids', () => {
    for (const id of ['', '.', '..', 'a/b', 'a\\b', 'a.b', 'a b', 'x'.repeat(129)]) {
      expect(isValidSessionId(id)).toBe(false);
    }
  });
});

describe('assertValidSessionId', () => {
  // feliz
  it('lets a valid id through without a word', () => {
    expect(() => assertValidSessionId('user-1')).not.toThrow();
  });

  // triste
  it('throws for an id that would escape the data folder', () => {
    expect(() => assertValidSessionId('../outside')).toThrow('Invalid session id');
  });
});
