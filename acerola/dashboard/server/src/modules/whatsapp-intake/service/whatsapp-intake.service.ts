import { Inject, Injectable, Logger } from '@nestjs/common';
import { ticketAreaLabel, type TicketArea } from '@template/shared/domain/ticket-catalog.util';
import { formatTicketProtocol } from '@template/shared/domain/ticket-protocol.util';
import {
  buildAreaOptions,
  buildIntakeForm,
  type IntakeContext,
  parseAreaChoice,
  parseIntakeReply,
} from '@template/shared/domain/whatsapp-intake.util';
import { type WhatsappTemplateKey } from '@template/shared/domain/whatsapp-template.util';

import { type Env } from '../../../lib/config/env.schema';
import { ENV } from '../../../lib/config/env.token';
import { TicketAssigneesService } from '../../tickets/service/ticket-assignees.service';
import { TicketsService } from '../../tickets/service/tickets.service';
import { WhatsappConnectionsRepository } from '../../whatsapp/repository/whatsapp-connections.repository';
import { botSessionId } from '../../whatsapp/service/bot-client.service';
import { WhatsappMessagingService } from '../../whatsapp/service/whatsapp-messaging.service';

/** O que o bot manda: de qual número vinculado, de qual conversa, o texto e o telefone de quem escreveu. */
export type InboundMessage = {
  sessionId: string;
  chatId: string;
  text: string;
  phone: string | null;
};

/**
 * O que o servidor responde: o texto a enviar (ou nulo para silêncio) e se a conversa continua
 * ABERTA. Enquanto está aberta, o bot encaminha as próximas mensagens daquela conversa; fechada,
 * volta a encaminhar só o comando.
 */
export type InboundReply = { reply: string | null; isOpen: boolean };

type Conversation = {
  step: 'area' | 'form';
  areas: TicketArea[];
  area: TicketArea | null;
  expiresAt: number;
};

export const TICKET_COMMAND = '/chamado';
const CANCEL_WORDS = ['cancelar', '/cancelar'];
/* Quanto tempo o bot espera a pessoa devolver o formulário. Depois disso a conversa fecha
   sozinha, e o que ela escrever volta a ser conversa comum. */
const CONVERSATION_TTL_MS = 15 * 60 * 1000;

const SILENCE: InboundReply = { reply: null, isOpen: false };

/**
 * ABRIR CHAMADO POR CONVERSA.
 *
 * Quem manda `/chamado` para o número de um responsável recebe o formulário, devolve
 * preenchido e o chamado nasce já com aquele responsável. Quem atende uma área só abre
 * chamado dela; quem atende várias (ou é super admin) primeiro pergunta de qual.
 *
 * O estado da conversa fica em memória: é curto (minutos) e o sistema roda numa instância só.
 * Perder num reinício custa a pessoa mandar `/chamado` de novo.
 */
@Injectable()
export class WhatsappIntakeService {
  private readonly logger = new Logger(WhatsappIntakeService.name);
  private readonly conversations = new Map<string, Conversation>();

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly connections: WhatsappConnectionsRepository,
    private readonly assignees: TicketAssigneesService,
    private readonly tickets: TicketsService,
    private readonly messaging: WhatsappMessagingService,
  ) {}

  async handle(message: InboundMessage, now: number = Date.now()): Promise<InboundReply> {
    const userId = await this.userOf(message.sessionId);
    if (!userId) return SILENCE;

    const key = `${userId}:${message.chatId}`;
    const text = message.text.trim();
    if (text.toLowerCase() === TICKET_COMMAND) return this.start(userId, key, message, now);

    const conversation = this.conversations.get(key);
    if (
      !conversation ||
      conversation.expiresAt < now ||
      CANCEL_WORDS.includes(text.toLowerCase())
    ) {
      this.conversations.delete(key);

      return SILENCE;
    }

    return conversation.step === 'area'
      ? this.chooseArea(userId, key, conversation, message, now)
      : this.submit(userId, key, conversation, message);
  }

  /* O bot só conhece o hash do id de cada pessoa (ver `botSessionId`): aqui ele volta a ser o id. */
  private async userOf(sessionId: string): Promise<string | null> {
    const linked = await this.connections.list();

    return (
      linked.find((connection) => botSessionId(connection.userId) === sessionId)?.userId ?? null
    );
  }

  private async start(
    userId: string,
    key: string,
    message: InboundMessage,
    now: number,
  ): Promise<InboundReply> {
    const attendant = await this.assignees.areasOf(userId);
    const [onlyArea] = attendant?.areas ?? [];
    /* Vinculou o número mas não administra mais nenhuma área: não há chamado para abrir com ele. */
    if (!attendant || !onlyArea) return SILENCE;

    const conversation: Conversation = {
      step: 'area',
      areas: attendant.areas,
      area: null,
      expiresAt: now + CONVERSATION_TTL_MS,
    };

    if (attendant.areas.length === 1)
      return this.sendForm(userId, key, conversation, onlyArea, message);

    return this.say(userId, key, conversation, message, 'intake_area', {
      responsavel: attendant.name,
      opcoes: buildAreaOptions(attendant.areas),
    });
  }

  private async chooseArea(
    userId: string,
    key: string,
    conversation: Conversation,
    message: InboundMessage,
    now: number,
  ): Promise<InboundReply> {
    const area = parseAreaChoice(message.text, conversation.areas);
    const refreshed = { ...conversation, expiresAt: now + CONVERSATION_TTL_MS };
    if (area) return this.sendForm(userId, key, refreshed, area, message);

    const attendant = await this.assignees.areasOf(userId);

    return this.say(userId, key, refreshed, message, 'intake_area', {
      responsavel: attendant?.name ?? '',
      opcoes: buildAreaOptions(conversation.areas),
    });
  }

  private async sendForm(
    userId: string,
    key: string,
    conversation: Conversation,
    area: TicketArea,
    message: InboundMessage,
  ): Promise<InboundReply> {
    const attendant = await this.assignees.areasOf(userId);
    const context = await this.contextFor(area, message.phone);

    return this.say(userId, key, { ...conversation, step: 'form', area }, message, 'intake_form', {
      responsavel: attendant?.name ?? '',
      area: ticketAreaLabel(area),
      formulario: buildIntakeForm(context),
    });
  }

  private async submit(
    userId: string,
    key: string,
    conversation: Conversation,
    message: InboundMessage,
  ): Promise<InboundReply> {
    const area = conversation.area ?? conversation.areas[0];
    if (!area) return SILENCE;

    const parsed = parseIntakeReply(message.text, await this.contextFor(area, message.phone));
    if (!parsed.ok) {
      return this.say(userId, key, conversation, message, 'intake_invalid', {
        erros: parsed.errors.map((error) => `• ${error}`).join('\n'),
      });
    }

    const ticket = await this.tickets
      .create(
        {
          ...parsed.data,
          area,
          priority: 'medium',
          /* Quem abriu pela conversa já está falando por WhatsApp: é por lá que quer o aviso. */
          notifyWhatsapp: true,
          assigneeId: userId,
          projectId: parsed.data.projectId,
        },
        undefined,
        [],
        /* A confirmação já vai na própria conversa (`intake_created`). */
        { skipOpeningNotice: true },
      )
      .catch((error: unknown) => {
        this.logger.error(
          'failed to create ticket from WhatsApp',
          error instanceof Error ? error.stack : '',
        );

        return null;
      });
    this.conversations.delete(key);
    if (!ticket) return SILENCE;

    const text = await this.messaging.reply({
      senderUserId: userId,
      recipient: message.phone ?? message.chatId,
      kind: 'intake_created',
      ticketId: ticket.id,
      values: {
        nome: ticket.requesterName,
        protocolo: formatTicketProtocol(ticket.id),
        area: ticketAreaLabel(area),
        responsavel: ticket.assignee,
        link: `${this.publicUrl()}/support`,
      },
    });

    return { reply: text, isOpen: false };
  }

  /* Uma resposta do bot: reserva no limite do dia, guarda o estado e mantém a conversa aberta.
     Sem espaço no limite, o bot se cala e a conversa fecha. */
  private async say(
    userId: string,
    key: string,
    conversation: Conversation,
    message: InboundMessage,
    kind: WhatsappTemplateKey,
    values: Record<string, string>,
  ): Promise<InboundReply> {
    const text = await this.messaging.reply({
      senderUserId: userId,
      recipient: message.phone ?? message.chatId,
      kind,
      ticketId: null,
      values,
    });
    if (!text) {
      this.conversations.delete(key);

      return SILENCE;
    }

    this.conversations.set(key, conversation);

    return { reply: text, isOpen: true };
  }

  private async contextFor(area: TicketArea, phone: string | null): Promise<IntakeContext> {
    const projects = area === 'sistema' ? await this.tickets.listSystemProjectOptions() : [];

    return { area, projects, phone };
  }

  private publicUrl(): string {
    const base = this.env.APP_PUBLIC_URL ?? this.env.API_CORS_ORIGIN.split(',')[0]?.trim() ?? '';

    return base.replace(/\/+$/, '');
  }
}
