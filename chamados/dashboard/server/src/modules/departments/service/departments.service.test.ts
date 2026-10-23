import { describe, expect, it, vi } from 'vitest';

import { type HrDepartmentsRepository } from '../repository/hr-departments.repository';
import { DepartmentsService, HR_DEPARTMENTS_TTL_MS } from './departments.service';

function setup(listNames = vi.fn().mockResolvedValue(['Contábil', 'Fiscal'])) {
  let now = 1_000;
  const service = new DepartmentsService(
    { listNames } as unknown as HrDepartmentsRepository,
    () => now,
  );

  return { service, listNames, advance: (ms: number) => (now += ms) };
}

describe('DepartmentsService', () => {
  // feliz
  it('offers the HR departments and, apart, the local ones', async () => {
    const { service } = setup();

    await expect(service.catalog()).resolves.toEqual({
      rh: ['Contábil', 'Fiscal'],
      local: ['ANALYZE', 'CERTIFICADO', 'RECEPÇÃO'],
      isRhAvailable: true,
    });
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
      local: ['ANALYZE', 'CERTIFICADO', 'RECEPÇÃO'],
      isRhAvailable: false,
    });
  });
});
