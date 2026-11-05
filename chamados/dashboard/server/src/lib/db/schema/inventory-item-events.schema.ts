import { INVENTORY_ITEM_EVENT_TYPES } from '@template/shared/domain/inventory-item-event.util';
import { sql } from 'drizzle-orm';
import { check, index, integer, serial, text, timestamp } from 'drizzle-orm/pg-core';

import { chamadosSchema } from './chamados.schema';
import { inventoryItems } from './inventory-items.schema';

function valuesFor(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(', '));
}

/**
 * HISTÓRICO E OCORRÊNCIAS DE UM PRODUTO DO INVENTÁRIO (defeito, troca, manutenção, observações).
 *
 * Registra a linha do tempo do item, permitindo acompanhar o ciclo de vida completo:
 * defeitos apresentados, trocas de peças ou componentes, manutenções realizadas e observações.
 *
 * Exclusão em cascata: excluir o produto leva a linha do tempo dele junto.
 */
export const inventoryItemEvents = chamadosSchema.table(
  'inventory_item_events',
  {
    id: serial('id').primaryKey(),

    itemId: integer('item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'cascade' }),

    type: text('type', { enum: INVENTORY_ITEM_EVENT_TYPES }).notNull(),
    description: text('description').notNull(),

    authorName: text('author_name').notNull(),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('inventory_item_events_item_time_idx').on(table.itemId, table.createdAt.desc()),
    check(
      'inventory_item_events_type_valid',
      sql`${table.type} in (${valuesFor(INVENTORY_ITEM_EVENT_TYPES)})`,
    ),
  ],
);

export type InventoryItemEventRow = typeof inventoryItemEvents.$inferSelect;
export type InventoryItemEventInsert = typeof inventoryItemEvents.$inferInsert;
