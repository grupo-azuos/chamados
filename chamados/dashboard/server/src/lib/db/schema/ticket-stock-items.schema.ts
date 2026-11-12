import { TICKET_STOCK_DIRECTIONS } from '@template/shared/domain/ticket-stock.util';
import { sql } from 'drizzle-orm';
import { check, index, integer, serial, text, timestamp } from 'drizzle-orm/pg-core';

import { chamadosSchema } from './chamados.schema';

import { inventoryItems } from './inventory-items.schema';
import { parts } from './parts.schema';
import { tickets } from './tickets.schema';

/** Monta a lista de valores aceitos para a checagem do banco, a partir da lista do domínio. */
function valuesFor(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(', '));
}

/**
 * OS ITENS DE ESTOQUE de um chamado — o que o atendimento tirou da prateleira ou devolveu a
 * ela (ver `ticket-stock.util`).
 *
 * Uma linha aponta para UMA prateleira: a peça da TI (`part_id`, Infraestrutura) ou o produto
 * da Manutenção (`inventory_item_id`). Os dois depósitos continuam separados — esta tabela só
 * diz qual chamado mexeu em qual deles.
 *
 * Enquanto `settled_at` é nulo, o item está RESERVADO: o saldo da prateleira não andou, e a
 * tela do Depósito mostra o chamado que o prende. O encerramento do chamado transforma cada
 * item num movimento do depósito e carimba `settled_at`.
 *
 * `restrict` na peça, como em `part_movements`: peça com histórico não se apaga. `cascade` no
 * produto, como em `inventory_movements`: excluir o produto leva o extrato junto.
 */
export const ticketStockItems = chamadosSchema.table(
  'ticket_stock_items',
  {
    id: serial('id').primaryKey(),
    ticketId: integer('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    partId: integer('part_id').references(() => parts.id, { onDelete: 'restrict' }),
    inventoryItemId: integer('inventory_item_id').references(() => inventoryItems.id, {
      onDelete: 'cascade',
    }),
    /* O nome NO DIA em que entrou no chamado: a ordem de serviço já emitida não pode mudar
       porque alguém renomeou a peça depois. */
    itemName: text('item_name').notNull(),
    direction: text('direction', { enum: TICKET_STOCK_DIRECTIONS }).notNull(),
    quantity: integer('quantity').notNull(),
    settledAt: timestamp('settled_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    createdBy: text('created_by').notNull(),
    createdByName: text('created_by_name').notNull(),
  },
  (table) => [
    index('ticket_stock_items_ticket_idx').on(table.ticketId),
    /* "Este item está preso a qual chamado?" é a consulta da tela do Depósito. */
    index('ticket_stock_items_part_idx').on(table.partId),
    index('ticket_stock_items_inventory_item_idx').on(table.inventoryItemId),
    /* Uma prateleira e só uma: sem nenhuma o item não existe; com as duas, ninguém sabe de
       qual depósito ele sai. */
    check(
      'ticket_stock_items_one_source',
      sql`(${table.partId} is null) <> (${table.inventoryItemId} is null)`,
    ),
    check(
      'ticket_stock_items_direction_valid',
      sql`${table.direction} in (${valuesFor(TICKET_STOCK_DIRECTIONS)})`,
    ),
    check('ticket_stock_items_quantity_positive', sql`${table.quantity} > 0`),
  ],
);

export type TicketStockItemRow = typeof ticketStockItems.$inferSelect;
export type TicketStockItemInsert = typeof ticketStockItems.$inferInsert;
