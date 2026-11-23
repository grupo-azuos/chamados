import { describe, expect, it, vi } from 'vitest';

import { type ComputerRow } from '../../../lib/db/schema/computers.schema';
import { type DepartmentsService } from '../../departments/service/departments.service';
import { type ComputersRepository } from '../repository/computers.repository';
import {
  adoptPreviousDepartment,
  ComputerReferenceBackfillService,
  PREVIOUS_DEPARTMENT_MARKER,
} from './computer-reference-backfill.service';
import { type ComputersService } from './computers.service';

const OPTIONS = [
  { id: 12, name: 'Fiscal' },
  { id: 13, name: 'Departamento Pessoal' },
  { id: 14, name: 'Contábil' },
];

describe('adoptPreviousDepartment', () => {
  // feliz
  it('takes the HR id of the old name and removes only that line from the notes', () => {
    expect(
      adoptPreviousDepartment('Mesa 3\nResponsável anterior: Ana\nDepartamento anterior: fiscal ', OPTIONS),
    ).toEqual({ departmentId: 12, notes: 'Mesa 3\nResponsável anterior: Ana' });
  });

  // feliz
  it('accepts the old code and leaves the notes empty when nothing else was there', () => {
    expect(adoptPreviousDepartment('Departamento anterior: pessoal', OPTIONS)).toEqual({
      departmentId: 13,
      notes: null,
    });
  });

  // triste
  it('keeps the line when the old name has no HR department, or there is no line at all', () => {
    expect(adoptPreviousDepartment('Departamento anterior: Departamento X', OPTIONS)).toBeNull();
    expect(adoptPreviousDepartment('Responsável anterior: Ana', OPTIONS)).toBeNull();
    expect(adoptPreviousDepartment(null, OPTIONS)).toBeNull();
  });

  // triste
  it('does not guess when HR has two departments with the same name', () => {
    const twice = [...OPTIONS, { id: 99, name: 'fiscal' }];

    expect(adoptPreviousDepartment('Departamento anterior: Fiscal', twice)).toBeNull();
  });
});

describe('ComputerReferenceBackfillService', () => {
  const row = (id: number, notes: string) => ({ id, notes }) as ComputerRow;

  function setup(options: typeof OPTIONS | null) {
    const repository = {
      listWithPreviousDepartment: vi.fn().mockResolvedValue([
        row(1, 'Departamento anterior: Contábil'),
        row(2, 'Departamento anterior: Sem Par'),
      ]),
      update: vi.fn().mockResolvedValue(undefined),
    };
    const computers = { loadReferences: vi.fn().mockResolvedValue([]) };
    const departments = { officialOptions: vi.fn().mockResolvedValue(options) };
    const service = new ComputerReferenceBackfillService(
      repository as unknown as ComputersRepository,
      computers as unknown as ComputersService,
      departments as unknown as DepartmentsService,
    );

    return { service, repository };
  }

  // feliz
  it('fills the HR id of the machines whose old name matches, and only those', async () => {
    const { service, repository } = setup(OPTIONS);

    await expect(service.run()).resolves.toBe(1);
    expect(repository.listWithPreviousDepartment).toHaveBeenCalledWith(PREVIOUS_DEPARTMENT_MARKER);
    expect(repository.update).toHaveBeenCalledExactlyOnceWith(1, { departmentId: 14, notes: null });
  });

  // triste
  it('touches nothing while HR has never answered', async () => {
    const { service, repository } = setup(null);

    await expect(service.run()).resolves.toBeNull();
    expect(repository.listWithPreviousDepartment).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });
});
