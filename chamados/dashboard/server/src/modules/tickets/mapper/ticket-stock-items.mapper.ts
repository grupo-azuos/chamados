import { type TicketStockSource } from '@template/shared/domain/ticket-stock.util';
import { type TicketStockItem } from '@template/shared/schemas/ticket-stock-item.schema';

import { type TicketStockItemRow } from '../../../lib/db/schema/ticket-stock-items.schema';

/** De qual prateleira é a linha: a que tem o id preenchido (o banco garante que é só uma). */
export function sourceOf(row: TicketStockItemRow): TicketStockSource {
  return row.partId !== null ? 'parts' : 'inventory';
}

export function toTicketStockItem(row: TicketStockItemRow): TicketStockItem {
  return {
    id: row.id,
    ticketId: row.ticketId,
    source: sourceOf(row),
    itemId: row.partId ?? row.inventoryItemId ?? 0,
    name: row.itemName,
    direction: row.direction,
    quantity: row.quantity,
    settledAt: row.settledAt ? row.settledAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    createdByName: row.createdByName,
  };
}
