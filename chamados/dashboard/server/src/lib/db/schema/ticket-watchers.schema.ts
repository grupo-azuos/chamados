import { index, integer, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { chamadosSchema } from './chamados.schema';

import { tickets } from './tickets.schema';

/**
 * As PESSOAS VINCULADAS a um chamado — além de quem abriu (`tickets.requester_id`).
 *
 * É a "OS com envolvidos" do Tasy: o chamado de um setor costuma interessar a mais gente que a
 * pessoa que o abriu, e essa gente precisa ver o andamento e escrever nele sem abrir um chamado
 * novo. Quem está aqui vê o chamado em "Meus chamados", responde, anexa e reabre — igual a quem
 * abriu.
 *
 * Tabela própria, como `ticket_areas`: guarda quem vinculou e quando, e "os chamados desta
 * pessoa" vira uma consulta por índice, não uma varredura de array.
 *
 * `user_name` é o nome da pessoa NO DIA em que foi vinculada, como texto — a mesma escolha do
 * `author_name` do histórico: o chamado antigo continua dizendo quem estava envolvido mesmo que
 * a pessoa saia do admin-console.
 */
export const ticketWatchers = chamadosSchema.table(
  'ticket_watchers',
  {
    id: serial('id').primaryKey(),
    ticketId: integer('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    /** O UUID da pessoa no admin-console. */
    userId: text('user_id').notNull(),
    userName: text('user_name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    /** O e-mail de quem vinculou — vem sempre da sessão. */
    createdBy: text('created_by'),
  },
  (table) => [
    /* A mesma pessoa não se vincula duas vezes ao mesmo chamado. */
    uniqueIndex('ticket_watchers_ticket_user_idx').on(table.ticketId, table.userId),
    /* "Meus chamados" de quem foi vinculado. */
    index('ticket_watchers_user_idx').on(table.userId),
  ],
);

export type TicketWatcherRow = typeof ticketWatchers.$inferSelect;
export type TicketWatcherInsert = typeof ticketWatchers.$inferInsert;
