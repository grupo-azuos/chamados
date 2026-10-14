import { z } from 'zod';

/**
 * OS AVISOS DE WHATSAPP DE UM CHAMADO, na FILA DE SAÍDA.
 *
 * O aviso não sai na hora em que o chamado é aberto (ou em que alguém clica em avisar): ele
 * entra numa fila, e o servidor o entrega em seguida — tentando de novo quando o bot está fora
 * do ar ou o celular de quem atende está desconectado. É o mesmo desenho do e-mail de primeiro
 * acesso: gravar o "precisa enviar" é garantido; enviar pode esperar.
 *
 *   pending    na fila: ainda não saiu (vai sair, ou está esperando a próxima tentativa)
 *   sent       saiu pelo WhatsApp de quem atende
 *   failed     não saiu e não vai mais tentar sozinho (ver `failureReason`)
 *   discarded  o sistema desistiu de propósito: o limite do dia acabou e o aviso perdeu o sentido
 */
export const WHATSAPP_NOTICE_STATUSES = ['pending', 'sent', 'failed', 'discarded'] as const;
export type WhatsappNoticeStatus = (typeof WHATSAPP_NOTICE_STATUSES)[number];

/** Por que um aviso não saiu. */
export const WHATSAPP_NOTICE_FAILURES = [
  'not_configured',
  'not_linked',
  'not_connected',
  'recipient_not_found',
  'limit_reached',
  'failed',
  'expired',
] as const;
export type WhatsappNoticeFailure = (typeof WHATSAPP_NOTICE_FAILURES)[number];

/** Os avisos que um chamado gera — os textos `ticket_*` do bot. */
export const WHATSAPP_NOTICE_KINDS = ['ticket_opened', 'ticket_ready'] as const;
export type WhatsappNoticeKind = (typeof WHATSAPP_NOTICE_KINDS)[number];

export const whatsappNoticeSchema = z.object({
  id: z.number().int(),
  kind: z.enum(WHATSAPP_NOTICE_KINDS),
  status: z.enum(WHATSAPP_NOTICE_STATUSES),
  /** Quantas vezes o servidor já tentou entregar. */
  attempts: z.number().int().min(0),
  /** Por que não saiu. Nulo enquanto não houve falha. */
  failureReason: z.enum(WHATSAPP_NOTICE_FAILURES).nullable(),
  createdAt: z.string(),
  sentAt: z.string().nullable(),
});
export type WhatsappNotice = z.infer<typeof whatsappNoticeSchema>;

export const WHATSAPP_NOTICE_KIND_LABELS: Record<WhatsappNoticeKind, string> = {
  ticket_opened: 'Chamado recebido',
  ticket_ready: 'Chamado pronto',
};

export const WHATSAPP_NOTICE_STATUS_LABELS: Record<WhatsappNoticeStatus, string> = {
  pending: 'Na fila',
  sent: 'Enviado',
  failed: 'Não saiu',
  discarded: 'Descartado',
};

/** A cor de cada situação: o domínio decide, para ela ser a mesma em toda tela. */
export type WhatsappNoticeTone = 'info' | 'success' | 'warning' | 'danger';

export const WHATSAPP_NOTICE_STATUS_TONES: Record<WhatsappNoticeStatus, WhatsappNoticeTone> = {
  pending: 'info',
  sent: 'success',
  failed: 'danger',
  discarded: 'warning',
};

/** Por que o aviso não saiu, em palavras de gente. */
export const WHATSAPP_NOTICE_FAILURE_MESSAGES: Record<WhatsappNoticeFailure, string> = {
  not_configured: 'O WhatsApp não está configurado nesta instalação.',
  not_linked: 'Quem envia não tem mais o WhatsApp vinculado.',
  not_connected: 'O WhatsApp de quem envia está desconectado.',
  recipient_not_found: 'O telefone informado no chamado não tem WhatsApp.',
  limit_reached: 'O limite de mensagens do dia acabou.',
  failed: 'Não consegui falar com o serviço de WhatsApp.',
  expired: 'Passou 1 dia tentando e o aviso não saiu.',
};

/** O aviso pode ser mandado de novo à mão? Só o que parou: o que está na fila já vai sair. */
export function canRetryWhatsappNotice(status: WhatsappNoticeStatus): boolean {
  return status === 'failed' || status === 'discarded';
}
