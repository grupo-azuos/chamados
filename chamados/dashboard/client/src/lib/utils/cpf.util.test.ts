import { describe, expect, it } from 'vitest';

import { formatCpf, isValidCpf } from './cpf.util';

describe('isValidCpf', () => {
  // feliz
  it('aceita CPF com os dígitos verificadores certos, com ou sem pontuação', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('52998224725')).toBe(true);
  });

  // triste
  it('recusa dígito trocado, tamanho errado e cifra repetida', () => {
    expect(isValidCpf('529.982.247-24')).toBe(false);
    expect(isValidCpf('5299822472')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('')).toBe(false);
  });
});

describe('formatCpf', () => {
  // feliz
  it('põe a pontuação', () => {
    expect(formatCpf('52998224725')).toBe('529.982.247-25');
  });

  // triste
  it('valor incompleto volta como veio', () => {
    expect(formatCpf(' 123 ')).toBe('123');
  });
});
