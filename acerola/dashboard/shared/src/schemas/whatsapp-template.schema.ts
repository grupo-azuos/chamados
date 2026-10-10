import { z } from 'zod';

import {
  unknownTemplateVariables,
  WHATSAPP_TEMPLATE_KEYS,
  WHATSAPP_TEMPLATE_MAX_LENGTH,
  type WhatsappTemplateKey,
} from '../domain/whatsapp-template.util';

export const whatsappTemplateKeySchema = z.enum(WHATSAPP_TEMPLATE_KEYS);

/** Um texto do bot, como a tela de edição o recebe. */
export const whatsappTemplateSchema = z.object({
  key: whatsappTemplateKeySchema,
  label: z.string(),
  description: z.string(),
  variables: z.array(z.string()),
  body: z.string(),
  defaultBody: z.string(),
  /** Falso quando o texto em uso é o original. */
  isCustomized: z.boolean(),
});
export type WhatsappTemplate = z.infer<typeof whatsappTemplateSchema>;

const templateBodySchema = z
  .string()
  .trim()
  .min(1, 'Escreva o texto da mensagem')
  .max(
    WHATSAPP_TEMPLATE_MAX_LENGTH,
    `O texto pode ter até ${WHATSAPP_TEMPLATE_MAX_LENGTH} caracteres`,
  );

/**
 * O contrato de salvar um texto. A regra das variáveis depende de QUAL mensagem é, e por isso
 * o schema nasce da chave: a tela e a API montam o mesmo, e o erro embaixo do campo é o que a
 * API devolveria.
 */
export function updateWhatsappTemplateSchemaFor(key: WhatsappTemplateKey) {
  return z.object({
    body: templateBodySchema.superRefine((body, ctx) => {
      const unknown = unknownTemplateVariables(key, body);
      if (unknown.length === 0) return;

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Estas variáveis não existem para esta mensagem: ${unknown.map((name) => `{{${name}}}`).join(', ')}`,
      });
    }),
  });
}

/** A forma do corpo, sem a regra por chave — é o que a documentação da API mostra. */
export const updateWhatsappTemplateSchema = z.object({ body: templateBodySchema });
export type UpdateWhatsappTemplateInput = z.infer<typeof updateWhatsappTemplateSchema>;
