import { describe, expect, it } from 'vitest';

import { computerDepartmentLabel, computerResponsibleLabel } from './computer-place.util';

const place = (over: Partial<Parameters<typeof computerDepartmentLabel>[0]> = {}) => ({
  departmentId: null,
  departmentName: null,
  ...over,
});

describe('computer-place.util', () => {
  // feliz
  it('shows the HR department name and the directory name of the responsible', () => {
    expect(computerDepartmentLabel(place({ departmentId: 3, departmentName: 'Fiscal' }))).toBe('Fiscal');
    expect(computerResponsibleLabel({ responsibleName: 'Ana Souza' })).toBe('Ana Souza');
  });

  // triste
  it('says the department left the HR list instead of showing a bare id', () => {
    expect(computerDepartmentLabel(place({ departmentId: 99 }))).toBe('(Departamento fora da lista do RH)');
    expect(computerDepartmentLabel(place())).toBe('Sem departamento');
    expect(computerResponsibleLabel({ responsibleName: null })).toBe('(Sem responsável)');
  });
});
