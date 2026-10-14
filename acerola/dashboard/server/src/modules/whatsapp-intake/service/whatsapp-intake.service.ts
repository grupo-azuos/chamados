import { Inject, Injectable } from '@nestjs/common';
import {
  TICKET_INVITE_PARAM,
  TICKET_INVITE_TTL_MINUTES,
} from '@template/shared/domain/ticket-invite.util';

import { type Env } from '../../../lib/config/env.schema';
import { ENV } from '../../../lib/config/env.token';
import { TicketAssigneesService } from '../../tickets/service/ticket-assignees.service';
import { signTicketInvite } from '../../tickets/service/ticket-invite.util';
import { WhatsappConnectionsRepository } from '../../whatsapp/repository/whatsapp-connections.repository';
import { botSessionId } from '../../whatsapp/service/bot-client.service';
import { WhatsappMessagingService } from '../../whatsapp/service/whatsapp-messaging.service';
import { WhatsappInboundMessagesRepository } from '../repository/whatsapp-inbound-messages.repository';
import { WhatsappAccessRequestService } from './whatsapp-access-request.service';

/**
 * O que o bot manda: de qual número vinculado, de qual conversa, o texto, o telefone de quem
 * escreveu e o identificador da mensagem no WhatsApp (nulo num bot antigo, que não o envia).
 */
export type InboundMessage = {
  sessionId: string;
  chatId: string;
  text: string;
  phone: string | null;
  messageId?: string | null;
};

/**
 * O que o servidor responde: o texto a enviar (ou nulo para silêncio) e se a conversa continua
 * ABERTA. A resposta ao `/chamado` é um link e fecha na hora; o pedido de acesso (`/acesso`)
 * fica aberto enquanto o bot espera a próxima resposta. É este campo que diz ao bot se deve
 * encaminhar a próxima mensagem.
 *
 * `isDuplicate`: a mensagem já tinha chegado. O bot não responde e não mexe na conversa —
 * fechá-la por causa de uma entrega repetida largaria a pessoa no meio do pedido.
 */
export type InboundReply = { reply: string | null; isOpen: boolean; isDuplicate?: boolean };

export const TICKET_COMMAND = '/chamado';

const SILENCE: InboundReply = { reply: null, isOpen: false };
const DUPLICATE: InboundReply = { reply: null, isOpen: false, isDuplicate: true };
const SECONDS_PER_MINUTE = 60;

/**
 * ABRIR CHAMADO A PARTIR DO WHATSAPP.
 *
 * Quem manda `/chamado` para o número de um responsável recebe UM link, assinado, que abre o
 * formulário de sempre já sabendo com quem a pessoa quer falar e qual é o telefone dela. O
 * chamado é preenchido na tela — com campos de escolha, validação e anexo —, e não digitado
 * na conversa.
 *
 * É uma mensagem só do bot por chamado: cada mensagem automática a menos é um passo a menos
 * na direção de o WhatsApp bloquear o número, que é o pessoal de quem atende.
 */
@Injectable()
export class WhatsappIntakeService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly connections: WhatsappConnectionsRepository,
    private readonly assignees: TicketAssigneesService,
    private readonly messaging: WhatsappMessagingService,
    private readonly accessRequests: WhatsappAccessRequestService,
    private readonly inbox: WhatsappInboundMessagesRepository,
  ) {}

  async handle(message: InboundMessage, now: number = Date.now()): Promise<InboundReply> {
    if (!(await this.isFirstDelivery(message, now))) return DUPLICATE;

    if (message.text.trim().toLowerCase() === TICKET_COMMAND) {
      /* `/chamado` no meio de um pedido de acesso é mudar de assunto: o pedido é esquecido. */
      await this.accessRequests.forget(message);

      return this.sendLink(message, now);
    }
    if (await this.accessRequests.isFor(message, now)) {
      return this.handleAccessRequest(message, now);
    }

    return SILENCE;
  }

  /* A caixa de entrada: a mesma mensagem entregue de novo pelo WhatsApp não é lida duas vezes.
     Sem identificador (bot antigo), não há como saber — e ela passa. */
  private async isFirstDelivery(message: InboundMessage, now: number): Promise<boolean> {
    if (!message.messageId) return true;

    return this.inbox.claim(message.sessionId, message.messageId, new Date(now));
  }

  /* A resposta ao `/chamado`: um link assinado para o formulário. */
  private async sendLink(message: InboundMessage, now: number): Promise<InboundReply> {
    const userId = await this.userOf(message.sessionId);
    const secret = this.env.BOT_API_TOKEN;
    if (!userId || !secret) return SILENCE;

    const attendant = await this.assignees.areasOf(userId);
    /* Vinculou o número mas não administra mais nenhuma área: não há chamado para abrir com ele. */
    if (!attendant || attendant.areas.length === 0) return SILENCE;

    const expiresAt = Math.floor(now / 1000) + TICKET_INVITE_TTL_MINUTES * SECONDS_PER_MINUTE;
    const token = signTicketInvite({ assigneeId: userId, phone: message.phone, expiresAt }, secret);

    const reply = await this.messaging.reply({
      senderUserId: userId,
      recipient: message.phone ?? message.chatId,
      kind: 'intake_link',
      ticketId: null,
      values: {
        responsavel: attendant.name,
        link: `${this.publicUrl()}/support?${TICKET_INVITE_PARAM}=${token}`,
        validade: String(TICKET_INVITE_TTL_MINUTES),
      },
    });

    return { reply, isOpen: false };
  }

  private async handleAccessRequest(message: InboundMessage, now: number): Promise<InboundReply> {
    const userId = await this.userOf(message.sessionId);
    if (!userId) return SILENCE;

    return this.accessRequests.handle(userId, message, now);
  }

  /* O bot só conhece o hash do id de cada pessoa (ver `botSessionId`): aqui ele volta a ser o id. */
  private async userOf(sessionId: string): Promise<string | null> {
    const linked = await this.connections.list();

    return (
      linked.find((connection) => botSessionId(connection.userId) === sessionId)?.userId ?? null
    );
  }

  private publicUrl(): string {
    const base = this.env.APP_PUBLIC_URL ?? this.env.API_CORS_ORIGIN.split(',')[0]?.trim() ?? '';

    return base.replace(/\/+$/, '');
  }
}
