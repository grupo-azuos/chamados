import { describe, expect, it } from 'vitest';

import { integerInWords, moneyInWords } from './number-in-words.util';

describe('integerInWords', () => {
  // feliz
  it('writes hundreds, thousands and millions with "e" in the right place', () => {
    expect(integerInWords(1)).toBe('um');
    expect(integerInWords(100)).toBe('cem');
    expect(integerInWords(101)).toBe('cento e um');
    expect(integerInWords(1_000)).toBe('mil');
    expect(integerInWords(1_001)).toBe('mil e um');
    expect(integerInWords(1_100)).toBe('mil e cem');
    expect(integerInWords(1_234)).toBe('mil duzentos e trinta e quatro');
    expect(integerInWords(21_500)).toBe('vinte e um mil e quinhentos');
    expect(integerInWords(1_200_100)).toBe('um milhão, duzentos mil e cem');
    expect(integerInWords(2_000_000_000)).toBe('dois bilhões');
  });

  // triste
  it('does not break on zero, negative or invalid values', () => {
    expect(integerInWords(0)).toBe('zero');
    expect(integerInWords(Number.NaN)).toBe('zero');
    expect(integerInWords(-15)).toBe('quinze');
  });
});

describe('moneyInWords', () => {
  // feliz
  it('agrees real/reais and uses "de reais" on a round million', () => {
    expect(moneyInWords(1)).toBe('um real');
    expect(moneyInWords(2)).toBe('dois reais');
    expect(moneyInWords(101)).toBe('cento e um reais');
    expect(moneyInWords(1_000)).toBe('mil reais');
    expect(moneyInWords(1_000_000)).toBe('um milhão de reais');
    expect(moneyInWords(2_000_000)).toBe('dois milhões de reais');
    expect(moneyInWords(1_100_000)).toBe('um milhão e cem mil reais');
  });

  // feliz
  it('writes the cents', () => {
    expect(moneyInWords(10.5)).toBe('dez reais e cinquenta centavos');
    expect(moneyInWords(0.01)).toBe('um centavo');
    expect(moneyInWords(0.5)).toBe('cinquenta centavos');
    expect(moneyInWords(1.01)).toBe('um real e um centavo');
  });

  // triste
  it('turns zero and invalid values into "zero reais", without NaN', () => {
    expect(moneyInWords(0)).toBe('zero reais');
    expect(moneyInWords(Number.NaN)).toBe('zero reais');
  });
});
