/**
 * OS TEXTOS DO BOT DE WHATSAPP.
 *
 * Cada mensagem que o bot manda é um MODELO: um texto com variáveis entre chaves duplas
 * (`{{protocolo}}`) que o sistema preenche na hora de enviar. O super admin edita o texto em
 * volta; as variáveis são uma lista fixa por mensagem, porque só o sistema sabe quais dados
 * existem naquele momento.
 *
 * A formatação é a do próprio WhatsApp: `*negrito*`, `_itálico_`, `~riscado~`.
 */
export const WHATSAPP_TEMPLATE_KEYS = [
  'ticket_opened',
  'ticket_ready',
  'intake_area',
  'intake_form',
  'intake_invalid',
  'intake_created',
  'limit_alert',
] as const;

export type WhatsappTemplateKey = (typeof WHATSAPP_TEMPLATE_KEYS)[number];

export type WhatsappTemplateDefinition = {
  /** Como a tela chama esta mensagem. */
  label: string;
  /** Quando ela é enviada, numa frase. */
  description: string;
  variables: readonly string[];
  defaultBody: string;
};

export const WHATSAPP_TEMPLATES: Record<WhatsappTemplateKey, WhatsappTemplateDefinition> = {
  ticket_opened: {
    label: 'Chamado aberto',
    description: 'Enviada a quem abriu o chamado pelo site, pelo número do responsável.',
    variables: ['nome', 'protocolo', 'area', 'responsavel', 'link'],
    defaultBody:
      'Olá, {{nome}}! Aqui é {{responsavel}}.\n\nRecebi o seu chamado *{{protocolo}}* ({{area}}) e já estou com ele.\n\nAcompanhe por aqui: {{link}}',
  },
  ticket_ready: {
    label: 'Chamado pronto',
    description: 'Enviada quando quem atende clica em avisar que o chamado ficou pronto.',
    variables: ['nome', 'protocolo', 'area', 'responsavel', 'solucao', 'link'],
    defaultBody:
      'Olá, {{nome}}! O seu chamado *{{protocolo}}* foi finalizado.\n\n*Solução:* {{solucao}}\n\nDetalhes: {{link}}',
  },
  intake_area: {
    label: 'Pergunta de área',
    description:
      'Primeira resposta ao /chamado quando o responsável atende mais de uma área. {{opcoes}} é a lista numerada.',
    variables: ['responsavel', 'opcoes'],
    defaultBody:
      'Olá! Aqui é o atendimento de *{{responsavel}}*.\n\nSobre o que é o chamado? Responda só com o *número*:\n\n{{opcoes}}\n\n> _Para desistir, envie *cancelar*._',
  },
  intake_form: {
    label: 'Formulário do chamado',
    description:
      'O formulário que a pessoa copia, preenche e devolve. {{formulario}} são os campos, com as opções numeradas.',
    variables: ['responsavel', 'area', 'formulario'],
    defaultBody:
      'Para abrir um chamado de *{{area}}* com {{responsavel}}, copie esta mensagem, preencha depois dos dois-pontos e envie:\n\n{{formulario}}\n\n> _Para desistir, envie *cancelar*._',
  },
  intake_invalid: {
    label: 'Formulário com erro',
    description: 'Enviada quando o formulário voltou incompleto. {{erros}} é a lista do que falta.',
    variables: ['erros'],
    defaultBody:
      'Quase lá! Não consegui abrir o chamado porque:\n\n{{erros}}\n\nCorrija e envie o formulário de novo.',
  },
  intake_created: {
    label: 'Chamado criado pela conversa',
    description: 'Confirmação depois que o formulário é aceito.',
    variables: ['nome', 'protocolo', 'area', 'responsavel', 'link'],
    defaultBody:
      'Pronto, {{nome}}! O chamado *{{protocolo}}* ({{area}}) foi aberto com {{responsavel}}.\n\nAcompanhe por aqui: {{link}}',
  },
  limit_alert: {
    label: 'Alerta de limite',
    description:
      'Enviada ao próprio responsável quando as mensagens do dia chegam perto do limite seguro.',
    variables: ['enviadas', 'limite'],
    defaultBody:
      '⚠️ *Acerola Ticket:* o seu número já enviou {{enviadas}} de {{limite}} mensagens automáticas hoje. Ao chegar no limite, o sistema para de enviar por você até amanhã.',
  },
};

export function isWhatsappTemplateKey(value: unknown): value is WhatsappTemplateKey {
  return (WHATSAPP_TEMPLATE_KEYS as readonly unknown[]).includes(value);
}

/** O teto do WhatsApp é bem maior; este é o de uma mensagem que alguém ainda lê. */
export const WHATSAPP_TEMPLATE_MAX_LENGTH = 2000;

const VARIABLE_PATTERN = /\{\{\s*([^{}]*?)\s*\}\}/g;

/** As variáveis que um texto usa, na ordem em que aparecem e sem repetir. */
export function templateVariablesIn(body: string): string[] {
  return [...new Set([...body.matchAll(VARIABLE_PATTERN)].map((match) => match[1] ?? ''))];
}

/**
 * As variáveis do texto que NÃO existem para aquela mensagem.
 *
 * É o que impede um `{{protocol}}` digitado errado de sair cru numa mensagem de verdade: a
 * tela recusa o salvamento e diz qual é.
 */
export function unknownTemplateVariables(key: WhatsappTemplateKey, body: string): string[] {
  const allowed = WHATSAPP_TEMPLATES[key].variables;

  return templateVariablesIn(body).filter((variable) => !allowed.includes(variable));
}

/**
 * O texto final. Variável sem valor vira um traço — nunca a chave crua, nem "undefined".
 * Variável que não existe para a mensagem fica como está: quem valida isso é o salvamento.
 */
export function renderWhatsappTemplate(
  body: string,
  values: Readonly<Record<string, string | null | undefined>>,
): string {
  return body.replace(VARIABLE_PATTERN, (whole, name: string) => {
    if (!(name in values)) return whole;

    return values[name]?.trim() || '—';
  });
}
