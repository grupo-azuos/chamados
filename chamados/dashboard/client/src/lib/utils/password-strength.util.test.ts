import { describe, expect, it } from 'vitest';

import {
  MINIMUM_LENGTH,
  STRENGTH_HINTS,
  STRENGTH_LENGTH,
  STRENGTH_RULES,
  toPasswordStrength,
} from './password-strength.util';

describe('toPasswordStrength', () => {
  it('scores a password that meets every rule as strong', () => {
    const strength = toPasswordStrength('Chuva-De-Verao-2026!');

    expect(strength.score).toBe(4);
    expect(strength.level).toBe('strong');
    expect(strength.met).toEqual({ length: true, number: true, symbol: true, mixedCase: true });
  });

  it('reads each rule on its own', () => {
    expect(toPasswordStrength('abcdefghijkl').met.length).toBe(true);
    expect(toPasswordStrength('abc1').met.number).toBe(true);
    expect(toPasswordStrength('abc!').met.symbol).toBe(true);
    expect(toPasswordStrength('aB').met.mixedCase).toBe(true);
  });

  /* Vazio não é fraco, é inexistente. Pintar um bloco vermelho antes do primeiro caractere
     acusa quem ainda não digitou nada. */
  it('says nothing at all about an empty password', () => {
    const strength = toPasswordStrength('');

    expect(strength.score).toBe(0);
    expect(strength.level).toBe('none');
  });

  /* CAMINHO TRISTE: senha longa e só de letras minúsculas cumpre UM critério. A barra
     precisa dizer isso, senão o comprimento sozinho passa por segurança. */
  it('does not let length alone look like a strong password', () => {
    const strength = toPasswordStrength('abacaxicomcaju');

    expect(strength.score).toBe(1);
    expect(strength.level).toBe('weak');
  });

  /* Acento e cedilha são LETRAS, e uma senha em português é escrita com eles. Uma lista
     fechada de símbolos os contaria como símbolo, e a barra mentiria para cima. */
  it('does not mistake an accented letter for a symbol', () => {
    expect(toPasswordStrength('maracuja').met.symbol).toBe(false);
    expect(toPasswordStrength('maracujá').met.symbol).toBe(false);
    expect(toPasswordStrength('maracuja!').met.symbol).toBe(true);
  });

  it('counts an accented capital as mixed case', () => {
    expect(toPasswordStrength('Ácido').met.mixedCase).toBe(true);
  });

  /* Espaço é separador, não símbolo: uma frase de quatro palavras ganharia o critério de
     símbolo sem ter nenhum. */
  it('does not count a space as a symbol', () => {
    expect(toPasswordStrength('tres tigres tristes').met.symbol).toBe(false);
  });

  it('has a hint for every rule it scores', () => {
    for (const rule of STRENGTH_RULES) {
      expect(STRENGTH_HINTS[rule]).toBeTruthy();
    }
  });

  /* A barra SUGERE mais do que o servidor exige, e as duas coisas aparecem na tela. Se o
     sugerido ficasse abaixo do aceito, a lista de dicas passaria a mentir para baixo. */
  it('suggests more than the server demands, never less', () => {
    expect(STRENGTH_LENGTH).toBeGreaterThan(MINIMUM_LENGTH);
  });
});
