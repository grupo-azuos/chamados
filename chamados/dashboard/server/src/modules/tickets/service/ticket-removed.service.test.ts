import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type TicketWithComputer } from '../repository/tickets.repository';
import { type TicketAttachmentsRepository } from '../repository/ticket-attachments.repository';
import { type TicketComputersRepository } from '../repository/ticket-computers.repository';
import { type TicketHistoriesRepository } from '../repository/ticket-histories.repository';
import { type TicketRelationsRepository } from '../repository/ticket-relations.repository';
import { type TicketStockItemsRepository } from '../repository/ticket-stock-items.repository';
import { type TicketWatchersRepository } from '../repository/ticket-watchers.repository';
import { type TicketsRepository } from '../repository/tickets.repository';
import { TicketAccessService } from './ticket-access.service';
import { TicketRemovedService } from './ticket-removed.service';
import { type TicketStockItemsService } from './ticket-stock-items.service';

const AT = new Date('2026-11-20T12:00:00.000Z');
const EARLIER = new Date('2026-11-19T12:00:00.000Z');

const ana: RequestUser = {
  id: '1',
  email: 'ana@azuos.com.br',
  name: 'Ana Lima',
  role: 'admin',
  roles: { infra: 'admin' },
};
/* Só consulta a área: vê o que saiu, mas não desfaz. */
const viewer: RequestUser = { ...ana, id: '2', role: 'user', roles: { infra: 'user' } };

const ticket = { id: 49, area: 'infra', status: 'in_progress' } as TicketWithComputer;

function setup(overrides: { relationBack?: boolean } = {}) {
  const tickets = {
    findById: vi.fn().mockResolvedValue(ticket),
    listAreasOf: vi.fn().mockResolvedValue([]),
    listArchivedAreas: vi.fn().mockResolvedValue([{ id: 6, area: 'manutencao', archivedAt: EARLIER }]),
    restoreArea: vi.fn().mockResolvedValue(undefined),
  };
  const attachments = {
    listArchived: vi.fn().mockResolvedValue([
      { id: 9, fileName: 'nota.pdf', origin: 'support', archivedAt: AT },
      { id: 10, fileName: 'print.png', origin: 'requester', archivedAt: EARLIER },
    ]),
    findInTicket: vi.fn(async (_ticketId: number, id: number) =>
      id === 10
        ? { id: 10, fileName: 'print.png', origin: 'requester', archivedAt: EARLIER }
        : { id: 9, fileName: 'nota.pdf', origin: 'support', archivedAt: AT },
    ),
    setArchived: vi.fn().mockResolvedValue(undefined),
  };
  const relations = {
    listArchived: vi.fn().mockResolvedValue([]),
    findInTicket: vi
      .fn()
      .mockResolvedValue({ id: 3, ticketId: 49, relatedTicketId: 50, archivedAt: AT }),
    findActivePair: vi.fn().mockResolvedValue(overrides.relationBack ? { id: 4 } : null),
    restore: vi.fn().mockResolvedValue(undefined),
  };
  const empty = { listArchived: vi.fn().mockResolvedValue([]) };
  const stock = { restore: vi.fn().mockResolvedValue({}) };
  const histories = { record: vi.fn().mockResolvedValue({}) };

  const service = new TicketRemovedService(
    new TicketAccessService(tickets as unknown as TicketsRepository),
    tickets as unknown as TicketsRepository,
    attachments as unknown as TicketAttachmentsRepository,
    empty as unknown as TicketComputersRepository,
    empty as unknown as TicketWatchersRepository,
    relations as unknown as TicketRelationsRepository,
    empty as unknown as TicketStockItemsRepository,
    stock as unknown as TicketStockItemsService,
    histories as unknown as TicketHistoriesRepository,
  );

  return { service, tickets, attachments, relations, stock, histories };
}

describe('TicketRemovedService.list', () => {
  // feliz
  it('joins what left the ticket, newest first, saying who can undo each one', async () => {
    const { service } = setup();

    const items = await service.list(ana, 49);

    expect(items.map((item) => [item.kind, item.label, item.canRestore])).toEqual([
      ['attachment', 'nota.pdf', true],
      ['attachment', 'print.png', false],
      ['area', 'Manutenção', true],
    ]);
  });

  // triste
  it('shows the removed items to who only queries, without the undo', async () => {
    const { service } = setup();

    const items = await service.list(viewer, 49);

    expect(items.every((item) => !item.canRestore)).toBe(true);
  });
});

describe('TicketRemovedService.restore', () => {
  // feliz
  it('brings an attachment back and writes it on the timeline', async () => {
    const { service, attachments, histories } = setup();

    await service.restore(ana, 49, 'attachment', 9);

    expect(attachments.setArchived).toHaveBeenCalledWith(9, false, null);
    expect(histories.record).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Desfez a remoção: anexo nota.pdf.' }),
    );
  });

  // feliz
  it('hands the stock item to the stock rules', async () => {
    const { service, stock } = setup();

    await service.restore(ana, 49, 'stock_item', 5);

    expect(stock.restore).toHaveBeenCalledWith(ana, 49, 5);
  });

  // triste
  it('never brings back, through the support side, the file the requester sent', async () => {
    const { service, attachments } = setup();

    await expect(service.restore(ana, 49, 'attachment', 10)).rejects.toThrow(ForbiddenException);
    expect(attachments.setArchived).not.toHaveBeenCalled();
  });

  // triste
  it('refuses who only queries the ticket', async () => {
    const { service, attachments } = setup();

    await expect(service.restore(viewer, 49, 'attachment', 9)).rejects.toThrow(ForbiddenException);
    expect(attachments.setArchived).not.toHaveBeenCalled();
  });

  // triste
  it('refuses a relation that is already back by another path', async () => {
    const { service, relations } = setup({ relationBack: true });

    await expect(service.restore(ana, 49, 'relation', 3)).rejects.toThrow(ConflictException);
    expect(relations.restore).not.toHaveBeenCalled();
  });

  // triste
  it('answers not found for an area that is not among the removed', async () => {
    const { service, tickets } = setup();

    await expect(service.restore(ana, 49, 'area', 99)).rejects.toThrow(NotFoundException);
    expect(tickets.restoreArea).not.toHaveBeenCalled();
  });
});
