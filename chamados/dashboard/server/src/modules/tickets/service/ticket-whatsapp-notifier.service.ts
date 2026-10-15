import { Inject, Injectable, Optional } from '@nestjs/common';
import { ticketAreaLabel } from '@template/shared/domain/ticket-catalog.util';
import { formatTicketProtocol } from '@template/shared/domain/ticket-protocol.util';
import { toWhatsAppNumber } from '@template/shared/domain/ticket-whatsapp.util';
import { TICKET_ACCESS_PARAM } from '@template/shared/domain/ticket-invite.util';
import { type TicketNoticeOutcome } from '@template/shared/schemas/ticket.schema';
import { type WhatsappNotice } from '@template/shared/schemas/whatsapp-notice.schema';

import { type Env } from '../../../lib/config/env.schema';
import { ENV } from '../../../lib/config/env.token';
import { type TicketRow } from '../../../lib/db/schema/tickets.schema';
import { TicketAssigneesService } from './ticket-assignees.service';
import { signTicketAccess } from './ticket-invite.util';
import { WhatsappMessagingService } from '../../whatsapp/service/whatsapp-messaging.service';

/** O desfecho de um aviso: os do envio, mais os motivos que o próprio chamado dá para não enviar. */
export type { TicketNoticeOutcome };

/**
 * Os avisos de WhatsApp de um chamado. A mensagem sai pelo número do RESPONSÁVEL, e não de
 * quem clicou: é com ele que a pessoa está falando, e é a ele que ela vai responder.
 *
 * Nada aqui lança: avisar é um extra, e um aviso que não saiu não pode impedir um chamado de
 * ser aberto nem de ser atendido.
 *
 * O aviso não sai na hora: entra na FILA DE SAÍDA (`queued`) e o entregador do WhatsApp o
 * manda em seguida, tentando de novo se o bot ou o celular de quem atende estiver fora.
 */
@Injectable()
export class TicketWhatsappNotifierService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Optional() private readonly messaging?: WhatsappMessagingService,
    @Optional() private readonly assignees?: TicketAssigneesService,
  ) {}

  /**
   * "Recebi o seu chamado" — logo depois de aberto pelo site. Sai pelo número do responsável
   * escolhido; quando a pessoa não escolheu ninguém, pelo de alguém que atende a área e tem
   * WhatsApp vinculado. Esse alguém só ENVIA: o chamado continua sem responsável.
   */
  async opened(ticket: TicketRow): Promise<TicketNoticeOutcome> {
    return this.notify(ticket, 'ticket_opened', await this.senderFor(ticket));
  }

  private async senderFor(ticket: TicketRow): Promise<NoticeSender | null> {
    if (ticket.assigneeId) return assigneeOf(ticket);
    if (!this.messaging || !this.assignees) return null;

    for (const attendant of await this.assignees.listForArea(ticket.area)) {
      if (await this.messaging.isLinked(attendant.id)) return attendant;
    }

    return null;
  }

  /** "O seu chamado ficou pronto" — quando quem atende clica em avisar. */
  ready(ticket: TicketRow): Promise<TicketNoticeOutcome> {
    return this.notify(ticket, 'ticket_ready', assigneeOf(ticket));
  }

  /** Os avisos do chamado na fila de saída: saíram, esperam ou pararam. */
  async notices(ticketId: number): Promise<WhatsappNotice[]> {
    return (await this.messaging?.notices(ticketId)) ?? [];
  }

  /** O "Reenviar" da ficha. Nulo quando o aviso não parou (está na fila ou já saiu). */
  async retry(ticketId: number, noticeId: number): Promise<WhatsappNotice | null> {
    return (await this.messaging?.retry(ticketId, noticeId)) ?? null;
  }

  private async notify(
    ticket: TicketRow,
    kind: 'ticket_opened' | 'ticket_ready',
    sender: NoticeSender | null,
  ): Promise<TicketNoticeOutcome> {
    const recipient = toWhatsAppNumber(ticket.contactPhone);
    /* Ter o telefone não autoriza usá-lo: só recebe quem pediu para ser avisado. */
    if (!ticket.notifyWhatsapp || !recipient) return 'not_wanted';
    if (!sender) return 'no_assignee';
    if (!this.messaging) return 'not_configured';

    return this.messaging.queue({
      senderUserId: sender.id,
      to: recipient,
      kind,
      ticketId: ticket.id,
      values: ticketValues(ticket, this.env, sender.name),
    });
  }
}

/** De quem é o número que envia, e o nome que assina a mensagem. */
type NoticeSender = { id: string; name: string | null };

function assigneeOf(ticket: TicketRow): NoticeSender | null {
  return ticket.assigneeId ? { id: ticket.assigneeId, name: ticket.assignee } : null;
}

/**
 * As variáveis de um chamado para os textos — as mesmas em toda mensagem que fala dele.
 *
 * `{{responsavel}}` é quem ASSINA a mensagem: o responsável do chamado e, quando ele ainda não
 * tem um, o dono do número que está enviando (`senderName`). Sem isso, a mensagem de abertura
 * de um chamado sem responsável sairia "Aqui é —".
 */
export function ticketValues(
  ticket: TicketRow,
  env: Env,
  senderName: string | null = null,
): Record<string, string | null> {
  return {
    nome: ticket.requesterName,
    protocolo: formatTicketProtocol(ticket.id),
    area: ticketAreaLabel(ticket.area),
    responsavel: ticket.assignee ?? senderName,
    solucao: ticket.solution,
    link: ticketAccessLink(ticket.id, env),
  };
}

/**
 * O link que abre direto AQUELE chamado na consulta pública, assinado. Sem o segredo para
 * assinar (integração desligada), cai na página de consulta, onde a pessoa digita o protocolo.
 */
export function ticketAccessLink(ticketId: number, env: Env): string {
  const base = `${publicUrl(env)}/support`;
  if (!env.BOT_API_TOKEN) return base;

  return `${base}?${TICKET_ACCESS_PARAM}=${signTicketAccess(ticketId, env.BOT_API_TOKEN)}`;
}

function publicUrl(env: Env): string {
  const base = env.APP_PUBLIC_URL ?? env.API_CORS_ORIGIN.split(',')[0]?.trim() ?? '';

  return base.replace(/\/+$/, '');
}
