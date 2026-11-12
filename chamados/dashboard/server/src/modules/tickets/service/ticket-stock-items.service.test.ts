import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type DatabaseExecutor } from '../../../lib/db/db.type';
import { type TicketStockItemRow } from '../../../lib/db/schema/ticket-stock-items.schema';
import { type TicketHistoriesRepository } from '../repository/ticket-histories.repository';
import {
  type ShelfItem,
  type TicketStockItemsRepository,
} from '../repository/ticket-stock-items.repository';
import { type TicketsRepository, type TicketWithComputer } from '../repository/tickets.repository';
import { TicketAccessService } from './ticket-access.service';
import {
  CLOSED_TICKET_STOCK,
  pickMachine,
  TicketStockItemsService,
} from './ticket-stock-items.service';

const ana: RequestUser = { id: '1', email: 'ana@azuos.com.br', name: 'Ana Lima', role: 'user' };
const CREATED_AT = new Date('2026-11-12T12:00:00.000Z');
const TX = {} as DatabaseExecutor;

function ticketRow(overrides: Partial<TicketWithComputer> = {}): TicketWithComputer {
  return {
    id: 49,
    status: 'in_progress',
    priority: 'low',
    requesterId: null,
    requesterEmail: null,
    requesterName: 'Bia Costa',
    area: 'infra',
    department: 'comercial',
    computerId: 3,
    projectId: null,
    customSystemName: null,
    githubIssueNumber: null,
    githubIssueUrl: null,
    computerName: 'COMERCIAL-01',
    problemType: 'other',
    anydeskId: null,
    contactPhone: null,
    notifyWhatsapp: false,
    description: 'A tela abre com a cor trocada.',
    screenshotKey: null,
    assignee: 'Ana Lima',
    assigneeId: '1',
    solution: null,
    createdAt: CREATED_AT,
    startedAt: CREATED_AT,
    resolvedAt: null,
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

function lineRow(overrides: Partial<TicketStockItemRow> = {}): TicketStockItemRow {
  return {
    id: 5,
    ticketId: 49,
    partId: 7,
    inventoryItemId: null,
    itemName: 'Monitor 24"',
    computerId: null,
    direction: 'out',
    quantity: 1,
    settledAt: null,
    createdAt: CREATED_AT,
    createdBy: ana.email,
    createdByName: ana.name,
    ...overrides,
  };
}

type Setup = {
  ticket?: TicketWithComputer;
  roles?: Record<string, string>;
  participantAreas?: string[];
  shelf?: ShelfItem | null;
  reserved?: Map<number, number>;
  lines?: TicketStockItemRow[];
};

function setup({
  ticket = ticketRow(),
  roles = { infra: 'admin' },
  participantAreas = [],
  shelf = { id: 7, name: 'Monitor 24"', balance: 3 },
  reserved = new Map(),
  lines = [],
}: Setup = {}) {
  const tickets = {
    findById: vi.fn().mockResolvedValue(ticket),
    listAreasOf: vi.fn().mockResolvedValue(participantAreas),
  } as unknown as TicketsRepository;

  const repository = {
    listByTicket: vi.fn().mockResolvedValue(lines),
    findById: vi.fn(async (id: number) => lines.find((line) => line.id === id) ?? null),
    insert: vi.fn(async (values: Partial<TicketStockItemRow>) =>
      lineRow({ ...values, id: 9, createdAt: CREATED_AT }),
    ),
    delete: vi.fn().mockResolvedValue(undefined),
    markSettled: vi.fn().mockResolvedValue(undefined),
    findShelfItem: vi.fn().mockResolvedValue(shelf),
    findShelfItemForUpdate: vi.fn().mockResolvedValue(shelf),
    listShelf: vi.fn().mockResolvedValue(shelf ? [shelf] : []),
    reservedOut: vi.fn().mockResolvedValue(reserved),
    moveShelf: vi.fn().mockResolvedValue(undefined),
    transaction: vi.fn(async (run: (executor: DatabaseExecutor) => Promise<unknown>) => run(TX)),
  };
  const histories = { record: vi.fn().mockResolvedValue({}) };

  const service = new TicketStockItemsService(
    repository as unknown as TicketStockItemsRepository,
    new TicketAccessService(tickets),
    histories as unknown as TicketHistoriesRepository,
  );

  return { service, repository, histories, actor: { ...ana, roles } as RequestUser, ticket };
}

const out = (quantity: number) => ({
  source: 'parts' as const,
  itemId: 7,
  direction: 'out' as const,
  quantity,
});

describe('TicketStockItemsService.options', () => {
  // feliz
  it('shows what is left to take out after the other tickets reserved theirs', async () => {
    const { service, actor } = setup({ reserved: new Map([[7, 2]]) });

    await expect(service.options(actor, 'parts')).resolves.toEqual([
      { id: 7, name: 'Monitor 24"', available: 1 },
    ]);
  });
});

describe('TicketStockItemsService.add', () => {
  // feliz
  it('reserves the item without moving the balance, and tells the timeline', async () => {
    const { service, repository, histories, actor } = setup();

    const item = await service.add(actor, 49, out(2));

    expect(item).toMatchObject({ source: 'parts', direction: 'out', quantity: 2, settledAt: null });
    expect(repository.insert).toHaveBeenCalledWith(
      expect.objectContaining({ partId: 7, inventoryItemId: null, itemName: 'Monitor 24"' }),
    );
    expect(repository.moveShelf).not.toHaveBeenCalled();
    expect(histories.record.mock.calls[0]?.[0].description).toContain('saída de 2 × Monitor 24"');
  });

  it('accepts any quantity coming back to the shelf', async () => {
    const { service, actor } = setup({ shelf: { id: 7, name: 'Monitor 24"', balance: 0 } });

    await expect(
      service.add(actor, 49, { ...out(5), direction: 'in' }),
    ).resolves.toMatchObject({ direction: 'in', quantity: 5 });
  });

  // triste
  it('refuses to take out more than what is left after the reservations', async () => {
    const { service, repository, actor } = setup({ reserved: new Map([[7, 2]]) });

    await expect(service.add(actor, 49, out(2))).rejects.toThrow('Só há 1 de Monitor 24"');
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it('refuses a closed ticket — it must be reopened first', async () => {
    const { service, actor } = setup({ ticket: ticketRow({ status: 'resolved' }) });

    await expect(service.add(actor, 49, out(1))).rejects.toThrow(CLOSED_TICKET_STOCK);
  });

  it('refuses the Maintenance shelf on a ticket that is not of Maintenance', async () => {
    const { service, actor } = setup({ roles: { infra: 'admin', manutencao: 'admin' } });

    await expect(
      service.add(actor, 49, { ...out(1), source: 'inventory' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('refuses who does not manage the area of the shelf', async () => {
    const { service, actor } = setup({
      roles: { infra: 'admin', manutencao: 'user' },
      participantAreas: ['manutencao'],
    });

    await expect(
      service.add(actor, 49, { ...out(1), source: 'inventory' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('TicketStockItemsService.remove', () => {
  // feliz
  it('just drops a reserved item', async () => {
    const { service, repository, actor } = setup({ lines: [lineRow()] });

    await service.remove(actor, 49, 5);

    expect(repository.delete).toHaveBeenCalledWith(5, TX);
    expect(repository.moveShelf).not.toHaveBeenCalled();
  });

  it('puts back on the shelf an item that already left, on a reopened ticket', async () => {
    const { service, repository, actor } = setup({
      lines: [lineRow({ settledAt: CREATED_AT, quantity: 2 })],
    });

    await service.remove(actor, 49, 5);

    expect(repository.moveShelf).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      expect.objectContaining({ direction: 'in', quantity: 2 }),
      TX,
    );
  });

  // triste
  it('refuses to undo a return that the shelf no longer has', async () => {
    const { service, repository, actor } = setup({
      shelf: { id: 7, name: 'Monitor 24"', balance: 0 },
      lines: [lineRow({ direction: 'in', settledAt: CREATED_AT })],
    });

    await expect(service.remove(actor, 49, 5)).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('refuses an item of another ticket', async () => {
    const { service, actor } = setup({ lines: [lineRow({ ticketId: 50 })] });

    await expect(service.remove(actor, 49, 5)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses a closed ticket', async () => {
    const { service, actor } = setup({
      ticket: ticketRow({ status: 'resolved' }),
      lines: [lineRow()],
    });

    await expect(service.remove(actor, 49, 5)).rejects.toThrow(CLOSED_TICKET_STOCK);
  });
});

describe('TicketStockItemsService.settle', () => {
  // feliz
  it('turns each reserved item into a shelf movement and marks it settled', async () => {
    const { service, repository, ticket } = setup({
      lines: [lineRow(), lineRow({ id: 6, settledAt: CREATED_AT })],
    });

    await service.settle(ticket, ana, TX);

    expect(repository.moveShelf).toHaveBeenCalledTimes(1);
    expect(repository.moveShelf).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      expect.objectContaining({
        direction: 'out',
        note: 'Chamado CH-0049',
        computerId: 3,
        ticketId: 49,
      }),
      TX,
    );
    expect(repository.markSettled).toHaveBeenCalledWith([5], expect.any(Date), TX);
  });

  it('does nothing when the ticket has no reserved item', async () => {
    const { service, repository, ticket } = setup();

    await service.settle(ticket, ana, TX);

    expect(repository.markSettled).not.toHaveBeenCalled();
  });

  // triste
  it('refuses to close when the shelf no longer has what the ticket takes', async () => {
    const { service, repository, ticket } = setup({
      shelf: { id: 7, name: 'Monitor 24"', balance: 0 },
      lines: [lineRow()],
    });

    await expect(service.settle(ticket, ana, TX)).rejects.toThrow('O depósito tem 0');
    expect(repository.markSettled).not.toHaveBeenCalled();
  });
});

describe('pickMachine', () => {
  // feliz
  it('takes the only machine of the ticket without asking', () => {
    expect(pickMachine([{ id: 3 }], null)).toBe(3);
  });

  it('takes the chosen machine among many', () => {
    expect(pickMachine([{ id: 3 }, { id: 7 }], 7)).toBe(7);
  });

  it('leaves the item without machine when the ticket has none', () => {
    expect(pickMachine([], null)).toBeNull();
  });

  // triste
  it('asks which machine when the ticket has many', () => {
    expect(() => pickMachine([{ id: 3 }, { id: 7 }], null)).toThrow('escolha para qual');
  });

  it('refuses a machine that is not in the ticket', () => {
    expect(() => pickMachine([{ id: 3 }], 9)).toThrow('não está vinculada');
  });
});

describe('TicketStockItemsService.settle — machine of the item', () => {
  // feliz
  it('sends the item to its own machine, not the first of the ticket', async () => {
    const { service, repository, ticket } = setup({ lines: [lineRow({ computerId: 7 })] });

    await service.settle(ticket, ana, TX);

    expect(repository.moveShelf).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ computerId: 7 }),
      TX,
    );
  });
});
