import { describe, expect, it } from 'vitest';

import { TICKET_REMOVED_KIND_LABELS, ticketRemovedItemSchema } from './ticket-removed.schema';

describe('ticketRemovedItemSchema', () => {
  // feliz
  it('accepts a removed attachment ready to be restored', () => {
    expect(
      ticketRemovedItemSchema.parse({
        kind: 'attachment',
        id: 9,
        label: 'nota-fiscal.pdf',
        archivedAt: '2026-11-20T12:00:00.000Z',
        canRestore: true,
      }),
    ).toMatchObject({ kind: 'attachment', id: 9 });
    expect(TICKET_REMOVED_KIND_LABELS.stock_item).toBe('Item do estoque');
  });

  // triste
  it('refuses a kind that does not exist', () => {
    expect(
      ticketRemovedItemSchema.safeParse({
        kind: 'ticket',
        id: 1,
        label: 'x',
        archivedAt: '2026-11-20T12:00:00.000Z',
        canRestore: false,
      }).success,
    ).toBe(false);
  });
});
