import { describe, expect, it } from 'vitest';

import { type TicketStockItemRow } from '../../../lib/db/schema/ticket-stock-items.schema';
import { sourceOf, toTicketStockItem } from './ticket-stock-items.mapper';

const CREATED_AT = new Date('2026-11-12T12:00:00.000Z');

function rowOf(overrides: Partial<TicketStockItemRow> = {}): TicketStockItemRow {
  return {
    id: 1,
    ticketId: 49,
    partId: 7,
    inventoryItemId: null,
    itemName: 'Mouse USB',
    computerId: null,
    direction: 'out',
    quantity: 2,
    settledAt: null,
    createdAt: CREATED_AT,
    createdBy: 'ti@example.com',
    createdByName: 'Pessoa do TI',
    ...overrides,
  };
}

describe('toTicketStockItem', () => {
  // feliz
  it('maps a reserved part line', () => {
    expect(toTicketStockItem(rowOf())).toEqual({
      id: 1,
      ticketId: 49,
      source: 'parts',
      itemId: 7,
      name: 'Mouse USB',
      direction: 'out',
      quantity: 2,
      computerId: null,
      computerName: null,
      settledAt: null,
      createdAt: CREATED_AT.toISOString(),
      createdByName: 'Pessoa do TI',
    });
  });

  it('maps a settled inventory line', () => {
    const item = toTicketStockItem(
      rowOf({ partId: null, inventoryItemId: 3, settledAt: CREATED_AT }),
    );

    expect(item.source).toBe('inventory');
    expect(item.itemId).toBe(3);
    expect(item.settledAt).toBe(CREATED_AT.toISOString());
  });

  it('names the machine the item went to', () => {
    const item = toTicketStockItem(rowOf({ computerId: 7 }), new Map([[7, 'COMPUTADOR - 07']]));

    expect(item.computerName).toBe('COMPUTADOR - 07');
  });

  // triste
  it('reads the source from whichever id is filled', () => {
    expect(sourceOf(rowOf({ partId: null, inventoryItemId: 9 }))).toBe('inventory');
  });
});
