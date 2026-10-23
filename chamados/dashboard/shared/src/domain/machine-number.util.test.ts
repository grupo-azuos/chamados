import { describe, expect, it } from 'vitest';

import {
  compareMachines,
  physicalNameOf,
  suggestNickname,
  trailingNumberOf,
  type NumberedMachine,
} from './machine-number.util';

/* Máquinas inventadas, nos nomes que o parque usa — nenhum dado de pessoa. */
function machine(over: Partial<NumberedMachine>): NumberedMachine {
  return { name: 'MAQUINA', kind: 'desktop', department: 'Paralegal', ...over };
}

describe('compareMachines', () => {
  // feliz
  it('orders by the physical name, with the number in natural order', () => {
    const sorted = [
      machine({ hostname: 'PARALEGAL-D10' }),
      machine({ hostname: 'ANALYZE-N01' }),
      machine({ hostname: 'PARALEGAL-D02' }),
      machine({ hostname: 'ANALYZE-D01' }),
    ].sort(compareMachines);

    expect(sorted.map(physicalNameOf)).toEqual([
      'ANALYZE-D01',
      'ANALYZE-N01',
      'PARALEGAL-D02',
      'PARALEGAL-D10',
    ]);
  });

  // triste
  /* Antes da primeira conexão não há hostname: vale o nome cadastrado. Empate cai no apelido. */
  it('falls back to the registered name and breaks ties by the nickname', () => {
    const sorted = [
      machine({ name: 'RH-D01', displayName: 'Computador 02' }),
      machine({ name: 'RH-D01', displayName: 'Computador 01' }),
    ].sort(compareMachines);

    expect(sorted.map((item) => item.displayName)).toEqual(['Computador 01', 'Computador 02']);
  });
});

describe('trailingNumberOf', () => {
  // feliz
  it('reads the number at the end of a name', () => {
    expect(trailingNumberOf('PARALEGAL-D05')).toBe(5);
    expect(trailingNumberOf('Computador 06')).toBe(6);
  });

  // triste
  it('answers null when the name does not end in a number', () => {
    expect(trailingNumberOf('Recepção — balcão')).toBeNull();
    expect(trailingNumberOf(null)).toBeNull();
  });
});

describe('suggestNickname', () => {
  const park = [
    machine({ displayName: 'Computador 05', hostname: 'PARALEGAL-D05' }),
    machine({ displayName: 'Computador 06', hostname: 'PARALEGAL-D06' }),
    machine({ displayName: 'Notebook 01', hostname: 'PARALEGAL-N01', kind: 'notebook' }),
    machine({ displayName: 'Computador 09', department: 'Comercial' }),
  ];

  // feliz
  it('suggests the next number in the same format the department already uses', () => {
    expect(suggestNickname(park, 'Paralegal', 'desktop')).toBe('Computador 07');
    expect(suggestNickname(park, 'paralegal', 'notebook')).toBe('Notebook 02');
  });

  /* O nome físico também conta: PARALEGAL-D08 sem apelido já ocupa o 08. */
  it('never reuses a number already taken in the physical name', () => {
    const withUnnamed = [...park, machine({ name: 'PARALEGAL-D08', displayName: null })];

    expect(suggestNickname(withUnnamed, 'Paralegal', 'desktop')).toBe('Computador 09');
  });

  // triste
  it('suggests nothing for a department with no machine of that kind', () => {
    expect(suggestNickname(park, 'Recursos Humanos', 'desktop')).toBeNull();
    expect(suggestNickname(park, 'Comercial', 'notebook')).toBeNull();
  });

  it('suggests nothing when the machines there do not follow the numbered pattern', () => {
    const loose = [machine({ displayName: 'Recepção — balcão', department: 'Recepção' })];

    expect(suggestNickname(loose, 'Recepção', 'desktop')).toBeNull();
  });
});
