import { describe, expect, it } from 'vitest';

import {
  EMPTY_NEW_ITEM,
  groupByMachine,
  linkOptions,
  newItemErrors,
  selectionErrors,
} from './ticket-stock-link.util';

const item = (id: number, computerId: number | null, computerName: string | null) => ({
  id,
  ticketId: 1,
  source: 'parts' as const,
  itemId: id,
  name: `Item ${id}`,
  direction: 'out' as const,
  quantity: 1,
  computerId,
  computerName,
  settledAt: null,
  createdAt: '2026-11-24T10:00:00.000Z',
  createdByName: 'Ana',
});
const OPTIONS = [
  { id: 1, name: 'Monitor 24"', available: 2 },
  { id: 2, name: 'Teclado', available: 0 },
];

describe('ticket stock by machine', () => {
  // feliz
  it('groups the items by machine, one machine for many items, with "no machine" last', () => {
    const groups = groupByMachine([
      item(1, null, null),
      item(2, 7, 'Computador 01'),
      item(3, 7, 'Computador 01'),
    ]);

    expect(groups.map((group) => [group.machineName, group.items.length])).toEqual([
      ['Computador 01', 2],
      [null, 1],
    ]);
    expect(linkOptions(OPTIONS, 'out', '').map((option) => option.id)).toEqual([1]);
    expect(linkOptions(OPTIONS, 'in', 'tecl').map((option) => option.id)).toEqual([2]);
  });

  // triste
  it('refuses a quantity that is not a whole number, or more than is left on a take-out', () => {
    expect(selectionErrors({ '1': '3', '2': '0' }, OPTIONS, 'out')).toEqual({
      '1': 'Só 2 disponível',
      '2': 'Quantidade inteira, de 1 para cima',
    });
    expect(selectionErrors({ '1': '3' }, OPTIONS, 'in')).toEqual({});
  });
});

describe('descarte e cadastro na hora', () => {
  // feliz
  it('offers only items with balance to the disposal, and checks it against what is left', () => {
    const options = [
      { id: 1, name: 'Mouse', available: 0 },
      { id: 2, name: 'Teclado', available: 2 },
    ];

    expect(linkOptions(options, 'disposal', '').map((option) => option.id)).toEqual([2]);
    expect(selectionErrors({ '2': '3' }, options, 'disposal')).toEqual({ '2': 'Só 2 disponível' });
  });

  // triste
  it('asks for the name, the category and a quantity before registering', () => {
    expect(newItemErrors({ ...EMPTY_NEW_ITEM, quantity: '0' })).toEqual({
      name: 'Diga o nome do item',
      category: 'Escolha a categoria',
      quantity: 'Quantidade inteira, de 1 para cima',
    });
    expect(newItemErrors({ ...EMPTY_NEW_ITEM, name: 'Fonte', category: 'other' })).toEqual({});
  });
});

