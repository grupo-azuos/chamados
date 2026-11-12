import { index, integer, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { chamadosSchema } from './chamados.schema';

import { computers } from './computers.schema';
import { tickets } from './tickets.schema';

/**
 * As MÁQUINAS de um chamado — um atendimento pode passar por várias (o monitor trocado em duas
 * mesas, a impressora que três computadores usam).
 *
 * `tickets.computer_id` continua existindo e guarda a PRIMEIRA delas: é por ele que o painel e
 * os relatórios antigos leem "a máquina do chamado". Quem quer todas lê daqui — a ficha de cada
 * computador conta o chamado, seja ele a primeira máquina ou a terceira.
 *
 * `cascade` nos dois lados: sem o chamado ou sem a máquina, o vínculo não diz mais nada. O
 * chamado continua contando, pela linha do tempo, que a máquina esteve nele.
 */
export const ticketComputers = chamadosSchema.table(
  'ticket_computers',
  {
    id: serial('id').primaryKey(),
    ticketId: integer('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    computerId: integer('computer_id')
      .notNull()
      .references(() => computers.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    /** O e-mail de quem vinculou — vem sempre da sessão. Nulo nos vínculos vindos de antes. */
    createdBy: text('created_by'),
  },
  (table) => [
    /* A mesma máquina não entra duas vezes no mesmo chamado. */
    uniqueIndex('ticket_computers_ticket_computer_idx').on(table.ticketId, table.computerId),
    /* "Os chamados desta máquina" é a consulta da ficha do computador. */
    index('ticket_computers_computer_idx').on(table.computerId),
  ],
);

export type TicketComputerRow = typeof ticketComputers.$inferSelect;
export type TicketComputerInsert = typeof ticketComputers.$inferInsert;
