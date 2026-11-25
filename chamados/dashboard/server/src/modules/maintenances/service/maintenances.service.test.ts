import { type UserDirectoryProvider } from '../../../lib/auth/user-directory.type';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { maintenanceListQuerySchema } from '@template/shared/schemas/maintenance.schema';
import { sql } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type MaintenanceRow } from '../../../lib/db/schema/maintenances.schema';
import { type MaintenanceScheduleRow } from '../../../lib/db/schema/maintenance-schedules.schema';
import { type BoardDrillResolver } from '../../dashboard-boards/board-drill.token';
import {
  type MaintenancesRepository,
  type MaintenanceWithComputer,
  type PreventiveRow,
  type ScheduleWithComputer,
} from '../repository/maintenances.repository';
import { MaintenancesService } from './maintenances.service';

/** Ana registra as manutenções nestes testes — dona do registro em `row()`. */
const owner: RequestUser = { id: '1', email: 'ana@empresa.com.br', name: 'Ana', role: 'user' };

/** Bia tem o mesmo papel, mas não registrou nada: separa "meu" de "dos outros". */
const otherUser: RequestUser = { ...owner, id: '2', email: 'bia@empresa.com.br', name: 'Bia' };

const manager: RequestUser = { ...otherUser, id: '3', name: 'Caio', role: 'manager' };

/* Identidade PELA METADE: chegou sem papel definido. O contrato não admite isso, e é por
   isso que o teste precisa forçar — a recusa existe justamente para o que não devia chegar. */
const noRole = { ...owner, role: undefined } as unknown as RequestUser;

function maintenanceRow(overrides: Partial<MaintenanceRow> = {}): MaintenanceRow {
  return {
    id: 1,
    computerId: 3,
    otherMachine: null,
    type: 'preventive',
    description: 'Limpeza interna e pasta térmica',
    performedBy: 'Suporte TI',
    performedByIds: [],
    performedAt: new Date('2026-09-20T12:00:00.000Z'),
    createdAt: new Date('2026-09-20T13:00:00.000Z'),
    createdBy: 'ana@empresa.com.br',
    updatedAt: null,
    updatedBy: null,
    archivedAt: null,
    archivedBy: null,
    ...overrides,
  };
}

function row(overrides: Partial<MaintenanceRow> = {}): MaintenanceWithComputer {
  return {
    maintenance: maintenanceRow(overrides),
    computer: {
      id: 3,
      name: 'CONTABIL-03',
      displayName: 'Contábil — fechamento',
      department: 'contabil',
    },
  };
}

function makeService(repository: Partial<MaintenancesRepository>, drills?: BoardDrillResolver) {
  return new MaintenancesService(repository as MaintenancesRepository, drills);
}

const query = (overrides: Record<string, unknown> = {}) =>
  maintenanceListQuerySchema.parse(overrides);

const NOW = '2026-09-23T12:00:00.000Z';

function preventiveRow(overrides: Partial<PreventiveRow> = {}): PreventiveRow {
  return {
    computerId: 1,
    computerName: 'RECEPCAO-01',
    computerDisplayName: 'Recepção',
    computerDepartment: 'recepcao',
    lastDoneAt: new Date('2026-09-01T12:00:00.000Z'),
    maintenanceCount: 1,
    ...overrides,
  };
}

describe('MaintenancesService.list', () => {
  // feliz
  it('narrows the history to the board block that was clicked', async () => {
    const list = vi.fn().mockResolvedValue({ rows: [], total: 0 });
    const cut = sql`true`;
    const drillCondition = vi.fn().mockResolvedValue(cut);
    const drill = JSON.stringify({
      source: 'maintenances',
      groupBy: 'type',
      filterId: null,
      key: 'preventive',
    });

    await makeService({ list }, { drillCondition }).list(owner, query({ drill }));

    expect(drillCondition).toHaveBeenCalledWith(
      owner,
      expect.objectContaining({ key: 'preventive' }),
      ['maintenances'],
    );
    expect(list).toHaveBeenCalledWith(expect.anything(), cut);
  });

  // triste
  it('lists without a cut when no block was clicked', async () => {
    const list = vi.fn().mockResolvedValue({ rows: [], total: 0 });
    const drillCondition = vi.fn();

    await makeService({ list }, { drillCondition }).list(owner, query());

    expect(drillCondition).not.toHaveBeenCalled();
    expect(list).toHaveBeenCalledWith(expect.anything(), undefined);
  });

  // triste
  it('turns down a cut that is not valid JSON before reaching the database', () => {
    expect(maintenanceListQuerySchema.safeParse({ drill: '{oops' }).success).toBe(false);
  });

  // feliz
  it('returns the page translated into the contract, with the machine name from the inventory', async () => {
    const service = makeService({
      list: vi.fn().mockResolvedValue({ rows: [row()], total: 12 }),
    });

    const page = await service.list(owner, query({ page: '2', pageSize: '2' }));

    expect(page).toMatchObject({ total: 12, page: 2, pageSize: 2 });
    expect(page.items[0]?.computerName).toBe('CONTABIL-03');
    expect(page.items[0]?.performedAt).toBe('2026-09-20T12:00:00.000Z');
  });

  it('returns an empty page, not an error, when there is nothing', async () => {
    const service = makeService({ list: vi.fn().mockResolvedValue({ rows: [], total: 0 }) });

    await expect(service.list(owner, query())).resolves.toMatchObject({ items: [], total: 0 });
  });

  // triste
  it('refuses a profile that cannot read, without touching the repository', async () => {
    const list = vi.fn();
    const service = makeService({ list });

    await expect(service.list(noRole, query())).rejects.toBeInstanceOf(ForbiddenException);
    expect(list).not.toHaveBeenCalled();
  });
});

describe('MaintenancesService.create', () => {
  // feliz
  it('stamps the author from the identity, never from the body', async () => {
    const insert = vi.fn().mockResolvedValue(1);
    const service = makeService({
      insert,
      archiveOpenSchedule: vi.fn(),
      findById: vi.fn().mockResolvedValue(row()),
    });

    await service.create(owner, { computerId: 3, type: 'preventive', performedAt: NOW });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: 'ana@empresa.com.br' }),
    );
  });

  /* Quem fez é a pessoa da lista: o nome dela no diretório vai para o registro. */
  it('writes the names of everyone chosen as who did it, and refuses one the directory does not know', async () => {
    const insert = vi.fn().mockResolvedValue(1);
    const directory = {
      getUserById: vi.fn(
        async (id: string) =>
          (
            ({ 'u-ana': { id, name: 'Ana Souza' }, 'u-caio': { id, name: 'Caio Reis' } }) as Record<
              string,
              unknown
            >
          )[id] ?? null,
      ),
    } as unknown as UserDirectoryProvider;
    const service = new MaintenancesService(
      {
        insert,
        archiveOpenSchedule: vi.fn(),
        findById: vi.fn().mockResolvedValue(row()),
      } as unknown as MaintenancesRepository,
      undefined,
      undefined,
      directory,
    );

    await service.create(owner, {
      computerId: 3,
      type: 'preventive',
      performedAt: NOW,
      performedByIds: ['u-ana', 'u-caio'],
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        performedByIds: ['u-ana', 'u-caio'],
        performedBy: 'Ana Souza, Caio Reis',
      }),
    );

    // triste
    await expect(
      service.create(owner, {
        computerId: 3,
        type: 'preventive',
        performedAt: NOW,
        performedByIds: ['u-ana', 'u-fora'],
      }),
    ).rejects.toThrow('Escolha quem fez pela lista de pessoas.');
  });

  /* A visita combinada aconteceu: a ficha não pode continuar cobrando. */
  it('fulfils the machine schedule when the maintenance is registered', async () => {
    const archiveOpenSchedule = vi.fn();
    const service = makeService({
      insert: vi.fn().mockResolvedValue(1),
      archiveOpenSchedule,
      findById: vi.fn().mockResolvedValue(row()),
    });

    await service.create(owner, { computerId: 3, type: 'part_replacement', performedAt: NOW });

    expect(archiveOpenSchedule).toHaveBeenCalledWith(3, '1');
  });

  /* Equipamento de fora do inventário: o notebook velho da recepção. */
  it('accepts equipment named by hand, with no machine linked', async () => {
    const insert = vi.fn().mockResolvedValue(2);
    const archiveOpenSchedule = vi.fn();
    const service = makeService({
      insert,
      archiveOpenSchedule,
      findById: vi.fn().mockResolvedValue({
        maintenance: maintenanceRow({ id: 2, computerId: null, otherMachine: 'Impressora' }),
        computer: null,
      }),
    });

    const created = await service.create(owner, {
      otherMachine: 'Impressora',
      type: 'corrective',
      performedAt: NOW,
    });

    expect(created.otherMachine).toBe('Impressora');
    expect(created.computerName).toBeNull();
    /* Equipamento de fora não tem agenda no inventário. */
    expect(archiveOpenSchedule).not.toHaveBeenCalled();
  });

  // triste
  it('refuses a profile that cannot create, without touching the repository', async () => {
    const insert = vi.fn();
    const service = makeService({ insert });

    await expect(
      service.create(noRole, { computerId: 3, type: 'preventive', performedAt: NOW }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(insert).not.toHaveBeenCalled();
  });
});

describe('MaintenancesService.update', () => {
  // feliz
  it('lets the person who registered it fix what was typed wrong', async () => {
    const update = vi.fn();
    const service = makeService({ findById: vi.fn().mockResolvedValue(row()), update });

    await service.update(owner, 1, { description: 'Troquei o SSD' });

    expect(update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ description: 'Troquei o SSD' }),
    );
  });

  it('lets a manager fix a record registered by someone else', async () => {
    const update = vi.fn();
    const service = makeService({ findById: vi.fn().mockResolvedValue(row()), update });

    await service.update(manager, 1, { description: 'Corrigido' });

    expect(update).toHaveBeenCalled();
  });

  // triste
  /* Registro de outra pessoa não se mexe: o histórico é a prova do que foi feito, e quem
     fez precisa se reconhecer nele. */
  it('refuses another person record, without writing anything', async () => {
    const update = vi.fn();
    const service = makeService({ findById: vi.fn().mockResolvedValue(row()), update });

    await expect(service.update(otherUser, 1, { description: 'x' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('answers not found, without writing, when the record is gone', async () => {
    const update = vi.fn();
    const service = makeService({ findById: vi.fn().mockResolvedValue(null), update });

    await expect(service.update(owner, 99, { description: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(update).not.toHaveBeenCalled();
  });
});

describe('MaintenancesService.remove', () => {
  // feliz
  it('archives the record of whoever registered it, stamping who archived', async () => {
    const setArchived = vi.fn();
    const service = makeService({ findById: vi.fn().mockResolvedValue(row()), setArchived });

    await service.remove(owner, 1);

    expect(setArchived).toHaveBeenCalledWith(1, true, '1');
  });

  // triste
  it('refuses to archive another person record', async () => {
    const setArchived = vi.fn();
    const service = makeService({ findById: vi.fn().mockResolvedValue(row()), setArchived });

    await expect(service.remove(otherUser, 1)).rejects.toBeInstanceOf(ForbiddenException);
    expect(setArchived).not.toHaveBeenCalled();
  });
});

describe('MaintenancesService.restore', () => {
  // feliz
  it('brings the archived record back to the list', async () => {
    const setArchived = vi.fn();
    const findById = vi
      .fn()
      .mockResolvedValueOnce(row({ archivedAt: new Date(NOW), archivedBy: '1' }))
      .mockResolvedValueOnce(row());
    const service = makeService({ findById, setArchived });

    const restored = await service.restore(manager, 1);

    expect(setArchived).toHaveBeenCalledWith(1, false, null);
    expect(restored.archive).toBeNull();
  });

  // triste
  it('refuses to restore another person record', async () => {
    const setArchived = vi.fn();
    const service = makeService({ findById: vi.fn().mockResolvedValue(row()), setArchived });

    await expect(service.restore(otherUser, 1)).rejects.toBeInstanceOf(ForbiddenException);
    expect(setArchived).not.toHaveBeenCalled();
  });
});

describe('MaintenancesService.preventive', () => {
  // feliz
  it('puts the overdue machines first, oldest one at the top', async () => {
    const service = makeService({
      listPreventive: vi.fn().mockResolvedValue([
        preventiveRow({ computerId: 1, computerName: 'RECEPCAO-01' }),
        preventiveRow({
          computerId: 2,
          computerName: 'FINANCEIRO-02',
          lastDoneAt: new Date('2026-01-10T12:00:00.000Z'),
        }),
        preventiveRow({
          computerId: 3,
          computerName: 'CONTABIL-03',
          lastDoneAt: new Date('2026-05-10T12:00:00.000Z'),
        }),
      ]),
    });

    const rows = await service.preventive(owner);

    expect(rows.map((item) => item.computerName)).toEqual([
      'FINANCEIRO-02',
      'CONTABIL-03',
      'RECEPCAO-01',
    ]);
    expect(rows[0]?.status).toBe('due');
    expect(rows[2]?.status).toBe('ok');
  });

  /* "Nunca feita" é diferente de "vencida": uma máquina cadastrada ontem não é atraso do time. */
  it('tells a machine never serviced apart from an overdue one', async () => {
    const service = makeService({
      listPreventive: vi
        .fn()
        .mockResolvedValue([preventiveRow({ lastDoneAt: null, maintenanceCount: 0 })]),
    });

    const [first] = await service.preventive(owner);

    expect(first?.status).toBe('never');
    expect(first?.lastDoneAt).toBeNull();
  });

  // triste
  it('refuses a profile that cannot read, without touching the repository', async () => {
    const listPreventive = vi.fn();
    const service = makeService({ listPreventive });

    await expect(service.preventive(noRole)).rejects.toBeInstanceOf(ForbiddenException);
    expect(listPreventive).not.toHaveBeenCalled();
  });
});

function scheduleRow(overrides: Partial<MaintenanceScheduleRow> = {}): ScheduleWithComputer {
  return {
    schedule: {
      id: 1,
      computerId: 3,
      scheduledFor: '2026-11-05',
      note: 'Trocar pasta térmica',
      createdAt: new Date('2026-10-21T12:00:00.000Z'),
      createdBy: 'ana@empresa.com.br',
      updatedAt: null,
      updatedBy: null,
      archivedAt: null,
      archivedBy: null,
      ...overrides,
    },
    computer: {
      id: 3,
      name: 'CONTABIL-03',
      displayName: 'Contábil — fechamento',
      department: 'contabil',
    },
  };
}

describe('MaintenancesService.saveSchedule', () => {
  // feliz
  it('schedules a machine in use, stamping the author from the identity', async () => {
    const upsertSchedule = vi.fn();
    const service = makeService({
      findActiveComputer: vi.fn().mockResolvedValue({ id: 3 }),
      upsertSchedule,
      listSchedules: vi.fn().mockResolvedValue([scheduleRow()]),
    });

    const saved = await service.saveSchedule(owner, 3, {
      scheduledFor: '2026-11-05',
      note: 'Trocar pasta térmica',
    });

    expect(upsertSchedule).toHaveBeenCalledWith(
      3,
      { scheduledFor: '2026-11-05', note: 'Trocar pasta térmica' },
      'ana@empresa.com.br',
    );
    expect(saved).toMatchObject({ computerName: 'CONTABIL-03', scheduledFor: '2026-11-05' });
  });

  // triste
  it('refuses a machine that is out of use, without writing anything', async () => {
    const upsertSchedule = vi.fn();
    const service = makeService({
      findActiveComputer: vi.fn().mockResolvedValue(null),
      upsertSchedule,
    });

    await expect(
      service.saveSchedule(owner, 99, { scheduledFor: '2026-11-05' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(upsertSchedule).not.toHaveBeenCalled();
  });

  it('refuses a profile that cannot create', async () => {
    const findActiveComputer = vi.fn();
    const service = makeService({ findActiveComputer });

    await expect(
      service.saveSchedule(noRole, 3, { scheduledFor: '2026-11-05' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(findActiveComputer).not.toHaveBeenCalled();
  });
});

describe('MaintenancesService.listSchedules / cancelSchedule', () => {
  // feliz
  it('lists the schedules translated into the contract', async () => {
    const service = makeService({ listSchedules: vi.fn().mockResolvedValue([scheduleRow()]) });

    const [first] = await service.listSchedules(owner, { computerId: 3, archived: 'hide' });

    expect(first).toMatchObject({ computerId: 3, note: 'Trocar pasta térmica', updatedAt: null });
  });

  it('cancels the schedule of a machine', async () => {
    const archiveOpenSchedule = vi.fn();
    const service = makeService({ archiveOpenSchedule });

    await service.cancelSchedule(owner, 3);

    expect(archiveOpenSchedule).toHaveBeenCalledWith(3, '1');
  });

  // triste
  it('refuses to cancel for a profile that cannot create', async () => {
    const archiveOpenSchedule = vi.fn();
    const service = makeService({ archiveOpenSchedule });

    await expect(service.cancelSchedule(noRole, 3)).rejects.toBeInstanceOf(ForbiddenException);
    expect(archiveOpenSchedule).not.toHaveBeenCalled();
  });
});

describe('MaintenancesService.restoreSchedule', () => {
  // feliz
  it('brings the cancelled schedule back when the machine has no other one', async () => {
    const restoreSchedule = vi.fn();
    const listSchedules = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([scheduleRow()]);
    const service = makeService({
      findSchedule: vi.fn().mockResolvedValue(scheduleRow().schedule),
      findActiveComputer: vi.fn().mockResolvedValue({ id: 3 }),
      listSchedules,
      restoreSchedule,
    });

    const restored = await service.restoreSchedule(owner, 1);

    expect(restoreSchedule).toHaveBeenCalledWith(1);
    expect(restored).toMatchObject({ id: 1, computerId: 3, archive: null });
  });

  // triste
  it('refuses when the machine already has another open schedule', async () => {
    const restoreSchedule = vi.fn();
    const service = makeService({
      findSchedule: vi.fn().mockResolvedValue(scheduleRow().schedule),
      findActiveComputer: vi.fn().mockResolvedValue({ id: 3 }),
      listSchedules: vi.fn().mockResolvedValue([scheduleRow({ id: 2 })]),
      restoreSchedule,
    });

    await expect(service.restoreSchedule(owner, 1)).rejects.toBeInstanceOf(ConflictException);
    expect(restoreSchedule).not.toHaveBeenCalled();
  });

  // triste
  it('refuses a schedule that does not exist', async () => {
    const service = makeService({ findSchedule: vi.fn().mockResolvedValue(null) });

    await expect(service.restoreSchedule(owner, 99)).rejects.toBeInstanceOf(NotFoundException);
  });
});
