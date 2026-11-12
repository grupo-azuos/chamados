import { describe, expect, it } from 'vitest';

import {
  availableForTicket,
  balanceAfterTicketItem,
  refuseTicketStockItem,
  refuseTicketStockSettlement,
  reverseTicketStockDirection,
  ticketStockSourceArea,
  ticketStockSourceOf,
} from './ticket-stock.util';

describe('ticketStockSourceOf', () => {
  // feliz
  it('gives each area its own shelf', () => {
    expect(ticketStockSourceOf('infra')).toBe('parts');
    expect(ticketStockSourceOf('manutencao')).toBe('inventory');
    expect(ticketStockSourceArea('inventory')).toBe('manutencao');
  });

  // triste
  it('gives no shelf to the area that has none', () => {
    expect(ticketStockSourceOf('sistema')).toBeNull();
  });
});

describe('availableForTicket', () => {
  // feliz
  it('takes the other tickets reservations out of the balance', () => {
    expect(availableForTicket(5, 2)).toBe(3);
  });

  // triste
  it('never goes below zero', () => {
    expect(availableForTicket(1, 4)).toBe(0);
  });
});

describe('refuseTicketStockItem', () => {
  const base = { name: 'Mouse USB', quantity: 2, available: 3 };

  // feliz
  it('accepts a take-out that fits and any return', () => {
    expect(refuseTicketStockItem({ ...base, direction: 'out' })).toBeNull();
    expect(refuseTicketStockItem({ ...base, direction: 'in', available: 0 })).toBeNull();
  });

  // triste
  it('says how much is left when the take-out does not fit', () => {
    expect(refuseTicketStockItem({ ...base, direction: 'out', quantity: 4 })).toBe(
      'Só há 3 de Mouse USB disponível no depósito.',
    );
  });

  it('says there is none when nothing is left', () => {
    expect(refuseTicketStockItem({ ...base, direction: 'out', available: 0 })).toBe(
      'Não há Mouse USB disponível no depósito.',
    );
  });
});

describe('refuseTicketStockSettlement', () => {
  // feliz
  it('accepts closing when the shelf has it', () => {
    expect(
      refuseTicketStockSettlement({ name: 'Mouse', direction: 'out', quantity: 1, balance: 1 }),
    ).toBeNull();
  });

  // triste
  it('refuses closing when the shelf no longer has it', () => {
    expect(
      refuseTicketStockSettlement({ name: 'Mouse', direction: 'out', quantity: 2, balance: 1 }),
    ).toContain('O depósito tem 1 de Mouse');
  });
});

describe('balanceAfterTicketItem and reverseTicketStockDirection', () => {
  // feliz
  it('moves the balance in the direction of the item', () => {
    expect(balanceAfterTicketItem(3, 'out', 2)).toBe(1);
    expect(balanceAfterTicketItem(3, 'in', 2)).toBe(5);
  });

  // triste
  it('undoes a take-out by bringing it back', () => {
    expect(reverseTicketStockDirection('out')).toBe('in');
    expect(reverseTicketStockDirection('in')).toBe('out');
  });
});
