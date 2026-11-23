import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createTransferSchema } from '@template/shared/schemas/transfer.schema';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type ComputerTransferRow } from '../../../lib/db/schema/computer-transfers.schema';
import { rememberDepartments } from '../../../lib/db/reference-names.util';
import { type ComputerRow } from '../../../lib/db/schema/computers.schema';
import { type DepartmentsService } from '../../departments/service/departments.service';
import { type PartRow } from '../../../lib/db/schema/parts.schema';
import { type PartsRepository } from '../../parts/repository/parts.repository';
import { type TransfersRepository } from '../repository/transfers.repository';
import { TransfersService } from './transfers.service';

const ana: RequestUser = { id: '1', email: 'ana@empresa.com.br', name: 'Ana', role: 'admin' };

/* Identidade PELA METADE: chegou sem papel. O contrato não admite, e é por isso que o teste
   precisa forçar — a recusa existe justamente para o que não devia chegar. */
const noRole = { ...ana, role: undefined } as unknown as RequestUser;

function computer(over: Partial<ComputerRow> = {}): ComputerRow {
  return {
    id: 1,
    name: 'FINANCEIRO-02',
    displayName: 'Financeiro — mesa 2',
    responsibleId: 'person-bruno',
    departmentId: 20,
    location: null,
    isArchived: false,
    disposedAt: null,
    ...over,
  } as ComputerRow;
}

function part(over: Partial<PartRow> = {}): PartRow {
  return { id: 7, name: 'Teclado USB ABNT2', category: 'keyboard', balance: 6, ...over } as PartRow;
}

function transferRow(over: Partial<ComputerTransferRow> = {}): ComputerTransferRow {
  return {
    id: 10,
    computerId: 1,
    fromDepartment: 'Financeiro',
    toDepartment: 'Fiscal',
    responsible: null,
    note: null,
    peripheralsLeftBehind: 0,
    createdAt: new Date('2026-09-25T12:00:00.000Z'),
    createdBy: ana.email,
    ...over,
  };
}

type Overrides = {
  computers?: ComputerRow[];
  part?: PartRow | null;
  withoutHr?: boolean;
};

const HR = [
  { id: 20, name: 'Financeiro' },
  { id: 21, name: 'Fiscal' },
];

function makeService(over: Overrides = {}) {
  const machines = over.computers ?? [computer()];

  const transfers = {
    transaction: vi.fn(async (run: (executor: unknown) => Promise<unknown>) => run({})),
    findComputerForUpdate: vi.fn(async (id: number) => machines.find((m) => m.id === id) ?? null),
    insert: vi.fn(async (values: Partial<ComputerTransferRow>) => transferRow(values)),
    updateComputer: vi.fn(async () => undefined),
    listByComputer: vi.fn(async () => [transferRow()]),
    installedParts: vi.fn(async () => [
      { partId: 7, name: 'Teclado USB ABNT2', category: 'keyboard', quantity: 1 },
    ]),
  };

  const parts = {
    findByIdForUpdate: vi.fn(async () => (over.part === undefined ? part() : over.part)),
    insertMovement: vi.fn(async (_values: Record<string, unknown>) => 1),
    update: vi.fn(async (_id: number, _values: Record<string, unknown>, _executor: unknown) =>
      part(),
    ),
  };

  const departments = {
    assertOfficial: vi.fn(async (id: number) => {
      if (!HR.some((option) => option.id === id)) throw new BadRequestException('fora da lista');
    }),
    catalog: vi.fn(async () => {
      rememberDepartments(HR);
      return null;
    }),
  };

  return {
    service: new TransfersService(
      transfers as unknown as TransfersRepository,
      parts as unknown as PartsRepository,
      over.withoutHr ? undefined : (departments as unknown as DepartmentsService),
    ),
    transfers,
    parts,
    departments,
  };
}

const input = (over: Record<string, unknown> = {}) =>
  createTransferSchema.parse({ toDepartmentId: 21, ...over });

describe('TransfersService.create', () => {
  // feliz
  it('records where the machine came from and where it went', async () => {
    const { service, transfers } = makeService();

    const transfer = await service.create(ana, 1, input());

    expect(transfers.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        computerId: 1,
        fromDepartment: 'Financeiro',
        toDepartment: 'Fiscal',
        createdBy: ana.email,
      }),
      expect.anything(),
    );
    expect(transfer.toDepartment).toBe('Fiscal');
  });

  it('moves the machine to the new department', async () => {
    const { service, transfers } = makeService();

    await service.create(ana, 1, input());

    expect(transfers.updateComputer).toHaveBeenCalledWith(1, { departmentId: 21, location: null }, {});
  });

  // feliz
  it('moves the machine to a fixed location, leaving the official department empty', async () => {
    const { service, transfers } = makeService();

    await service.create(ana, 1, input({ toDepartmentId: null, toLocation: 'RECEPÇÃO' }));

    expect(transfers.updateComputer).toHaveBeenCalledWith(1, { departmentId: null, location: 'RECEPÇÃO' }, {});
    expect(transfers.insert).toHaveBeenCalledWith(
      expect.objectContaining({ fromDepartment: 'Financeiro', toDepartment: 'RECEPÇÃO' }),
      expect.anything(),
    );
  });

  // triste
  it('refuses a destination department that HR does not have, before touching anything', async () => {
    const { service, transfers } = makeService();

    await expect(service.create(ana, 1, input({ toDepartmentId: 99 }))).rejects.toBeInstanceOf(BadRequestException);
    expect(transfers.transaction).not.toHaveBeenCalled();
  });

  // triste
  it('refuses with 503 a destination department when the HR list is not available', async () => {
    const { service } = makeService({ withoutHr: true });

    await expect(service.create(ana, 1, input())).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  /* Voltar para a prateleira tira o apelido e o responsável: os dois são do antigo dono. */
  it('turns the machine into a spare when it goes back to the shelf', async () => {
    const { service, transfers } = makeService();

    await service.create(ana, 1, input({ toDepartmentId: null }));

    expect(transfers.updateComputer).toHaveBeenCalledWith(
      1,
      {
        departmentId: null,
        location: null,
        responsibleId: null,
        displayName: 'Reserva — FINANCEIRO-02',
      },
      {},
    );
  });

  /* O periférico que fica vira DUAS linhas: volta ao depósito e sai para quem assumiu. O
     saldo da prateleira termina igual ao que era. */
  it('hands a peripheral that stays to the machine taking over', async () => {
    const { service, parts } = makeService({
      computers: [computer(), computer({ id: 2, name: 'FISCAL-04', departmentId: 21 })],
    });

    await service.create(
      ana,
      1,
      input({
        peripherals: [
          { partId: 7, quantity: 1, destiny: 'station', destinationComputerId: 2 },
        ],
      }),
    );

    const movements = parts.insertMovement.mock.calls.map(([values]) => values);
    expect(movements).toHaveLength(2);
    expect(movements[0]).toMatchObject({ type: 'in', computerId: 1, balanceAfter: 7 });
    expect(movements[1]).toMatchObject({ type: 'out', computerId: 2, balanceAfter: 6 });
    expect(parts.update).toHaveBeenCalledWith(7, { balance: 6 }, {});
  });

  it('counts how many peripherals were left behind', async () => {
    const { service, transfers } = makeService({
      computers: [computer(), computer({ id: 2, name: 'FISCAL-04', departmentId: 21 })],
    });

    await service.create(
      ana,
      1,
      input({
        peripherals: [
          { partId: 7, quantity: 1, destiny: 'station', destinationComputerId: 2 },
          { partId: 8, quantity: 1, destiny: 'machine' },
        ],
      }),
    );

    expect(transfers.insert).toHaveBeenCalledWith(
      expect.objectContaining({ peripheralsLeftBehind: 1 }),
      expect.anything(),
    );
  });

  /* O que vai junto continua na máquina: nada a escrever no extrato do depósito. */
  it('touches the storeroom for nothing when everything goes along', async () => {
    const { service, parts } = makeService();

    await service.create(ana, 1, input({ peripherals: [{ partId: 7, quantity: 1, destiny: 'machine' }] }));

    expect(parts.insertMovement).not.toHaveBeenCalled();
  });

  // triste
  it('refuses a move to the department the machine is already in', async () => {
    const { service, transfers } = makeService();

    await expect(service.create(ana, 1, input({ toDepartmentId: 20 }))).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(transfers.insert).not.toHaveBeenCalled();
  });

  /* Máquina fora de uso não está na mesa de ninguém para mudar de sala. */
  it('refuses to transfer an archived machine', async () => {
    const { service } = makeService({ computers: [computer({ isArchived: true })] });

    await expect(service.create(ana, 1, input())).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('refuses to transfer a disposed machine', async () => {
    const { service } = makeService({ computers: [computer({ disposedAt: new Date() })] });

    await expect(service.create(ana, 1, input())).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('says the machine does not exist', async () => {
    const { service } = makeService({ computers: [] });

    await expect(service.create(ana, 1, input())).rejects.toBeInstanceOf(NotFoundException);
  });

  /* A peça sumiu do depósito entre abrir a tela e confirmar: nada é gravado pela metade. */
  it('says the peripheral no longer exists', async () => {
    const { service, transfers } = makeService({
      computers: [computer(), computer({ id: 2, name: 'FISCAL-04', departmentId: 21 })],
      part: null,
    });

    await expect(
      service.create(
        ana,
        1,
        input({
          peripherals: [{ partId: 7, quantity: 1, destiny: 'station', destinationComputerId: 2 }],
        }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(transfers.insert).not.toHaveBeenCalled();
  });

  it('refuses someone without a role', async () => {
    const { service } = makeService();

    await expect(service.create(noRole, 1, input())).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('TransfersService.listByComputer', () => {
  // feliz
  it('hands over the history of the machine', async () => {
    const { service } = makeService();

    const history = await service.listByComputer(ana, 1);

    expect(history[0]).toMatchObject({ fromDepartment: 'Financeiro', toDepartment: 'Fiscal' });
    expect(history[0]?.createdAt).toBe('2026-09-25T12:00:00.000Z');
  });

  // triste
  it('refuses someone without a role', async () => {
    const { service } = makeService();

    await expect(service.listByComputer(noRole, 1)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('TransfersService.installedParts', () => {
  // feliz
  it('lists what is on the machine today', async () => {
    const { service } = makeService();

    const installed = await service.installedParts(ana, 1);

    expect(installed).toEqual([
      { partId: 7, name: 'Teclado USB ABNT2', category: 'keyboard', quantity: 1 },
    ]);
  });
});
