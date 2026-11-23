import { describe, expect, it } from 'vitest';

import {
  computerDepartmentLabel,
  computerPlaceLabel,
  computerResponsibleLabel,
} from './computer-place.util';

const place = (over: Partial<Parameters<typeof computerPlaceLabel>[0]> = {}) => ({
  departmentId: null,
  departmentName: null,
  location: null,
  ...over,
});

describe('computer-place.util', () => {
  // feliz
  it('shows the HR name and, beside it, the fixed location', () => {
    expect(computerPlaceLabel(place({ departmentId: 3, departmentName: 'Fiscal', location: 'RECEPÇÃO' }))).toBe(
      'Fiscal · RECEPÇÃO',
    );
    expect(computerPlaceLabel(place({ location: 'ANALYZE' }))).toBe('ANALYZE');
    expect(computerDepartmentLabel(place({ departmentId: 3, departmentName: 'Fiscal' }))).toBe('Fiscal');
    expect(computerResponsibleLabel({ responsibleName: 'Ana Souza' })).toBe('Ana Souza');
  });

  // triste
  it('says the department left the HR list instead of showing a bare id', () => {
    expect(computerDepartmentLabel(place({ departmentId: 99 }))).toBe('(Departamento fora da lista do RH)');
    expect(computerPlaceLabel(place())).toBe('Sem departamento');
    expect(computerDepartmentLabel(place())).toBe('Sem departamento');
    expect(computerResponsibleLabel({ responsibleName: null })).toBe('(Sem responsável)');
  });
});
