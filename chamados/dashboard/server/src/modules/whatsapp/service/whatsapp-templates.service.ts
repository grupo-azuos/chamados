import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  isWhatsappTemplateKey,
  renderWhatsappTemplate,
  WHATSAPP_TEMPLATE_KEYS,
  WHATSAPP_TEMPLATES,
  type WhatsappTemplateKey,
} from '@template/shared/domain/whatsapp-template.util';
import {
  updateWhatsappTemplateSchemaFor,
  type WhatsappTemplate,
} from '@template/shared/schemas/whatsapp-template.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { assertIsSuperAdmin } from '../../../lib/policy/policy-assert.util';
import { WhatsappTemplatesRepository } from '../repository/whatsapp-templates.repository';

const WHAT = 'os textos do WhatsApp';

/**
 * Os textos do bot. Editar é do super admin: o texto sai pelo número pessoal de cada
 * responsável, em nome dele — não é algo que cada um ajusta para si.
 */
@Injectable()
export class WhatsappTemplatesService {
  constructor(private readonly repository: WhatsappTemplatesRepository) {}

  async list(user: RequestUser): Promise<WhatsappTemplate[]> {
    assertIsSuperAdmin(user.role, WHAT);

    const customized = new Map((await this.repository.list()).map((row) => [row.key, row.body]));

    return WHATSAPP_TEMPLATE_KEYS.map((key) => toTemplate(key, customized.get(key)));
  }

  async update(user: RequestUser, key: string, input: unknown): Promise<WhatsappTemplate> {
    assertIsSuperAdmin(user.role, WHAT);
    const templateKey = assertKnownKey(key);

    /* A regra das variáveis depende de qual mensagem é — por isso o contrato nasce da chave, e
       a recusa sai daqui com a frase pronta ("estas variáveis não existem…"). */
    const parsed = updateWhatsappTemplateSchemaFor(templateKey).safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException(
        parsed.error.issues[0]?.message ?? 'Confira o texto da mensagem.',
      );
    }

    await this.repository.save(templateKey, parsed.data.body, user.email);

    return toTemplate(templateKey, parsed.data.body);
  }

  async restore(user: RequestUser, key: string): Promise<WhatsappTemplate> {
    assertIsSuperAdmin(user.role, WHAT);
    const templateKey = assertKnownKey(key);

    await this.repository.remove(templateKey);

    return toTemplate(templateKey, undefined);
  }

  /** O texto final de uma mensagem, com as variáveis preenchidas. Sem permissão: é uso interno. */
  async render(
    key: WhatsappTemplateKey,
    values: Readonly<Record<string, string | null | undefined>>,
  ): Promise<string> {
    const body = (await this.repository.find(key))?.body ?? WHATSAPP_TEMPLATES[key].defaultBody;

    return renderWhatsappTemplate(body, values);
  }
}

function assertKnownKey(key: string): WhatsappTemplateKey {
  if (!isWhatsappTemplateKey(key)) throw new NotFoundException('Mensagem não encontrada.');

  return key;
}

function toTemplate(key: WhatsappTemplateKey, customBody: string | undefined): WhatsappTemplate {
  const definition = WHATSAPP_TEMPLATES[key];

  return {
    key,
    label: definition.label,
    description: definition.description,
    variables: [...definition.variables],
    body: customBody ?? definition.defaultBody,
    defaultBody: definition.defaultBody,
    isCustomized: customBody !== undefined,
  };
}
