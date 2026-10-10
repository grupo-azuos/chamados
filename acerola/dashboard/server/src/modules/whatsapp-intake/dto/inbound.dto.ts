import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/* Uma mensagem de WhatsApp tem teto bem maior; um formulário preenchido cabe com folga aqui. */
const INBOUND_TEXT_MAX_LENGTH = 6000;

export const inboundMessageSchema = z.object({
  sessionId: z.string().regex(/^[a-f0-9]{64}$/),
  chatId: z.string().min(1).max(128),
  text: z.string().min(1).max(INBOUND_TEXT_MAX_LENGTH),
  phone: z
    .string()
    .regex(/^\d{10,15}$/)
    .nullable(),
});

export const inboundReplySchema = z.object({
  reply: z.string().nullable(),
  isOpen: z.boolean(),
});

export class InboundMessageDto extends createZodDto(inboundMessageSchema) {}
export class InboundReplyDto extends createZodDto(inboundReplySchema) {}
