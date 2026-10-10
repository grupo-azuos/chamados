import { Inject, Injectable, Optional } from '@nestjs/common';
import { ticketAreaLabel } from '@template/shared/domain/ticket-catalog.util';
import { formatTicketProtocol } from '@template/shared/domain/ticket-protocol.util';
import { toWhatsAppNumber } from '@template/shared/domain/ticket-whatsapp.util';
import { type TicketNoticeOutcome } from '@template/shared/schemas/ticket.schema';

import { type Env } from '../../../lib/config/env.schema';
import { ENV } from '../../../lib/config/env.token';
import { type TicketRow } from '../../../lib/db/schema/tickets.schema';
import { WhatsappMessagingService } from '../../whatsapp/service/whatsapp-messaging.service';

/** O desfecho de um aviso: os do envio, mais os motivos que o próprio chamado dá para não enviar. */
export type { TicketNoticeOutcome };

/**
 * Os avisos de WhatsApp de um chamado. A mensagem sai pelo número do RESPONSÁVEL, e não de
 * quem clicou: é com ele que a pessoa está falando, e é a ele que ela vai responder.
 *
 * Nada aqui lança: avisar é um extra, e um aviso que não saiu não pode impedir um chamado de
 * ser aberto nem de ser atendido.
 */
@Injectable()
export class TicketWhatsappNotifierService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Optional() private readonly messaging?: WhatsappMessagingService,
  ) {}

  /** "Recebi o seu chamado" — logo depois de aberto pelo site com um responsável escolhido. */
  opened(ticket: TicketRow): Promise<TicketNoticeOutcome> {
    return this.notify(ticket, 'ticket_opened');
  }

  /** "O seu chamado ficou pronto" — quando quem atende clica em avisar. */
  ready(ticket: TicketRow): Promise<TicketNoticeOutcome> {
    return this.notify(ticket, 'ticket_ready');
  }

  private async notify(
    ticket: TicketRow,
    kind: 'ticket_opened' | 'ticket_ready',
  ): Promise<TicketNoticeOutcome> {
    const recipient = toWhatsAppNumber(ticket.contactPhone);
    /* Ter o telefone não autoriza usá-lo: só recebe quem pediu para ser avisado. */
    if (!ticket.notifyWhatsapp || !recipient) return 'not_wanted';
    if (!ticket.assigneeId) return 'no_assignee';
    if (!this.messaging) return 'not_configured';

    return this.messaging.send({
      senderUserId: ticket.assigneeId,
      to: recipient,
      kind,
      ticketId: ticket.id,
      values: ticketValues(ticket, this.env),
    });
  }
}

/** As variáveis de um chamado para os textos — as mesmas em toda mensagem que fala dele. */
export function ticketValues(ticket: TicketRow, env: Env): Record<string, string | null> {
  return {
    nome: ticket.requesterName,
    protocolo: formatTicketProtocol(ticket.id),
    area: ticketAreaLabel(ticket.area),
    responsavel: ticket.assignee,
    solucao: ticket.solution,
    link: `${publicUrl(env)}/support`,
  };
}

function publicUrl(env: Env): string {
  const base = env.APP_PUBLIC_URL ?? env.API_CORS_ORIGIN.split(',')[0]?.trim() ?? '';

  return base.replace(/\/+$/, '');
}
