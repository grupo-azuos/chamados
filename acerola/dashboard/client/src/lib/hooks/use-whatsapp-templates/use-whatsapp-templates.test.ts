import {
  WHATSAPP_TEMPLATE_KEYS,
  WHATSAPP_TEMPLATES,
} from '@template/shared/domain/whatsapp-template.util';
import { type WhatsappTemplate } from '@template/shared/schemas/whatsapp-template.schema';
import { describe, expect, it } from 'vitest';

import { draftProblemOf, TEMPLATE_PREVIEW_VALUES } from './use-whatsapp-templates.svelte';

const template: WhatsappTemplate = {
  key: 'ticket_ready',
  label: 'Chamado pronto',
  description: '',
  variables: [...WHATSAPP_TEMPLATES.ticket_ready.variables],
  body: WHATSAPP_TEMPLATES.ticket_ready.defaultBody,
  defaultBody: WHATSAPP_TEMPLATES.ticket_ready.defaultBody,
  isCustomized: false,
};

describe('draftProblemOf', () => {
  // feliz
  it('finds no problem in a text that only uses the variables of the message', () => {
    expect(
      draftProblemOf(template, 'Olá {{nome}}, o chamado *{{protocolo}}* foi finalizado.'),
    ).toBeNull();
  });

  // triste
  it('names the variable that does not exist', () => {
    expect(draftProblemOf(template, 'Olá {{var}}')).toContain('{{var}}');
  });

  it('refuses an empty text and a text that is too long', () => {
    expect(draftProblemOf(template, '   ')).toBe('Escreva o texto da mensagem.');
    expect(draftProblemOf(template, 'x'.repeat(2001))).toContain('2000');
  });

  it('has nothing to say while no message is selected (edge case)', () => {
    expect(draftProblemOf(null, '{{var}}')).toBeNull();
  });
});

describe('TEMPLATE_PREVIEW_VALUES', () => {
  // feliz
  /* Toda variável de toda mensagem precisa de um valor de exemplo, senão a prévia mostra a chave crua. */
  it('has a sample for every variable of every message', () => {
    for (const key of WHATSAPP_TEMPLATE_KEYS) {
      for (const variable of WHATSAPP_TEMPLATES[key].variables) {
        expect(TEMPLATE_PREVIEW_VALUES[variable], `${key}: ${variable}`).toBeTruthy();
      }
    }
  });
});
