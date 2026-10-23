import { describe, expect, it } from 'vitest';

import {
  compareMachines,
  machineNumberOf,
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
  /* O caso do print: nomes físicos do Windows (sem padrão) — vale o número do apelido. */
  it('orders by the number of the nickname when the physical name is not in the pattern', () => {
    const sorted = [
      machine({ hostname: 'DESKTOP-1IR1609', displayName: 'Notebook 02', kind: 'notebook' }),
      machine({ hostname: 'DESKTOP-MC8LBDJ', displayName: 'Computador 01' }),
      machine({ hostname: 'DESKTOP-V37Q5JD', displayName: 'Notebook 01', kind: 'notebook' }),
    ].sort(compareMachines);

    expect(sorted.map((item) => item.displayName)).toEqual([
      'Computador 01',
      'Notebook 01',
      'Notebook 02',
    ]);
  });

  it('prefers the number of a patterned physical name, in natural order', () => {
    const sorted = [
      machine({ hostname: 'PARALEGAL-D10', displayName: 'Computador 01' }),
      machine({ hostname: 'PARALEGAL-D02' }),
      machine({ hostname: 'ANALYZE-D01' }),
    ].sort(compareMachines);

    expect(sorted.map(physicalNameOf)).toEqual(['ANALYZE-D01', 'PARALEGAL-D02', 'PARALEGAL-D10']);
  });

  /* Há notebook cadastrado como desktop: o grupo segue o que a pessoa vê, o apelido. */
  it('groups by the word people see, even when the registered kind disagrees', () => {
    const sorted = [
      machine({ hostname: 'FINANCEIRO-N01', displayName: 'Notebook 01', kind: 'desktop' }),
      machine({ hostname: 'FINANCEIRO-D02', displayName: 'Computador 02' }),
      machine({ hostname: 'DESKTOP-0EJLHCT', displayName: 'Notebook', kind: 'desktop' }),
    ].sort(compareMachines);

    expect(sorted.map((item) => item.displayName)).toEqual(['Computador 02', 'Notebook 01', 'Notebook']);
  });

  // triste
  it('sends machines with no number to the end', () => {
    const sorted = [
      machine({ hostname: 'DESKTOP-ABC', displayName: 'Recepção — balcão' }),
      machine({ hostname: 'DESKTOP-XYZ', displayName: 'Computador 03' }),
    ].sort(compareMachines);

    expect(sorted.map((item) => item.displayName)).toEqual(['Computador 03', 'Recepção — balcão']);
  });
});

describe('machineNumberOf', () => {
  // feliz
  it('reads the number of the patterned physical name, or else of the nickname', () => {
    expect(machineNumberOf(machine({ hostname: 'CERTIFICADO-D02', displayName: 'Computador 09' }))).toBe(2);
    expect(machineNumberOf(machine({ hostname: 'DESKTOP-1IR1609', displayName: 'Notebook 02' }))).toBe(2);
  });

  // triste
  it('never takes the digits of a name the Windows made up', () => {
    expect(machineNumberOf(machine({ hostname: 'DESKTOP-1IR1609', displayName: null }))).toBeNull();
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

  it('ignores the digits of a physical name the Windows made up', () => {
    const windows = [machine({ hostname: 'DESKTOP-1IR1609', displayName: 'Computador 02' })];

    expect(suggestNickname(windows, 'Paralegal', 'desktop')).toBe('Computador 03');
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
