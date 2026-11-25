import { ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { type SaveBoardInput, type WidgetQuery } from '@template/shared/schemas/dashboard-board.schema';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type DashboardBoardsRepository } from '../repository/dashboard-boards.repository';
import { canEdit, canView, DashboardBoardsService } from './dashboard-boards.service';
import { defaultBoard } from './default-boards';

const admin: RequestUser = {
  id: 'u-ana',
  email: 'ana@empresa.com.br',
  name: 'Ana Lima',
  role: 'admin',
  roles: { infra: 'admin' },
};
const manager: RequestUser = { ...admin, id: 'u-caio', name: 'Caio', role: 'manager', roles: { infra: 'manager' } };
const viewer: RequestUser = { ...admin, id: 'u-bia', name: 'Bia Souza', role: 'user', roles: { infra: 'user' } };
const outsider: RequestUser = { ...admin, id: 'u-dani', name: 'Dani', role: 'user', roles: { sistema: 'admin' } };

function makeService(overrides: Partial<DashboardBoardsRepository> = {}) {
  const repository = {
    findBoard: vi.fn().mockResolvedValue(null),
    saveBoard: vi.fn(async (module, scope, ownerId, board, actor) => ({
      id: 1,
      module,
      scope,
      ownerId,
      ...board,
      updatedAt: new Date('2026-11-20T12:00:00.000Z'),
      updatedBy: actor,
    })),
    countBy: vi.fn().mockResolvedValue({ total: 3, grandTotal: 5, groups: [{ key: 'high', value: 3 }], cells: [] }),
    findFilter: vi.fn().mockResolvedValue(null),
    ...overrides,
  };

  return {
    service: new DashboardBoardsService(repository as unknown as DashboardBoardsRepository),
    repository,
  };
}

const QUERY = (overrides: Partial<WidgetQuery> = {}): WidgetQuery => ({
  source: 'infraTickets',
  groupBy: 'priority',
  splitBy: null,
  filterId: null,
  onlyMine: false,
  period: 'all',
  window: null,
  person: null,
  boardPeriod: null,
  matches: [],
  ageBands: null,
  ...overrides,
});

describe('who sees and who builds each board', () => {
  // feliz
  it('lets everyone of the module see the team board, and only its admin build it', () => {
    expect(canView(viewer, 'infra', 'team')).toBe(true);
    expect(canEdit(viewer, 'infra', 'team')).toBe(false);
    expect(canEdit(admin, 'infra', 'team')).toBe(true);
    expect(canEdit(manager, 'infra', 'manager')).toBe(true);
    expect(canEdit(viewer, 'infra', 'personal')).toBe(true);
  });

  // triste
  it('keeps the manager board from plain users, and every board from other modules', () => {
    expect(canView(viewer, 'infra', 'manager')).toBe(false);
    expect(canView(outsider, 'infra', 'team')).toBe(false);
    expect(canEdit(outsider, 'infra', 'personal')).toBe(false);
  });
});

describe('DashboardBoardsService.board', () => {
  // feliz
  it('hands the default board of the module while nobody saved one', async () => {
    const { service, repository } = makeService();

    const board = await service.board(viewer, 'infra', 'personal');

    expect(repository.findBoard).toHaveBeenCalledWith('infra', 'personal', 'u-bia');
    expect(board).toMatchObject({ module: 'infra', scope: 'personal', canEdit: true, updatedAt: null });
    expect(board.widgets).toEqual(defaultBoard('infra', 'personal').widgets);
  });

  // triste
  it('refuses someone without the module', async () => {
    const { service } = makeService();

    await expect(service.board(outsider, 'infra', 'team')).rejects.toThrow(ForbiddenException);
  });
});

describe('DashboardBoardsService.saveBoard', () => {
  const board = defaultBoard('infra', 'team') as SaveBoardInput;

  // feliz
  it('saves the team board of the module for its admin', async () => {
    const { service, repository } = makeService();

    const saved = await service.saveBoard(admin, 'infra', 'team', board);

    expect(repository.saveBoard).toHaveBeenCalledWith('infra', 'team', null, board, 'u-ana');
    expect(saved.canEdit).toBe(true);
  });

  // triste
  /* Escalada de privilégio: quem só consulta o módulo não monta o painel da equipe. */
  it('refuses a plain user building the team board', async () => {
    const { service, repository } = makeService();

    await expect(service.saveBoard(viewer, 'infra', 'team', board)).rejects.toThrow(ForbiddenException);
    expect(repository.saveBoard).not.toHaveBeenCalled();
  });

  // triste
  it('refuses a block that counts a source of another module', async () => {
    const { service, repository } = makeService();
    const foreign = {
      ...board,
      widgets: board.widgets.map((widget, index) => (index === 0 ? { ...widget, source: 'quotes' as const, groupBy: 'status' } : widget)),
    };

    await expect(service.saveBoard(admin, 'infra', 'team', foreign)).rejects.toThrow(UnprocessableEntityException);
    expect(repository.saveBoard).not.toHaveBeenCalled();
  });
});

describe('DashboardBoardsService.data', () => {
  // feliz
  it('counts the block and names each group by its label', async () => {
    const { service } = makeService();

    const data = await service.data(viewer, 'infra', QUERY());

    expect(data).toMatchObject({ total: 3, grandTotal: 5, series: [{ key: 'high', label: 'Alta', value: 3 }] });
  });

  // triste
  it('refuses a source of another module, without querying', async () => {
    const { service, repository } = makeService();

    await expect(service.data(viewer, 'infra', QUERY({ source: 'quotes', groupBy: 'status' }))).rejects.toThrow(
      UnprocessableEntityException,
    );
    expect(repository.countBy).not.toHaveBeenCalled();
  });

  // triste
  it('refuses "only mine" on a source without a person', async () => {
    const { service } = makeService();

    await expect(
      service.data(viewer, 'infra', QUERY({ source: 'maintenanceSchedules', groupBy: 'day', onlyMine: true })),
    ).rejects.toThrow(UnprocessableEntityException);
  });
});

describe('drillCondition', () => {
  const DRILL = { ...QUERY(), key: 'high', key2: null, label: 'Alta', label2: null, title: null };

  // feliz
  it('builds the block condition with the clicked item for the destination list', async () => {
    const condition = { sql: 'cut' };
    const { service, repository } = makeService({ conditionOf: vi.fn().mockReturnValue(condition) } as never);

    await expect(service.drillCondition(viewer, DRILL, ['infraTickets'])).resolves.toBe(condition);
    expect(repository.conditionOf).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tree: null, extra: expect.anything() }),
    );
  });

  // triste
  it('refuses a drill from a source the list does not show', async () => {
    const { service } = makeService();

    await expect(service.drillCondition(viewer, DRILL, ['systemTickets'])).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  // triste
  it('refuses a person without access to the source module', async () => {
    const { service } = makeService();

    await expect(service.drillCondition(outsider, DRILL, ['infraTickets'])).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
