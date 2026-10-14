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
  /** O identificador da mensagem no WhatsApp. Opcional: um bot antigo não o envia. */
  messageId: z.string().min(1).max(128).nullable().optional(),
});

export const inboundReplySchema = z.object({
  reply: z.string().nullable(),
  isOpen: z.boolean(),
  /** A mensagem já tinha chegado: o bot não responde e não mexe na conversa. */
  isDuplicate: z.boolean().optional(),
});

export class InboundMessageDto extends createZodDto(inboundMessageSchema) {}
export class InboundReplyDto extends createZodDto(inboundReplySchema) {}
