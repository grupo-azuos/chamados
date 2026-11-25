import { describe, expect, it } from 'vitest';

import { normalizeSystemName } from './system-name.util';

describe('normalizeSystemName', () => {
  // feliz
  it('lowercases the typed system name', () => {
    expect(normalizeSystemName('Trilha')).toBe('trilha');
  });

  it('gives the same name for every way of typing it', () => {
    const names = ['Trilha', 'trilha', 'TRILHA', '  Trilha  '].map(normalizeSystemName);

    expect(new Set(names)).toEqual(new Set(['trilha']));
  });

  it('trims the ends and collapses inner spaces into one', () => {
    expect(normalizeSystemName('  Portal   do\tCliente ')).toBe('portal do cliente');
  });

  it('keeps accents, only in lowercase', () => {
    expect(normalizeSystemName('GESTÃO Fiscal')).toBe('gestão fiscal');
  });

  it('is idempotent: normalizing twice changes nothing', () => {
    const once = normalizeSystemName(' Gestão  RH ');

    expect(normalizeSystemName(once)).toBe(once);
  });

  // triste
  it('turns a name made only of spaces into null', () => {
    expect(normalizeSystemName('   ')).toBeNull();
  });

  it('turns an empty name into null', () => {
    expect(normalizeSystemName('')).toBeNull();
  });

  it('turns a missing name into null', () => {
    expect(normalizeSystemName(null)).toBeNull();
    expect(normalizeSystemName(undefined)).toBeNull();
  });
});
