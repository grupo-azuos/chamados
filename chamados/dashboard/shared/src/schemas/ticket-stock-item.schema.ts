import { z } from 'zod';

import {
  MAX_TICKET_STOCK_QUANTITY,
  TICKET_STOCK_DIRECTIONS,
  TICKET_STOCK_SOURCES,
} from '../domain/ticket-stock.util';

/**
 * O CONTRATO dos itens de estoque de um chamado (ver `ticket-stock.util`). Mora num arquivo
 * próprio, como as pessoas vinculadas: o chamado, a ordem de serviço e o Depósito usam as
 * mesmas peças.
 */
export const ticketStockSourceSchema = z.enum(TICKET_STOCK_SOURCES, {
  errorMap: () => ({ message: 'Escolha de qual depósito é o item' }),
});

export const ticketStockDirectionSchema = z.enum(TICKET_STOCK_DIRECTIONS, {
  errorMap: () => ({ message: 'Escolha se o item sai ou entra no depósito' }),
});

/** Um item no chamado, como a ficha e a ordem de serviço o mostram. */
export const ticketStockItemSchema = z.object({
  id: z.number().int(),
  ticketId: z.number().int(),
  source: ticketStockSourceSchema,
  /** O id da peça (Infra) ou do produto (Manutenção), conforme `source`. */
  itemId: z.number().int(),
  /** O nome do item no dia em que entrou no chamado — a ordem de serviço não muda depois. */
  name: z.string(),
  direction: ticketStockDirectionSchema,
  quantity: z.number().int(),
  /**
   * Quando o item virou movimento no depósito — o encerramento do chamado. Nulo é o item ainda
   * reservado, com o chamado aberto.
   */
  settledAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  createdByName: z.string(),
});

export type TicketStockItem = z.infer<typeof ticketStockItemSchema>;

/** Vincular um item ao chamado. */
export const createTicketStockItemSchema = z.object({
  source: ticketStockSourceSchema,
  itemId: z.coerce
    .number({ invalid_type_error: 'Escolha o item' })
    .int('Escolha o item')
    .positive('Escolha o item'),
  direction: ticketStockDirectionSchema,
  quantity: z.coerce
    .number({ invalid_type_error: 'Informe a quantidade' })
    .int('A quantidade é um número inteiro')
    .min(1, 'A quantidade mínima é 1')
    .max(MAX_TICKET_STOCK_QUANTITY, `A quantidade máxima é ${MAX_TICKET_STOCK_QUANTITY}`),
});

export type CreateTicketStockItemInput = z.input<typeof createTicketStockItemSchema>;

/** A forma do formulário: na tela todo campo é texto. */
export const ticketStockItemFormSchema = z.object({
  itemId: z.string().min(1, 'Escolha o item'),
  direction: ticketStockDirectionSchema,
  quantity: z
    .string()
    .trim()
    .min(1, 'Informe a quantidade')
    .regex(/^\d+$/, 'A quantidade é um número inteiro')
    .refine((value) => Number(value) >= 1, 'A quantidade mínima é 1')
    .refine(
      (value) => Number(value) <= MAX_TICKET_STOCK_QUANTITY,
      `A quantidade máxima é ${MAX_TICKET_STOCK_QUANTITY}`,
    ),
});

export type TicketStockItemFormValues = z.input<typeof ticketStockItemFormSchema>;

/** Um item que PODE ser vinculado: o nome e quanto ainda sobra para sair por um chamado. */
export const ticketStockOptionSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  /** O saldo da prateleira menos o que outros chamados abertos já reservaram. */
  available: z.number().int(),
});

export type TicketStockOption = z.infer<typeof ticketStockOptionSchema>;

export const ticketStockOptionsQuerySchema = z.object({ source: ticketStockSourceSchema });

/**
 * A qual chamado ABERTO um item do depósito está preso — o que a tela do Depósito mostra ao
 * lado do item, com o link para o chamado.
 */
export const ticketStockLinkSchema = z.object({
  ticketId: z.number().int(),
  protocol: z.string(),
  direction: ticketStockDirectionSchema,
  quantity: z.number().int(),
});

export type TicketStockLink = z.infer<typeof ticketStockLinkSchema>;
