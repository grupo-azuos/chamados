import { describe, expect, it, vi } from 'vitest';

import { type Env } from '../../../lib/config/env.schema';
import { type TicketAssigneesService } from '../../tickets/service/ticket-assignees.service';
import { type TicketsService } from '../../tickets/service/tickets.service';
import { type WhatsappMessagingService } from '../../whatsapp/service/whatsapp-messaging.service';
import { WhatsappAccessRequestService } from './whatsapp-access-request.service';
import { type InboundMessage } from './whatsapp-intake.service';

const NOW = 1_800_000_000_000;
const MINUTE = 60_000;
const SILENCE = { reply: null, isOpen: false };

const inbound = (text: string, extra: Partial<InboundMessage> = {}): InboundMessage => ({
  sessionId: 'a'.repeat(64),
  chatId: '5562999990002@s.whatsapp.net',
  text,
  phone: '5562999990002',
  ...extra,
});

function makeService(
  options: {
    areas?: string[];
    hasRoom?: boolean;
    projects?: { id: number; name: string }[];
    createFails?: boolean;
  } = {},
) {
  const assignees = {
    areasOf: vi.fn().mockResolvedValue({ name: 'Ana Lima', areas: options.areas ?? ['sistema'] }),
  };
  const tickets = {
    listSystemProjectOptions: vi
      .fn()
      .mockResolvedValue(options.projects ?? [{ id: 7, name: 'Portal do Cliente' }]),
    create: vi.fn(async (input: { requesterName: string }) => {
      if (options.createFails) throw new Error('database down');

      return { id: 42, requesterName: input.requesterName };
    }),
  };
  const messaging = {
    reply: vi.fn(async (message: { kind: string; values: Record<string, string> }) =>
      options.hasRoom === false ? null : `text:${message.kind}`,
    ),
  };
  const env = { API_CORS_ORIGIN: 'http://localhost:5005', BOT_API_TOKEN: 't'.repeat(40) } as Env;
  const service = new WhatsappAccessRequestService(
    env,
    assignees as unknown as TicketAssigneesService,
    tickets as unknown as TicketsService,
    messaging as unknown as WhatsappMessagingService,
  );

  /* Uma troca da conversa: a mensagem da pessoa e o que o bot respondeu. */
  const say = (text: string, extra: Partial<InboundMessage> = {}, now = NOW) =>
    service.handle('u-ana', inbound(text, extra), now);

  return { service, tickets, messaging, say };
}

const lastKind = (messaging: ReturnType<typeof makeService>['messaging']) =>
  messaging.reply.mock.calls.at(-1)?.[0].kind;

describe('WhatsappAccessRequestService', () => {
  // feliz
  it('asks name, e-mail, department and system, then opens the access ticket', async () => {
    const { say, tickets, messaging } = makeService();

    expect(await say('/acesso')).toEqual({ reply: 'text:access_name', isOpen: true });
    expect(await say('Maria Clara Souza')).toEqual({ reply: 'text:access_email', isOpen: true });
    expect(await say('Maria@Empresa.com.br')).toEqual({
      reply: 'text:access_department',
      isOpen: true,
    });
    expect(await say('11')).toEqual({ reply: 'text:access_system', isOpen: true });
    expect(await say('1')).toEqual({ reply: 'text:access_created', isOpen: false });

    expect(tickets.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requesterName: 'Maria Clara Souza',
        area: 'sistema',
        department: 'rh',
        problemType: 'access_request',
        contactPhone: '62999990002',
        notifyWhatsapp: true,
        projectId: 7,
        assigneeId: 'u-ana',
        description: expect.stringContaining('E-mail: maria@empresa.com.br'),
      }),
      undefined,
      [],
      { skipOpeningNotice: true },
    );
    expect(messaging.reply.mock.calls.at(-1)?.[0]).toMatchObject({
      ticketId: 42,
      values: { nome: 'Maria', protocolo: 'CH-0042', sistema: 'Portal do Cliente' },
    });
  });

  it('asks the phone only when WhatsApp hid it', async () => {
    const { say, messaging } = makeService();
    const hidden = { phone: null, chatId: '123@lid' };

    await say('/acesso', hidden);
    await say('Maria Clara', hidden);
    await say('maria@empresa.com.br', hidden);

    expect(lastKind(messaging)).toBe('access_phone');
  });

  /* Quem atende só Infra não vira responsável de pedido de Sistema: ele nasce na fila. */
  it('opens the ticket without assignee when the attendant does not attend Sistema', async () => {
    const { say, tickets } = makeService({ areas: ['infra'] });

    for (const text of ['/acesso', 'Maria Clara', 'm@empresa.com', '1', '1']) await say(text);

    expect(tickets.create.mock.calls[0]?.[0]).toMatchObject({ assigneeId: undefined });
  });

  it('knows the messages of an open request, and only those', async () => {
    const { service, say } = makeService();

    expect(service.isFor(inbound('oi'), NOW)).toBe(false);
    await say('/acesso');
    expect(service.isFor(inbound('Maria Clara'), NOW)).toBe(true);
    expect(service.isFor(inbound('Maria Clara'), NOW + 16 * MINUTE)).toBe(false);
  });

  // triste
  it('repeats the question when the answer is not valid, without moving on', async () => {
    const { say, messaging } = makeService();

    await say('/acesso');
    expect(await say('Maria')).toEqual({ reply: 'text:access_invalid', isOpen: true });
    expect(messaging.reply.mock.calls.at(-1)?.[0].values.erro).toContain('dois nomes');
    expect(await say('Maria Clara')).toEqual({ reply: 'text:access_email', isOpen: true });
  });

  it('goes silent and forgets the request when the person cancels', async () => {
    const { service, say } = makeService();

    await say('/acesso');
    expect(await say('cancelar')).toEqual(SILENCE);
    expect(service.isFor(inbound('Maria Clara'), NOW)).toBe(false);
  });

  it('forgets a request left unanswered for too long', async () => {
    const { say } = makeService();

    await say('/acesso');

    expect(await say('Maria Clara', {}, NOW + 16 * MINUTE)).toEqual(SILENCE);
  });

  it('does not start when no system accepts tickets, or the attendant has no area', async () => {
    expect(await makeService({ projects: [] }).say('/acesso')).toEqual(SILENCE);
    expect(await makeService({ areas: [] }).say('/acesso')).toEqual(SILENCE);
  });

  /* Teto do dia atingido: o bot se cala e a conversa fecha. */
  it('goes silent when the daily limit of the attendant is reached', async () => {
    const { service, say } = makeService({ hasRoom: false });

    expect(await say('/acesso')).toEqual(SILENCE);
    expect(service.isFor(inbound('Maria Clara'), NOW)).toBe(false);
  });

  it('goes silent when the ticket could not be saved', async () => {
    const { say } = makeService({ createFails: true });

    for (const text of ['/acesso', 'Maria Clara', 'm@empresa.com', '1']) await say(text);

    expect(await say('1')).toEqual(SILENCE);
  });
});
