import { type InventoryItem } from '@template/shared/schemas/inventory-item.schema';
import { describe, expect, it } from 'vitest';

import { groupStock, stockItemOf } from './inventory-stock-group.util';

function item(id: number, name: string, balance: number): InventoryItem {
  return {
    id,
    name,
    category: 'furniture',
    unit: 'unit',
    location: null,
    department: null,
    userId: null,
    userName: null,
    code: null,
    note: null,
    photoUrl: null,
    balance,
    createdAt: '2026-11-01T10:00:00.000Z',
    createdBy: 'a@e.com',
    updatedAt: null,
    updatedBy: null,
    archive: null,
    ticketLinks: [],
  } as InventoryItem;
}

describe('groupStock', () => {
  // feliz
  it('joins CADEIRA, cadeira and Cadeira into one product, adding the balances', () => {
    const groups = groupStock([
      item(1, 'Cadeira', 2),
      item(2, 'CADEIRA', 0),
      item(3, 'cadeira ', 3),
      item(4, 'Mesa', 1),
    ]);

    expect(groups.map((group) => [group.name, group.balance, group.items.length])).toEqual([
      ['Cadeira', 5, 3],
      ['Mesa', 1, 1],
    ]);
  });

  // triste
  it('gives nothing for an empty inventory', () => {
    expect(groupStock([])).toEqual([]);
  });
});

describe('stockItemOf', () => {
  // feliz
  it('shows the group name and balance on the first registration', () => {
    const [group] = groupStock([item(7, 'Cadeira', 1), item(8, 'cadeira', 4)]);

    expect(stockItemOf(group!)).toMatchObject({ id: 7, name: 'Cadeira', balance: 5 });
  });
});
