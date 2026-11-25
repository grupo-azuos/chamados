import { sql } from 'drizzle-orm';
import { index, integer, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { chamadosSchema } from './chamados.schema';
import { computers } from './computers.schema';

/**
 * QUEM JÁ TEVE CADA COMPUTADOR — um período por responsável (de `started_at` até `ended_at`;
 * aberto = o atual).
 *
 * Quem grava é um GATILHO no banco (migration `computer_responsible_history`): toda mudança de
 * `computers.responsible_id`, por qualquer porta (cadastro, edição, transferência, devolução à
 * prateleira), fecha o período anterior e abre o novo. Nenhuma tela precisa lembrar de gravar.
 * Vale daqui para frente: o ponto de partida é o responsável de cada máquina no dia da migration.
 */
export const computerResponsibleHistory = chamadosSchema.table(
  'computer_responsible_history',
  {
    id: serial('id').primaryKey(),
    computerId: integer('computer_id')
      .notNull()
      .references(() => computers.id, { onDelete: 'cascade' }),
    responsibleId: text('responsible_id').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    /* Um período aberto por máquina: é o responsável de agora. */
    uniqueIndex('computer_responsible_open_unique')
      .on(table.computerId)
      .where(sql`${table.endedAt} is null`),
    index('computer_responsible_person_idx').on(table.responsibleId),
  ],
);

export type ComputerResponsibleHistoryRow = typeof computerResponsibleHistory.$inferSelect;
