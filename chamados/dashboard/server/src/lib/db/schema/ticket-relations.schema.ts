import { isNull, sql } from 'drizzle-orm';
import { check, index, integer, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { archiveColumns } from '../archive.util';
import { ticketsSchema } from './schemas.schema';
import { tickets } from './tickets.schema';

/**
 * Chamados vinculados / relacionados entre si.
 *
 * Permite relacionar múltiplos chamados (duplicados, desdobramentos ou chamados
 * correlacionados ao mesmo incidente).
 */
export const ticketRelations = ticketsSchema.table(
  'ticket_relations',
  {
    id: serial('id').primaryKey(),
    ticketId: integer('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    relatedTicketId: integer('related_ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    createdBy: text('created_by'),
    /* Desvincular ARQUIVA: o vínculo some do chamado e volta pelo "Desfazer". */
    ...archiveColumns(),
  },
  (table) => [
    /* Um vínculo valendo por par; os desfeitos (arquivados) não contam. */
    uniqueIndex('ticket_relations_pair_idx')
      .on(table.ticketId, table.relatedTicketId)
      .where(isNull(table.archivedAt)),
    index('ticket_relations_ticket_idx').on(table.ticketId),
    index('ticket_relations_related_ticket_idx').on(table.relatedTicketId),
    check('ticket_relations_different', sql`${table.ticketId} <> ${table.relatedTicketId}`),
  ],
);

export type TicketRelationRow = typeof ticketRelations.$inferSelect;
export type TicketRelationInsert = typeof ticketRelations.$inferInsert;
