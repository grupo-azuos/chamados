import { describe, expect, it, vi } from 'vitest';

import { type Env } from '../../../lib/config/env.schema';
import { type TicketRow } from '../../../lib/db/schema/tickets.schema';
import { type WhatsappMessagingService } from '../../whatsapp/service/whatsapp-messaging.service';
import { type TicketAssigneesService } from './ticket-assignees.service';
import { verifyTicketAccess } from './ticket-invite.util';
import {
  ticketAccessLink,
  TicketWhatsappNotifierService,
  ticketValues,
} from './ticket-whatsapp-notifier.service';

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

/* Quem atende a área, em ordem; `linked` são os que têm WhatsApp vinculado. */
const ATTENDANTS = [
  { id: 'u-caio', name: 'Caio Reis' },
  { id: 'u-dora', name: 'Dora Pires' },
];

function makeNotifier(outcome = 'sent', linked: string[] = ['u-dora']) {
  const messaging = {
    send: vi.fn().mockResolvedValue(outcome),
    isLinked: vi.fn(async (userId: string) => linked.includes(userId)),
  };
  const assignees = { listForArea: vi.fn().mockResolvedValue(ATTENDANTS) };
  const notifier = new TicketWhatsappNotifierService(
    env,
    messaging as unknown as WhatsappMessagingService,
    assignees as unknown as TicketAssigneesService,
  );

  return { notifier, messaging, assignees };
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

  /* Ninguém foi escolhido: envia quem atende a área e tem WhatsApp vinculado, e é o nome dessa
     pessoa que assina — o chamado continua sem responsável. */
  it('sends the opening notice through a linked attendant when nobody was chosen', async () => {
    const { notifier, messaging, assignees } = makeNotifier();

    const outcome = await notifier.opened(ticket({ assignee: null, assigneeId: null }));

    expect(outcome).toBe('sent');
    expect(assignees.listForArea).toHaveBeenCalledWith('infra');
    expect(messaging.send.mock.calls[0]?.[0]).toMatchObject({
      senderUserId: 'u-dora',
      values: { responsavel: 'Dora Pires' },
    });
  });

  /* O link da mensagem abre direto AQUELE chamado: assinado, para ninguém trocar o número. */
  it('puts in the message a signed link that opens that very ticket', () => {
    const secret = 's'.repeat(40);
    const link = ticketAccessLink(7, { ...env, BOT_API_TOKEN: secret } as Env);
    const token = link.split('chamado=')[1] ?? '';

    expect(link).toMatch(/^https:\/\/chamados\.exemplo\.com\/support\?chamado=/);
    expect(verifyTicketAccess(token, secret)).toBe(7);
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

  /* "Chamado pronto" é do responsável: sem um, não sai pelo número de outra pessoa. */
  it('says there is no assignee instead of sending the ready notice from someone else', async () => {
    const { notifier, messaging } = makeNotifier();

    expect(await notifier.ready(ticket({ assigneeId: null }))).toBe('no_assignee');
    expect(messaging.send).not.toHaveBeenCalled();
  });

  it('sends no opening notice when nobody who attends the area has a linked number', async () => {
    const { notifier, messaging } = makeNotifier('sent', []);

    const outcome = await notifier.opened(ticket({ assignee: null, assigneeId: null }));

    expect(outcome).toBe('no_assignee');
    expect(messaging.send).not.toHaveBeenCalled();
  });

  it('hands back why the message did not go out', async () => {
    expect(await makeNotifier('limit_reached').notifier.ready(ticket())).toBe('limit_reached');
    expect(await makeNotifier('not_linked').notifier.ready(ticket())).toBe('not_linked');
  });

  it('says the integration is not configured when messaging is absent', async () => {
    expect(await new TicketWhatsappNotifierService(env).ready(ticket())).toBe('not_configured');
  });

  /* Sem segredo para assinar, o link cai na página de consulta — nunca um link sem assinatura. */
  it('falls back to the plain lookup page when there is nothing to sign with', () => {
    expect(ticketAccessLink(7, env)).toBe('https://chamados.exemplo.com/support');
  });
});
