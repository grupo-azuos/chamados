import { TICKET_AREAS } from '@template/shared/domain/ticket-catalog.util';
import { sql } from 'drizzle-orm';
import { check, index, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { chamadosSchema } from './chamados.schema';

/** Monta a lista de valores aceitos para a checagem do banco, a partir da lista do domínio. */
function valuesFor(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(', '));
}

/**
 * Os TIPOS DE PROBLEMA cadastrados na hora — pela busca do campo, quando o que a pessoa
 * procura não está na lista fixa (`ticket-catalog.util`).
 *
 * O chamado guarda o NOME, e não o id daqui: é o mesmo campo `problem_type` que guarda a
 * chave da lista fixa (`printer`), e os indicadores somam por ele sem precisar de junção.
 * Por isso o nome não se edita — mudar o nome aqui deixaria os chamados antigos com um tipo
 * que não existe mais na lista.
 *
 * Um tipo é de UMA área: "Leitor de código de barras" de Infra não aparece em Manutenção.
 */
export const ticketProblemTypes = chamadosSchema.table(
  'ticket_problem_types',
  {
    id: serial('id').primaryKey(),
    area: text('area', { enum: TICKET_AREAS }).notNull(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    createdBy: text('created_by').notNull(),
  },
  (table) => [
    /* "Impressora 3D" e "impressora 3d" são o mesmo tipo: dois cadastros dividiriam o mesmo
       problema em duas barras no gráfico. A regra mora no banco (CONTRIBUTING §15). */
    uniqueIndex('ticket_problem_types_area_name_idx').on(table.area, sql`lower(${table.name})`),
    index('ticket_problem_types_area_idx').on(table.area),
    check('ticket_problem_types_area_valid', sql`${table.area} in (${valuesFor(TICKET_AREAS)})`),
  ],
);

export type TicketProblemTypeRow = typeof ticketProblemTypes.$inferSelect;
export type TicketProblemTypeInsert = typeof ticketProblemTypes.$inferInsert;
