import { describe, expect, it } from 'vitest';

import {
  LOCAL_DEPARTMENTS,
  departmentChoices,
  departmentFromText,
  departmentLabel,
  departmentNames,
  isSameDepartment,
  legacyCodesOf,
  withCurrentDepartment,
} from './department.util';

const catalog = { rh: ['Contábil', 'Departamento Pessoal', 'Fiscal'], local: [...LOCAL_DEPARTMENTS] };

describe('departmentLabel', () => {
  // feliz
  it('shows the stored name as it is', () => {
    expect(departmentLabel('Experiência do Cliente')).toBe('Experiência do Cliente');
  });

  it('translates a code saved before the list came from HR', () => {
    expect(departmentLabel('contabil')).toBe('Contábil');
    expect(departmentLabel('recepcao')).toBe('RECEPÇÃO');
  });
});

describe('departmentChoices', () => {
  // feliz
  it('lists HR departments first and the local ones after a divider', () => {
    const choices = departmentChoices(catalog);

    expect(choices.map((choice) => choice.value)).toEqual([
      'Contábil',
      'Departamento Pessoal',
      'Fiscal',
      'ANALYZE',
      'CERTIFICADO',
      'RECEPÇÃO',
    ]);
    expect(choices.filter((choice) => choice.separatorBefore).map((choice) => choice.value)).toEqual([
      'ANALYZE',
    ]);
  });

  // triste
  it('drops a local department once HR has it, so it never shows twice', () => {
    const names = departmentNames({ rh: ['Recepção', 'Fiscal'], local: [...LOCAL_DEPARTMENTS] });

    expect(names).toEqual(['Recepção', 'Fiscal', 'ANALYZE', 'CERTIFICADO']);
  });

  it('draws no divider when HR has nothing to offer', () => {
    const choices = departmentChoices({ rh: [], local: ['ANALYZE'] });

    expect(choices).toEqual([{ value: 'ANALYZE', label: 'ANALYZE', separatorBefore: true }]);
  });
});

describe('departmentFromText', () => {
  const names = departmentNames(catalog);

  // feliz
  it('finds the department whatever the accent or case the admin-console used', () => {
    expect(departmentFromText('CONTABIL', names)).toBe('Contábil');
    expect(departmentFromText('  departamento   pessoal ', names)).toBe('Departamento Pessoal');
  });

  it('finds the department named inside a longer text', () => {
    expect(departmentFromText('Depto. Fiscal', names)).toBe('Fiscal');
  });

  // triste
  it('gives nothing when there is no single match', () => {
    expect(departmentFromText('Marketing', names)).toBeNull();
    expect(departmentFromText('', names)).toBeNull();
    expect(departmentFromText(null, names)).toBeNull();
  });
});

describe('withCurrentDepartment', () => {
  const choices = departmentChoices(catalog);

  // feliz
  it('keeps the list as it is when the current value is already on it', () => {
    expect(withCurrentDepartment(choices, 'Fiscal')).toEqual(choices);
    expect(withCurrentDepartment(choices, null)).toEqual(choices);
  });

  // triste
  it('adds a department HR no longer has, so editing does not seem to erase it', () => {
    const extended = withCurrentDepartment(choices, 'Marketing');

    expect(extended.at(-1)).toEqual({ value: 'Marketing', label: 'Marketing', separatorBefore: true });
  });
});

describe('legacyCodesOf and isSameDepartment', () => {
  // feliz
  /* O nome do RH acha o código antigo gravado antes dele: "Departamento Pessoal" é `pessoal`. */
  it('knows the legacy code behind each name and treats both as the same department', () => {
    expect(legacyCodesOf('Departamento Pessoal')).toEqual(['pessoal']);
    expect(legacyCodesOf('contábil')).toEqual(['contabil']);
    expect(isSameDepartment('contabil', 'Contábil')).toBe(true);
    expect(isSameDepartment('CONTÁBIL ', 'Contábil')).toBe(true);
  });

  // triste
  it('keeps different departments apart and has no code for a brand new one', () => {
    expect(legacyCodesOf('Marketing')).toEqual([]);
    expect(isSameDepartment('fiscal', 'Contábil')).toBe(false);
    expect(isSameDepartment(null, 'Contábil')).toBe(false);
  });
});
