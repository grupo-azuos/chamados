import { createHash } from 'node:crypto';

import {
  BadGatewayException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  type WhatsappLinkState,
  whatsappLinkStateSchema,
} from '@template/shared/schemas/whatsapp-connection.schema';
import { z } from 'zod';

import { type Env } from '../../../lib/config/env.schema';
import { ENV } from '../../../lib/config/env.token';

/** O que o bot responde sobre um vínculo. */
const botStatusSchema = z.object({
  state: whatsappLinkStateSchema,
  qr: z.string().nullable(),
  phone: z.string().nullable(),
});

export type BotStatus = { state: WhatsappLinkState; qr: string | null; phone: string | null };

/* O bot fica na mesma máquina ou na mesma rede interna: se não respondeu em poucos segundos,
   está fora do ar — e a tela não pode ficar pendurada esperando. */
const BOT_TIMEOUT_MS = 8000;

export const BOT_NOT_CONFIGURED_MESSAGE =
  'A integração com o WhatsApp ainda não foi configurada. Solicite a configuração ao administrador.';
export const BOT_UNAVAILABLE_MESSAGE =
  'Não consegui falar com o serviço de WhatsApp. Tente de novo em instantes.';

/**
 * A ÚNICA porta do servidor para o WhatsApp: tudo passa pela API HTTP do bot.
 *
 * O servidor não conhece o Baileys nem o protocolo do WhatsApp — só este contrato. É ele que
 * continua valendo no dia em que o bot passar a usar a API oficial.
 */
@Injectable()
export class BotClientService {
  constructor(@Inject(ENV) private readonly env: Env) {}

  get isConfigured(): boolean {
    return Boolean(this.env.BOT_API_URL && this.env.BOT_API_TOKEN);
  }

  status(userId: string): Promise<BotStatus> {
    return this.request(userId, 'GET', '').then(parseStatus);
  }

  link(userId: string): Promise<BotStatus> {
    return this.request(userId, 'POST', '/link').then(parseStatus);
  }

  async unlink(userId: string): Promise<void> {
    await this.request(userId, 'DELETE', '');
  }

  private async request(userId: string, method: string, action: string): Promise<unknown> {
    if (!this.isConfigured) throw new ServiceUnavailableException(BOT_NOT_CONFIGURED_MESSAGE);

    const url = `${this.env.BOT_API_URL!.replace(/\/+$/, '')}/sessions/${botSessionId(userId)}${action}`;
    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${this.env.BOT_API_TOKEN!}` },
      signal: AbortSignal.timeout(BOT_TIMEOUT_MS),
    }).catch(() => null);

    /* O motivo de verdade (rede, token recusado, erro do bot) não vai para a tela: ele não
       ajuda quem está no perfil e pode carregar detalhe interno. */
    if (!response?.ok) throw new BadGatewayException(BOT_UNAVAILABLE_MESSAGE);

    return response.status === 204 ? null : response.json().catch(() => null);
  }
}

function parseStatus(body: unknown): BotStatus {
  const status = botStatusSchema.safeParse(body);
  if (!status.success) throw new BadGatewayException(BOT_UNAVAILABLE_MESSAGE);

  return status.data;
}

/**
 * O nome da sessão no bot: o hash do id do usuário.
 *
 * O bot usa esse nome como pasta em disco e só aceita letras, números, `_` e `-`. O id que o
 * autenticador entrega não promete esse alfabeto; o hash sempre cabe, e de quebra o bot nunca
 * fica sabendo o id de ninguém.
 */
export function botSessionId(userId: string): string {
  return createHash('sha256').update(userId).digest('hex');
}
