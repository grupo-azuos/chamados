import { formatTicketProtocol } from '@template/shared/domain/ticket-protocol.util';
import { type TicketStockSource } from '@template/shared/domain/ticket-stock.util';
import { type TicketStockLink } from '@template/shared/schemas/ticket-stock-item.schema';
import { and, asc, inArray, isNull } from 'drizzle-orm';

import { type DatabaseExecutor } from './db.type';
import { runQuery } from './db-error.util';
import { ticketStockItems } from './schema/ticket-stock-items.schema';

/**
 * Os chamados ABERTOS que prendem estes itens do depósito — os itens de chamado ainda não
 * movidos (ver `ticket-stock-items.schema`).
 *
 * Mora aqui, e não no módulo de chamados, porque quem pergunta são as telas de DEPÓSITO (a da
 * TI e a da Manutenção): elas mostram, ao lado de cada item, o chamado que o reservou. Uma
 * consulta só, lida pelos dois repositórios, sem um módulo depender do outro.
 */
export async function ticketStockLinksOf(
  executor: DatabaseExecutor,
  source: TicketStockSource,
  itemIds: readonly number[],
): Promise<Map<number, TicketStockLink[]>> {
  const links = new Map<number, TicketStockLink[]>();
  if (itemIds.length === 0) return links;

  const column = source === 'parts' ? ticketStockItems.partId : ticketStockItems.inventoryItemId;
  const rows = await runQuery(
    executor
      .select({
        itemId: column,
        ticketId: ticketStockItems.ticketId,
        direction: ticketStockItems.direction,
        quantity: ticketStockItems.quantity,
      })
      .from(ticketStockItems)
      .where(and(inArray(column, [...itemIds]), isNull(ticketStockItems.settledAt)))
      .orderBy(asc(ticketStockItems.ticketId), asc(ticketStockItems.id)),
    'listar os chamados que prendem os itens do depósito',
  );

  for (const row of rows) {
    if (row.itemId === null) continue;

    const list = links.get(row.itemId) ?? [];
    list.push({
      ticketId: row.ticketId,
      protocol: formatTicketProtocol(row.ticketId),
      direction: row.direction,
      quantity: row.quantity,
    });
    links.set(row.itemId, list);
  }

  return links;
}
