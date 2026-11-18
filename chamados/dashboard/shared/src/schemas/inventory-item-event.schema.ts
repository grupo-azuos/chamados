import { z } from 'zod';

import { INVENTORY_ITEM_EVENT_TYPES } from '../domain/inventory-item-event.util';

export const INVENTORY_ITEM_EVENT_DESCRIPTION_MAX_LENGTH = 2000;

export const inventoryItemEventTypeSchema = z.enum(INVENTORY_ITEM_EVENT_TYPES, { error: (issue) => (issue.input === undefined ? 'Informe o tipo da ocorrência.' : 'Tipo de ocorrência inválido.') });

export const inventoryItemEventSchema = z.object({
  id: z.number().int().positive(),
  itemId: z.number().int().positive(),
  type: inventoryItemEventTypeSchema,
  description: z.string().trim().min(1).max(INVENTORY_ITEM_EVENT_DESCRIPTION_MAX_LENGTH),
  authorName: z.string().trim().min(1),
  createdBy: z.string().trim(),
  createdAt: z.iso.datetime(),
});

export type InventoryItemEvent = z.infer<typeof inventoryItemEventSchema>;

export const createInventoryItemEventSchema = z.object({
  type: inventoryItemEventTypeSchema,
  description: z
    .string({ error: 'Informe a descrição da ocorrência.' })
    .trim()
    .min(1, 'A descrição da ocorrência não pode ficar vazia.')
    .max(
      INVENTORY_ITEM_EVENT_DESCRIPTION_MAX_LENGTH,
      `A descrição não pode passar de ${INVENTORY_ITEM_EVENT_DESCRIPTION_MAX_LENGTH} caracteres.`,
    ),
});

export type CreateInventoryItemEventInput = z.infer<
  typeof createInventoryItemEventSchema
>;
