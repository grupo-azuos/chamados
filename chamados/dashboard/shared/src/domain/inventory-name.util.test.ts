import { describe, expect, it } from 'vitest';

import { distinctInventoryNames, inventoryNameKey } from './inventory-name.util';

describe('inventoryNameKey', () => {
  // feliz
  it('treats upper, lower and padded spellings as the same product', () => {
    expect(inventoryNameKey(' CADEIRA ')).toBe(inventoryNameKey('cadeira'));
    expect(inventoryNameKey('Cadeira')).toBe('cadeira');
  });

  // triste
  it('keeps different products apart', () => {
    expect(inventoryNameKey('Cadeira')).not.toBe(inventoryNameKey('Cadeira giratória'));
  });
});

describe('distinctInventoryNames', () => {
  // feliz
  it('keeps one name per product, in the most used spelling, sorted', () => {
    expect(distinctInventoryNames(['Mesa', 'Cadeira', 'CADEIRA', 'Cadeira', 'café'])).toEqual(['Cadeira', 'café', 'Mesa']);
  });

  // triste
  it('drops blank names and keeps the first spelling on a tie', () => {
    expect(distinctInventoryNames(['  ', 'cadeira', 'CADEIRA'])).toEqual(['cadeira']);
  });
});
