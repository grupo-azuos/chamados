import { describe, expect, it } from 'vitest';

import {
  addTicketRelationSchema,
  relatedTicketSummarySchema,
  ticketRelationSchema,
} from './ticket-relation.schema';

describe('ticketRelationSchema', () => {
  const validSummary = {
    id: 42,
    protocol: 'CH-0042',
    description: 'Computador não liga',
    status: 'open',
    priority: 'high',
    area: 'infra',
    requesterName: 'Ana Silva',
    createdAt: new Date().toISOString(),
  };

  it('validates a related ticket summary', () => {
    expect(relatedTicketSummarySchema.parse(validSummary)).toMatchObject({
      id: 42,
      protocol: 'CH-0042',
    });
  });

  it('validates a ticket relation record', () => {
    const relation = {
      id: 1,
      ticketId: 10,
      relatedTicketId: 42,
      relatedTicket: validSummary,
      createdAt: new Date().toISOString(),
      createdBy: 'operador@example.com',
    };

    expect(ticketRelationSchema.parse(relation)).toMatchObject({
      ticketId: 10,
      relatedTicketId: 42,
    });
  });

  it('validates addTicketRelationSchema', () => {
    expect(addTicketRelationSchema.parse({ relatedTicketId: 42 })).toEqual({
      relatedTicketId: 42,
    });
    expect(addTicketRelationSchema.safeParse({ relatedTicketId: -1 }).success).toBe(false);
    expect(addTicketRelationSchema.safeParse({}).success).toBe(false);
  });
});
