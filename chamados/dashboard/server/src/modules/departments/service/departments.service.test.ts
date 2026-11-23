import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { departmentNameOf } from '../../../lib/db/reference-names.util';

import { type HrDepartmentsRepository } from '../repository/hr-departments.repository';
import { DepartmentsService, HR_DEPARTMENTS_TTL_MS } from './departments.service';

const OPTIONS = [
  { id: 10, name: 'Contábil' },
  { id: 11, name: 'Fiscal' },
];

function setup(listOptions = vi.fn().mockResolvedValue(OPTIONS)) {
  let now = 1_000;
  const service = new DepartmentsService(
    { listOptions } as unknown as HrDepartmentsRepository,
    () => now,
  );

  return { service, listNames: listOptions, advance: (ms: number) => (now += ms) };
}

describe('DepartmentsService', () => {
  // feliz
  it('offers the HR departments and, apart, the local ones', async () => {
    const { service } = setup();

    await expect(service.catalog()).resolves.toEqual({
      rh: ['Contábil', 'Fiscal'],
      rhOptions: OPTIONS,
      local: ['ANALYZE', 'CERTIFICADO', 'RECEPÇÃO'],
      isRhAvailable: true,
    });
    expect(departmentNameOf(11)).toBe('Fiscal');
    await expect(service.names()).resolves.toEqual([
      'Contábil',
      'Fiscal',
      'ANALYZE',
      'CERTIFICADO',
      'RECEPÇÃO',
    ]);
  });

  it('reads HR once every five minutes, not on every form', async () => {
    const { service, listNames, advance } = setup();

    await service.catalog();
    await service.catalog();
    expect(listNames).toHaveBeenCalledOnce();

    advance(HR_DEPARTMENTS_TTL_MS + 1);
    await service.catalog();
    expect(listNames).toHaveBeenCalledTimes(2);
  });

  // triste
  it('keeps the last list read when HR stops answering', async () => {
    const { service, listNames, advance } = setup();
    await service.catalog();

    listNames.mockRejectedValue(new Error('gestao_rh fora do ar'));
    advance(HR_DEPARTMENTS_TTL_MS + 1);

    await expect(service.catalog()).resolves.toMatchObject({ rh: ['Contábil', 'Fiscal'], isRhAvailable: true });
  });

  it('says HR is unavailable, and still offers the local ones, when no list was ever read', async () => {
    const { service } = setup(vi.fn().mockRejectedValue(new Error('gestao_rh fora do ar')));

    await expect(service.catalog()).resolves.toEqual({
      rh: [],
      rhOptions: [],
      local: ['ANALYZE', 'CERTIFICADO', 'RECEPÇÃO'],
      isRhAvailable: false,
    });
  });

  // feliz
  it('accepts an official department id', async () => {
    await expect(setup().service.assertOfficial(11)).resolves.toBeUndefined();
  });

  // triste
  it('refuses an id that is not in the HR list with 400', async () => {
    await expect(setup().service.assertOfficial(99)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses with 503, instead of accepting blindly, when HR never answered', async () => {
    const { service } = setup(vi.fn().mockRejectedValue(new Error('fora do ar')));

    await expect(service.assertOfficial(11)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
