import { z } from 'zod';

/**
 * A situação do vínculo de WhatsApp de UMA pessoa — o que a tela de perfil mostra.
 *
 *   disconnected  não há número vinculado
 *   pairing       o vínculo começou e espera a leitura do QR code (`qr` vem preenchido)
 *   connected     há um número vinculado e conectado (`phone` vem preenchido)
 */
export const whatsappLinkStateSchema = z.enum(['disconnected', 'pairing', 'connected']);
export type WhatsappLinkState = z.infer<typeof whatsappLinkStateSchema>;

export const whatsappConnectionSchema = z.object({
  /** O bot de WhatsApp está configurado nesta instalação? Sem ele, não há o que vincular. */
  isConfigured: z.boolean(),
  /** Esta pessoa pode vincular? Só quem administra (ver `canLinkWhatsApp`). */
  canLink: z.boolean(),
  state: whatsappLinkStateSchema,
  /** O CONTEÚDO do QR code, para a tela desenhar. Nulo fora do `pairing`. */
  qr: z.string().nullable(),
  /** O número vinculado, só dígitos com DDI. Nulo enquanto não conectou. */
  phone: z.string().nullable(),
});
export type WhatsappConnection = z.infer<typeof whatsappConnectionSchema>;
