import { describe, expect, it } from 'vitest';

import { updateWhatsappTemplateSchemaFor } from './whatsapp-template.schema';

describe('updateWhatsappTemplateSchemaFor', () => {
  // feliz
  it('accepts a text that only uses the variables of that message', () => {
    const result = updateWhatsappTemplateSchemaFor('ticket_ready').safeParse({
      body: '  Olá {{nome}}, o chamado *{{protocolo}}* foi finalizado.  ',
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.body).toBe(
      'Olá {{nome}}, o chamado *{{protocolo}}* foi finalizado.',
    );
  });

  // triste
  it('refuses an unknown variable and says which one', () => {
    const result = updateWhatsappTemplateSchemaFor('ticket_ready').safeParse({
      body: 'Olá {{var}}',
    });

    expect(result.success).toBe(false);
    expect(!result.success && result.error.issues[0]?.message).toContain('{{var}}');
  });

  it('refuses an empty text and a text that is too long', () => {
    const schema = updateWhatsappTemplateSchemaFor('ticket_opened');

    expect(schema.safeParse({ body: '   ' }).success).toBe(false);
    expect(schema.safeParse({ body: 'x'.repeat(2001) }).success).toBe(false);
  });
});
