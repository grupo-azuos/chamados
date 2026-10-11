import { describe, expect, it } from 'vitest';

import {
  isWhatsappTemplateKey,
  renderWhatsappTemplate,
  templateVariablesIn,
  unknownTemplateVariables,
  WHATSAPP_TEMPLATE_KEYS,
  WHATSAPP_TEMPLATE_MAX_LENGTH,
  WHATSAPP_TEMPLATES,
} from './whatsapp-template.util';

describe('renderWhatsappTemplate', () => {
  // feliz
  it('fills the variables of the text', () => {
    expect(
      renderWhatsappTemplate('Olá, {{nome}}! Chamado *{{protocolo}}*.', {
        nome: 'Bia',
        protocolo: 'CH-0007',
      }),
    ).toBe('Olá, Bia! Chamado *CH-0007*.');
  });

  it('accepts spaces inside the braces and repeats a variable', () => {
    expect(renderWhatsappTemplate('{{ nome }} e {{nome}}', { nome: 'Bia' })).toBe('Bia e Bia');
  });

  // triste
  /* Nunca "undefined" nem a chave crua numa mensagem para uma pessoa de verdade. */
  it('puts a dash where a known variable has no value', () => {
    expect(renderWhatsappTemplate('Solução: {{solucao}}', { solucao: null })).toBe('Solução: —');
    expect(renderWhatsappTemplate('Solução: {{solucao}}', { solucao: '   ' })).toBe('Solução: —');
  });

  it('leaves a variable that does not exist exactly as written', () => {
    expect(renderWhatsappTemplate('Olá {{var}}', { nome: 'Bia' })).toBe('Olá {{var}}');
  });
});

describe('unknownTemplateVariables', () => {
  // feliz
  it('finds nothing wrong in every default text', () => {
    for (const key of WHATSAPP_TEMPLATE_KEYS) {
      expect(unknownTemplateVariables(key, WHATSAPP_TEMPLATES[key].defaultBody)).toEqual([]);
      expect(WHATSAPP_TEMPLATES[key].defaultBody.length).toBeLessThanOrEqual(
        WHATSAPP_TEMPLATE_MAX_LENGTH,
      );
    }
  });

  // triste
  it('names the variables that do not exist for that message', () => {
    expect(unknownTemplateVariables('ticket_ready', 'Oi {{nome}}, {{var}} e {{protocol}}')).toEqual(
      ['var', 'protocol'],
    );
  });

  /* A solução só existe quando o chamado ficou pronto: não vale na mensagem de abertura. */
  it('refuses a variable that belongs to another message', () => {
    expect(unknownTemplateVariables('ticket_opened', '{{solucao}}')).toEqual(['solucao']);
  });

  it('treats empty braces as an unknown variable (edge case)', () => {
    expect(unknownTemplateVariables('ticket_ready', 'Oi {{}}')).toEqual(['']);
  });
});

describe('templateVariablesIn', () => {
  // feliz
  it('lists each variable once, in order', () => {
    expect(templateVariablesIn('{{b}} {{a}} {{b}}')).toEqual(['b', 'a']);
  });

  // triste
  it('finds none in plain text', () => {
    expect(templateVariablesIn('Olá, tudo bem?')).toEqual([]);
  });
});

describe('isWhatsappTemplateKey', () => {
  // feliz
  it('knows the keys of the catalog', () => {
    expect(isWhatsappTemplateKey('ticket_ready')).toBe(true);
  });

  // triste
  it('refuses anything else', () => {
    expect(isWhatsappTemplateKey('ticket_deleted')).toBe(false);
    expect(isWhatsappTemplateKey(undefined)).toBe(false);
  });
});
