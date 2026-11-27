import { describe, expect, it } from 'vitest';

import { applyMaskedInput } from './masked-field.util';

/** Uma máscara de brinquedo: só dígitos, agrupados de 3 em 3 por ponto. */
const digitsOnly = (value: string) => value.replace(/\D/g, '').slice(0, 9);
const groupByThree = (value: string) => (value.match(/.{1,3}/g) ?? []).join('.');

function run(value: string, selectionStart?: number | null) {
  return applyMaskedInput({ value, selectionStart }, digitsOnly, groupByThree);
}

describe('applyMaskedInput', () => {
  it('formats the value and hands back the clean content', () => {
    const result = run('123456789', 9);

    expect(result.value).toBe('123.456.789');
    expect(result.raw).toBe('123456789');
  });

  it('leaves the cursor at the end while typing', () => {
    expect(run('1234', 4).selectionStart).toBe(5);
  });

  /**
   * O defeito que este util existe para impedir: editar no meio e o cursor saltar.
   *
   * O "9" digitado é a 4ª posição de conteúdo, e na string mascarada ela cai no índice 4 —
   * depois do separador. O cursor fica logo à frente dela, em 5, e não no fim do campo.
   */
  it('keeps the cursor where the person is typing, not at the end', () => {
    const result = run('1239.456', 4);

    expect(result.value).toBe('123.945.6');
    expect(result.selectionStart).toBe(5);
  });

  it('does not push the cursor forward when a separator is deleted', () => {
    expect(run('123456', 3).selectionStart).toBe(3);
  });

  it('drops what the normalization rejects, without moving the cursor past it', () => {
    const result = run('12a3', 3);

    expect(result.raw).toBe('123');
    expect(result.selectionStart).toBe(2);
  });

  // triste
  it('falls back to the end of the field when no cursor was given', () => {
    expect(run('123456').selectionStart).toBe('123.456'.length);
    expect(run('123456', null).selectionStart).toBe('123.456'.length);
  });

  it('puts the cursor at the start when nothing precedes it', () => {
    expect(run('123456', 0).selectionStart).toBe(0);
  });

  it('survives an empty field', () => {
    const result = run('', 0);

    expect(result.value).toBe('');
    expect(result.raw).toBe('');
    expect(result.selectionStart).toBe(0);
  });

  it('does not run past the end when the cursor is beyond the text', () => {
    expect(run('123', 99).selectionStart).toBe('123'.length);
  });
});
