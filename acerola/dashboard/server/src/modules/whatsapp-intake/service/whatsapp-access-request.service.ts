import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  type AccessRequestDraft,
  type AccessRequestProject,
  type AccessRequestStep,
  accessRequestDescription,
  departmentOptionsText,
  emptyAccessRequest,
  fillAccessRequestStep,
  isAccessRequestCancel,
  isAccessRequestCommand,
  nextAccessRequestStep,
  projectOptionsText,
} from '@template/shared/domain/access-request.util';
import { invitePhoneForForm } from '@template/shared/domain/ticket-invite.util';
import { formatTicketProtocol } from '@template/shared/domain/ticket-protocol.util';
import { type WhatsappTemplateKey } from '@template/shared/domain/whatsapp-template.util';

import { type Env } from '../../../lib/config/env.schema';
import { ENV } from '../../../lib/config/env.token';
import { TicketAssigneesService } from '../../tickets/service/ticket-assignees.service';
import { ticketAccessLink } from '../../tickets/service/ticket-whatsapp-notifier.service';
import { TicketsService } from '../../tickets/service/tickets.service';
import { WhatsappMessagingService } from '../../whatsapp/service/whatsapp-messaging.service';
import type { InboundMessage, InboundReply } from './whatsapp-intake.service';

type Conversation = {
  userId: string;
  attendantName: string;
  /* Só quem atende a área de Sistema vira responsável; senão o pedido nasce sem responsável,
     e a equipe de Sistema o pega na fila. */
  assigneeId: string | undefined;
  draft: AccessRequestDraft;
  expiresAt: number;
};

const SILENCE: InboundReply = { reply: null, isOpen: false };

/* Quanto tempo o bot espera cada resposta. O mesmo prazo que o bot dá à conversa aberta: depois
   disso, o que a pessoa escrever volta a ser conversa comum. */
const CONVERSATION_TTL_MS = 15 * 60 * 1000;

const QUESTION_TEMPLATES: Record<AccessRequestStep, WhatsappTemplateKey> = {
  name: 'access_name',
  email: 'access_email',
  phone: 'access_phone',
  department: 'access_department',
  system: 'access_system',
};

/**
 * PEDIDO DE ACESSO PELO WHATSAPP (`/acesso`).
 *
 * O bot pergunta um campo por mensagem e, com tudo respondido, abre um chamado na área de
 * Sistema, tipo "Pedido de acesso". A regra de cada resposta mora em `access-request.util`;
 * aqui fica a conversa: guardar o rascunho, mandar a próxima pergunta e criar o chamado.
 *
 * O estado fica em memória, como era o formulário do `/chamado`: é curto (minutos) e o sistema
 * roda numa instância só. Perder num reinício custa a pessoa mandar `/acesso` de novo.
 */
@Injectable()
export class WhatsappAccessRequestService {
  private readonly logger = new Logger(WhatsappAccessRequestService.name);
  private readonly conversations = new Map<string, Conversation>();

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly assignees: TicketAssigneesService,
    private readonly tickets: TicketsService,
    private readonly messaging: WhatsappMessagingService,
  ) {}

  /** Se a mensagem é desta conversa: o próprio comando, ou uma resposta a um pedido em aberto. */
  isFor(message: InboundMessage, now: number): boolean {
    if (isAccessRequestCommand(message.text)) return true;

    return (this.conversations.get(keyOf(message))?.expiresAt ?? 0) > now;
  }

  /** Esquece o pedido em aberto daquela conversa — a pessoa mudou de assunto (ex.: `/chamado`). */
  forget(message: InboundMessage): void {
    this.conversations.delete(keyOf(message));
  }

  async handle(userId: string, message: InboundMessage, now: number): Promise<InboundReply> {
    const key = keyOf(message);
    if (isAccessRequestCommand(message.text)) return this.start(userId, key, message, now);

    const conversation = this.conversations.get(key);
    if (!conversation || conversation.expiresAt <= now || isAccessRequestCancel(message.text)) {
      this.conversations.delete(key);

      return SILENCE;
    }

    return this.answer(key, conversation, message, now);
  }

  private async start(
    userId: string,
    key: string,
    message: InboundMessage,
    now: number,
  ): Promise<InboundReply> {
    const attendant = await this.assignees.areasOf(userId);
    /* Vinculou o número mas não administra mais nenhuma área: não há chamado para abrir com ele. */
    if (!attendant || attendant.areas.length === 0) return SILENCE;

    /* Sem sistema que aceite chamado, o pedido não teria como terminar: melhor nem começar. */
    if ((await this.tickets.listSystemProjectOptions()).length === 0) {
      this.logger.warn('access request ignored: no software project accepts tickets');

      return SILENCE;
    }

    const conversation: Conversation = {
      userId,
      attendantName: attendant.name,
      assigneeId: attendant.areas.includes('sistema') ? userId : undefined,
      draft: emptyAccessRequest(message.phone),
      expiresAt: now + CONVERSATION_TTL_MS,
    };

    return this.ask(key, conversation, message, 'name');
  }

  private async answer(
    key: string,
    conversation: Conversation,
    message: InboundMessage,
    now: number,
  ): Promise<InboundReply> {
    /* Rascunho completo não fica guardado (ele vira chamado na hora); isto é só a garantia. */
    const step = nextAccessRequestStep(conversation.draft);
    if (!step) return SILENCE;

    const projects = await this.tickets.listSystemProjectOptions();
    const filled = fillAccessRequestStep(conversation.draft, step, message.text, projects);
    const refreshed = { ...conversation, expiresAt: now + CONVERSATION_TTL_MS };
    if (!filled.ok)
      return this.say(key, refreshed, message, 'access_invalid', { erro: filled.error });

    const next = { ...refreshed, draft: filled.draft };
    const nextStep = nextAccessRequestStep(filled.draft);
    if (!nextStep) return this.finish(key, next, message);

    return this.ask(key, next, message, nextStep, projects);
  }

  private async ask(
    key: string,
    conversation: Conversation,
    message: InboundMessage,
    step: AccessRequestStep,
    projects?: readonly AccessRequestProject[],
  ): Promise<InboundReply> {
    return this.say(key, conversation, message, QUESTION_TEMPLATES[step], {
      responsavel: conversation.attendantName,
      nome: firstName(conversation.draft.requesterName),
      opcoes: await this.optionsFor(step, projects),
    });
  }

  private async optionsFor(
    step: AccessRequestStep,
    projects?: readonly AccessRequestProject[],
  ): Promise<string> {
    if (step === 'department') return departmentOptionsText();
    if (step !== 'system') return '';

    return projectOptionsText(projects ?? (await this.tickets.listSystemProjectOptions()));
  }

  private async finish(
    key: string,
    conversation: Conversation,
    message: InboundMessage,
  ): Promise<InboundReply> {
    this.conversations.delete(key);

    const ticket = await this.createTicket(conversation);
    if (!ticket) return SILENCE;

    const reply = await this.messaging.reply({
      senderUserId: conversation.userId,
      recipient: message.phone ?? message.chatId,
      kind: 'access_created',
      ticketId: ticket.id,
      values: {
        nome: firstName(ticket.requesterName),
        protocolo: formatTicketProtocol(ticket.id),
        sistema: conversation.draft.project?.name ?? '',
        link: ticketAccessLink(ticket.id, this.env),
      },
    });

    return { reply, isOpen: false };
  }

  private async createTicket(
    conversation: Conversation,
  ): Promise<{ id: number; requesterName: string } | null> {
    const { requesterName, email, phone, department, project } = conversation.draft;
    if (!requesterName || !email || !phone || !department || !project) return null;

    const contactPhone = invitePhoneForForm(phone);

    return this.tickets
      .create(
        {
          requesterName,
          area: 'sistema',
          department,
          problemType: 'access_request',
          priority: 'medium',
          contactPhone,
          /* Quem pediu pela conversa já está no WhatsApp: é por lá que quer saber do acesso. */
          notifyWhatsapp: true,
          description: accessRequestDescription({
            requesterName,
            email,
            phone: contactPhone,
            projectName: project.name,
          }),
          projectId: project.id,
          assigneeId: conversation.assigneeId,
        },
        undefined,
        [],
        /* A confirmação já vai na própria conversa (`access_created`). */
        { skipOpeningNotice: true },
      )
      .catch((error: unknown) => {
        this.logger.error(
          'failed to create access request from WhatsApp',
          error instanceof Error ? error.stack : '',
        );

        return null;
      });
  }

  /* Uma resposta do bot: reserva no limite do dia, guarda o estado e mantém a conversa aberta.
     Sem espaço no limite, o bot se cala e a conversa fecha. */
  private async say(
    key: string,
    conversation: Conversation,
    message: InboundMessage,
    kind: WhatsappTemplateKey,
    values: Record<string, string>,
  ): Promise<InboundReply> {
    const text = await this.messaging.reply({
      senderUserId: conversation.userId,
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
}

/* De qual número vinculado e de qual conversa — o mesmo par que o bot usa. */
function keyOf(message: InboundMessage): string {
  return `${message.sessionId}:${message.chatId}`;
}

/* As mensagens chamam a pessoa pelo primeiro nome: "Obrigado, Maria!", não o nome inteiro. */
function firstName(name: string | null): string {
  return name?.split(' ')[0] ?? '';
}
