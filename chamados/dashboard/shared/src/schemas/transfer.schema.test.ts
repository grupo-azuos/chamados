import { describe, expect, it } from 'vitest';

import { createTransferSchema, installedPartSchema, transferSchema } from './transfer.schema';

describe('transfer contract', () => {
  // feliz
  it('accepts a transfer to the shelf, with no peripherals by default', () => {
    expect(createTransferSchema.parse({ toDepartment: null })).toEqual({
      toDepartment: null,
      peripherals: [],
    });
  });

  it('accepts a peripheral that goes with the machine, and one left at a station', () => {
    const parsed = createTransferSchema.safeParse({
      toDepartment: 'Fiscal',
      responsible: 'Joana',
      peripherals: [
        { partId: 1, quantity: 1, destiny: 'machine' },
        { partId: 2, quantity: 1, destiny: 'station', destinationComputerId: 9 },
      ],
    });
    expect(parsed.success).toBe(true);

    expect(
      installedPartSchema.safeParse({ partId: 1, name: 'Teclado', category: 'keyboard', quantity: 1 }).success,
    ).toBe(true);
    expect(
      transferSchema.safeParse({
        id: 1,
        computerId: 1,
        fromDepartment: null,
        toDepartment: 'Fiscal',
        responsible: null,
        note: null,
        peripheralsLeftBehind: 0,
        createdAt: '2026-10-20T12:00:00.000Z',
        createdBy: 'ana@empresa.com.br',
      }).success,
    ).toBe(true);
  });

  // triste
  it('asks which machine takes a peripheral left at the station', () => {
    const refused = createTransferSchema.safeParse({
      toDepartment: 'Fiscal',
      peripherals: [{ partId: 2, quantity: 1, destiny: 'station' }],
    });

    expect(refused.success).toBe(false);
    expect(refused.success ? '' : refused.error.issues[0]?.message).toBe('Diga qual máquina assume esta peça.');
  });
});
