import { describe, expect, it, vi } from 'vitest';

import { type Env } from '../../../lib/config/env.schema';
import { type TicketRow } from '../../../lib/db/schema/tickets.schema';
import { type WhatsappMessagingService } from '../../whatsapp/service/whatsapp-messaging.service';
import { TicketWhatsappNotifierService, ticketValues } from './ticket-whatsapp-notifier.service';

const env = { API_CORS_ORIGIN: 'https://chamados.exemplo.com/, http://localhost:5005' } as Env;

function ticket(overrides: Partial<TicketRow> = {}): TicketRow {
  return {
    id: 7,
    requesterName: 'Bia Costa',
    area: 'infra',
    contactPhone: '(62) 99999-0002',
    notifyWhatsapp: true,
    assignee: 'Ana Lima',
    assigneeId: 'u-ana',
    solution: 'Troquei o cabo.',
    ...overrides,
  } as TicketRow;
}

function makeNotifier(outcome = 'sent') {
  const messaging = { send: vi.fn().mockResolvedValue(outcome) };
  const notifier = new TicketWhatsappNotifierService(
    env,
    messaging as unknown as WhatsappMessagingService,
  );

  return { notifier, messaging };
}

describe('TicketWhatsappNotifierService', () => {
  // feliz
  /* Sai pelo número do RESPONSÁVEL, para o telefone de quem abriu, já com DDI. */
  it('sends the ready notice through the number of the assignee', async () => {
    const { notifier, messaging } = makeNotifier();

    expect(await notifier.ready(ticket())).toBe('sent');
    expect(messaging.send).toHaveBeenCalledWith({
      senderUserId: 'u-ana',
      to: '5562999990002',
      kind: 'ticket_ready',
      ticketId: 7,
      values: {
        nome: 'Bia Costa',
        protocolo: 'CH-0007',
        area: 'Infraestrutura',
        responsavel: 'Ana Lima',
        solucao: 'Troquei o cabo.',
        link: 'https://chamados.exemplo.com/support',
      },
    });
  });

  it('sends the opening notice with its own text', async () => {
    const { notifier, messaging } = makeNotifier();

    await notifier.opened(ticket({ solution: null }));

    expect(messaging.send.mock.calls[0]?.[0]).toMatchObject({ kind: 'ticket_opened' });
  });

  it('prefers the public address over the first allowed origin', () => {
    const values = ticketValues(ticket(), {
      ...env,
      APP_PUBLIC_URL: 'https://app.exemplo.com/',
    } as Env);

    expect(values.link).toBe('https://app.exemplo.com/support');
  });

  // triste
  /* Ter o telefone não autoriza usá-lo: só recebe quem marcou que quer ser avisado. */
  it('does not message who did not ask to be notified', async () => {
    const { notifier, messaging } = makeNotifier();

    expect(await notifier.ready(ticket({ notifyWhatsapp: false }))).toBe('not_wanted');
    expect(messaging.send).not.toHaveBeenCalled();
  });

  it('does not message a phone that is not a phone', async () => {
    const { notifier, messaging } = makeNotifier();

    expect(await notifier.ready(ticket({ contactPhone: 'ramal 12' }))).toBe('not_wanted');
    expect(messaging.send).not.toHaveBeenCalled();
  });

  it('says there is no assignee instead of sending from someone else', async () => {
    const { notifier, messaging } = makeNotifier();

    expect(await notifier.ready(ticket({ assigneeId: null }))).toBe('no_assignee');
    expect(messaging.send).not.toHaveBeenCalled();
  });

  it('hands back why the message did not go out', async () => {
    expect(await makeNotifier('limit_reached').notifier.ready(ticket())).toBe('limit_reached');
    expect(await makeNotifier('not_linked').notifier.ready(ticket())).toBe('not_linked');
  });

  it('says the integration is not configured when messaging is absent', async () => {
    expect(await new TicketWhatsappNotifierService(env).ready(ticket())).toBe('not_configured');
  });
});
