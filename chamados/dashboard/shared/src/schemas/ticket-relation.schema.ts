import { z } from 'zod';

import { ticketAreaSchema, ticketPrioritySchema, ticketStatusSchema } from './ticket.schema';

/**
 * Resumo do chamado vinculado para exibição em lista/chips.
 */
export const relatedTicketSummarySchema = z.object({
  id: z.number().int().positive(),
  protocol: z.string(),
  description: z.string(),
  status: ticketStatusSchema,
  priority: ticketPrioritySchema,
  area: ticketAreaSchema,
  requesterName: z.string(),
  createdAt: z.string().datetime(),
});

export type RelatedTicketSummary = z.infer<typeof relatedTicketSummarySchema>;

/**
 * O vínculo entre dois chamados.
 */
export const ticketRelationSchema = z.object({
  id: z.number().int().positive(),
  ticketId: z.number().int().positive(),
  relatedTicketId: z.number().int().positive(),
  relatedTicket: relatedTicketSummarySchema,
  createdAt: z.string().datetime(),
  createdBy: z.string().nullable(),
});

export type TicketRelation = z.infer<typeof ticketRelationSchema>;

/**
 * Contrato para vincular um chamado a outro.
 */
export const addTicketRelationSchema = z.object({
  relatedTicketId: z
    .number({ required_error: 'Informe o chamado a vincular' })
    .int()
    .positive('Informe um id de chamado válido'),
});

export type AddTicketRelationInput = z.infer<typeof addTicketRelationSchema>;
