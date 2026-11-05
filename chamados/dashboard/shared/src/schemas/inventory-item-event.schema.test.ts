import { describe, expect, it } from 'vitest';

import {
  createInventoryItemEventSchema,
  inventoryItemEventSchema,
} from './inventory-item-event.schema';

describe('inventoryItemEventSchema', () => {
  it('accepts a valid inventory item event', () => {
    const valid = {
      id: 1,
      itemId: 42,
      type: 'defeito',
      description: 'Pé quebrado após queda',
      authorName: 'Vinícius Gabriel',
      createdBy: 'vinicius@example.com',
      createdAt: '2026-11-05T17:00:00.000Z',
    };

    const parsed = inventoryItemEventSchema.parse(valid);
    expect(parsed.id).toBe(1);
    expect(parsed.type).toBe('defeito');
  });

  it('rejects invalid types', () => {
    const invalid = {
      id: 1,
      itemId: 42,
      type: 'invalido',
      description: 'Teste',
      authorName: 'User',
      createdBy: 'user@example.com',
      createdAt: '2026-11-05T17:00:00.000Z',
    };

    expect(() => inventoryItemEventSchema.parse(invalid)).toThrow();
  });
});

describe('createInventoryItemEventSchema', () => {
  it('validates required fields and trims description', () => {
    const input = {
      type: 'troca',
      description: '  Substituído rodízio por um novo  ',
    };

    const parsed = createInventoryItemEventSchema.parse(input);
    expect(parsed.type).toBe('troca');
    expect(parsed.description).toBe('Substituído rodízio por um novo');
  });

  it('rejects empty description', () => {
    expect(() =>
      createInventoryItemEventSchema.parse({
        type: 'observacao',
        description: '   ',
      }),
    ).toThrow('A descrição da ocorrência não pode ficar vazia.');
  });
});
