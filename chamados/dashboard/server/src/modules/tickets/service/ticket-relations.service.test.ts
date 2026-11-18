import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type TicketRelation } from '@template/shared/schemas/ticket-relation.schema';
import { type TicketRow } from '../../../lib/db/schema/tickets.schema';
import { type TicketAccessService } from './ticket-access.service';
import { type TicketHistoriesRepository } from '../repository/ticket-histories.repository';
import { type TicketRelationsRepository } from '../repository/ticket-relations.repository';
import { type TicketsRepository } from '../repository/tickets.repository';
import { TicketRelationsService } from './ticket-relations.service';

const operator: RequestUser = {
  id: 'u-1',
  name: 'Vinícius Gabriel',
  email: 'vinicius@example.com',
  role: 'admin',
};

const ticket = {
  id: 10,
  status: 'open',
} as TicketRow;

describe('TicketRelationsService', () => {
  function setup() {
    const relations: Partial<TicketRelationsRepository> = {
      listByTicket: vi.fn().mockResolvedValue([
        {
          id: 1,
          ticketId: 10,
          relatedTicketId: 20,
          relatedTicket: {
            id: 20,
            protocol: 'CH-0020',
            description: 'Monitor não liga',
            status: 'open',
            priority: 'medium',
            area: 'infra',
            requesterName: 'Carlos',
            createdAt: new Date().toISOString(),
          },
          createdAt: new Date().toISOString(),
          createdBy: 'vinicius@example.com',
        } satisfies TicketRelation,
      ]),
      add: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    };

    const tickets: Partial<TicketsRepository> = {
      findById: vi.fn().mockResolvedValue({ id: 20, description: 'Monitor não liga' }),
    };

    const histories: Partial<TicketHistoriesRepository> = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    const access: Partial<TicketAccessService> = {
      reach: vi.fn().mockResolvedValue({ ticket, participantAreas: [], access: { infra: 'admin' } }),
      assertCanWrite: vi.fn(),
    };

    const service = new TicketRelationsService(
      relations as TicketRelationsRepository,
      tickets as TicketsRepository,
      histories as TicketHistoriesRepository,
      access as TicketAccessService,
    );

    return { service, relations, tickets, histories, access };
  }

  it('lists relations for a ticket', async () => {
    const { service, relations } = setup();
    const result = await service.list(operator, 10);

    expect(relations.listByTicket).toHaveBeenCalledWith(10);
    expect(result).toHaveLength(1);
    expect(result[0]?.relatedTicketId).toBe(20);
  });

  it('adds a relation between two tickets and logs history', async () => {
    const { service, relations, histories } = setup();
    const result = await service.add(operator, 10, 20);

    expect(relations.add).toHaveBeenCalledWith(10, 20, 'vinicius@example.com');
    expect(histories.record).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId: 10,
        type: 'update',
        description: expect.stringContaining('CH-0020'),
      }),
    );
    expect(result).toHaveLength(1);
  });

  it('refuses linking a ticket to itself', async () => {
    const { service } = setup();
    await expect(service.add(operator, 10, 10)).rejects.toThrow('mesmo');
  });

  it('removes a relation between two tickets and logs history', async () => {
    const { service, relations, histories } = setup();
    await service.remove(operator, 10, 20);

    expect(relations.remove).toHaveBeenCalledWith(10, 20);
    expect(histories.record).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId: 10,
        type: 'update',
        description: expect.stringContaining('CH-0020'),
      }),
    );
  });
});
