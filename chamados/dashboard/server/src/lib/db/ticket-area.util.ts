import { type TicketArea } from '@template/shared/domain/ticket-catalog.util';
import { sql, type SQL } from 'drizzle-orm';

import { qualified } from './sql-column.util';
import { ticketAreas } from './schema/ticket-areas.schema';
import { tickets } from './schema/tickets.schema';

/**
 * "O chamado é desta área": a área original dele, ou uma das PARTICIPANTES (#13).
 *
 * É a mesma régua da fila de chamados (`areaReach`, no repositório de chamados), escrita como
 * uma condição só para caber dentro de contagens e subconsultas. Cada módulo conta o que é
 * dele: o painel de Infraestrutura não pode mostrar chamado de Sistema, e a ficha da máquina
 * não pode somar o "erro no sistema" de quem a usa.
 *
 * Colunas com a tabela na frente (`qualified`): esta condição entra em subconsultas
 * correlacionadas, e sem o nome da tabela `id` seria o da área, não o do chamado.
 */
export function ticketInArea(area: TicketArea): SQL {
  return sql`(${qualified(tickets.area)} = ${area} or exists (
    select 1 from ${ticketAreas}
    where ${qualified(ticketAreas.ticketId)} = ${qualified(tickets.id)}
      and ${qualified(ticketAreas.area)} = ${area}
  ))`;
}
