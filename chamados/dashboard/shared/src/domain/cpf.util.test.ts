import { describe, expect, it } from 'vitest';

import { formatCpf, isValidCpf } from './cpf.util';

describe('isValidCpf', () => {
  // feliz
  it('accepts a CPF with correct check digits, with or without punctuation', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('52998224725')).toBe(true);
  });

  // triste
  it('refuses a swapped digit, wrong length and repeated digits', () => {
    expect(isValidCpf('529.982.247-24')).toBe(false);
    expect(isValidCpf('5299822472')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('')).toBe(false);
  });
});

describe('formatCpf', () => {
  // feliz
  it('adds the punctuation', () => {
    expect(formatCpf('52998224725')).toBe('529.982.247-25');
  });

  // triste
  it('returns an incomplete value as it came', () => {
    expect(formatCpf(' 123 ')).toBe('123');
  });
});
