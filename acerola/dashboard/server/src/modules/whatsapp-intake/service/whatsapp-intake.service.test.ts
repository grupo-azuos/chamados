import { describe, expect, it, vi } from 'vitest';

import { type Env } from '../../../lib/config/env.schema';
import { type TicketAssigneesService } from '../../tickets/service/ticket-assignees.service';
import { verifyTicketInvite } from '../../tickets/service/ticket-invite.util';
import { type WhatsappConnectionsRepository } from '../../whatsapp/repository/whatsapp-connections.repository';
import { botSessionId } from '../../whatsapp/service/bot-client.service';
import { type WhatsappMessagingService } from '../../whatsapp/service/whatsapp-messaging.service';
import { isBot } from '../controller/whatsapp-intake.controller';
import { type InboundMessage, WhatsappIntakeService } from './whatsapp-intake.service';

const NOW = 1_800_000_000_000;
const SECRET = 't'.repeat(40);
const SESSION = botSessionId('u-ana');

const inbound = (text: string, extra: Partial<InboundMessage> = {}): InboundMessage => ({
  sessionId: SESSION,
  chatId: '5562999990002@s.whatsapp.net',
  text,
  phone: '5562999990002',
  ...extra,
});

function makeService(
  options: {
    areas?: string[];
    hasRoom?: boolean;
    linked?: boolean;
    secret?: string | undefined;
  } = {},
) {
  const connections = {
    list: vi
      .fn()
      .mockResolvedValue(
        options.linked === false ? [] : [{ userId: 'u-ana', phone: '5562999990001' }],
      ),
  };
  const assignees = {
    areasOf: vi.fn().mockResolvedValue({ name: 'Ana Lima', areas: options.areas ?? ['infra'] }),
  };
  const messaging = {
    reply: vi.fn(async (message: { kind: string; values: Record<string, string> }) =>
      options.hasRoom === false ? null : `text:${message.kind}`,
    ),
  };
  const env = {
    API_CORS_ORIGIN: 'http://localhost:5005',
    BOT_API_TOKEN: 'secret' in options ? options.secret : SECRET,
  } as Env;
  const service = new WhatsappIntakeService(
    env,
    connections as unknown as WhatsappConnectionsRepository,
    assignees as unknown as TicketAssigneesService,
    messaging as unknown as WhatsappMessagingService,
  );

  return { service, messaging };
}

/** O convite que foi dentro do link da última resposta. */
function inviteOf(messaging: ReturnType<typeof makeService>['messaging']) {
  const link = messaging.reply.mock.calls[0]?.[0].values.link ?? '';

  return { link, token: link.split('invite=')[1] ?? '' };
}

describe('WhatsappIntakeService', () => {
  // feliz
  it('answers the command with one link, and leaves no conversation open', async () => {
    const { service, messaging } = makeService();

    expect(await service.handle(inbound('/chamado'), NOW)).toEqual({
      reply: 'text:intake_link',
      isOpen: false,
    });
    expect(messaging.reply.mock.calls[0]?.[0]).toMatchObject({
      senderUserId: 'u-ana',
      recipient: '5562999990002',
      kind: 'intake_link',
      values: { responsavel: 'Ana Lima', validade: '30' },
    });
  });

  /* O link leva, assinado, com quem a pessoa quer falar, o telefone dela e a validade. */
  it('signs into the link who the attendant is, the phone of who wrote and the deadline', async () => {
    const { service, messaging } = makeService();

    await service.handle(inbound(' /CHAMADO '), NOW);
    const { link, token } = inviteOf(messaging);

    expect(link).toMatch(/^http:\/\/localhost:5005\/support\?invite=/);
    expect(verifyTicketInvite(token, SECRET, NOW / 1000)).toEqual({
      assigneeId: 'u-ana',
      phone: '5562999990002',
      expiresAt: NOW / 1000 + 30 * 60,
    });
  });

  it('still sends the link when WhatsApp hides the phone: the form asks for it', async () => {
    const { service, messaging } = makeService();

    await service.handle(inbound('/chamado', { phone: null, chatId: '123@lid' }), NOW);

    expect(verifyTicketInvite(inviteOf(messaging).token, SECRET, NOW / 1000)?.phone).toBeNull();
  });

  // triste
  /* Conversa comum não recebe resposta nem gasta mensagem do dia. */
  it('stays silent for anything that is not the command', async () => {
    const { service, messaging } = makeService();

    for (const text of ['oi, tudo bem?', '/chamado urgente', 'Nome: Bia', '1']) {
      expect(await service.handle(inbound(text), NOW)).toEqual({ reply: null, isOpen: false });
    }
    expect(messaging.reply).not.toHaveBeenCalled();
  });

  /* Teto do dia atingido: o bot se cala, em vez de gastar mais uma mensagem dizendo que não pode. */
  it('goes silent when the daily limit of the attendant is reached', async () => {
    const { service } = makeService({ hasRoom: false });

    expect(await service.handle(inbound('/chamado'), NOW)).toEqual({ reply: null, isOpen: false });
  });

  it('stays silent for a number that is not linked, or whose owner attends no area', async () => {
    const silence = { reply: null, isOpen: false };

    expect(await makeService({ linked: false }).service.handle(inbound('/chamado'), NOW)).toEqual(
      silence,
    );
    expect(await makeService({ areas: [] }).service.handle(inbound('/chamado'), NOW)).toEqual(
      silence,
    );
  });

  /* Sem o segredo não há com o que assinar: melhor o silêncio que um link que qualquer um forja. */
  it('sends no link when there is no secret to sign it with', async () => {
    const { service, messaging } = makeService({ secret: undefined });

    expect(await service.handle(inbound('/chamado'), NOW)).toEqual({ reply: null, isOpen: false });
    expect(messaging.reply).not.toHaveBeenCalled();
  });
});

describe('isBot', () => {
  const token = 't'.repeat(40);

  // feliz
  it('accepts the bearer token of the bot', () => {
    expect(isBot(`Bearer ${token}`, token)).toBe(true);
  });

  // triste
  /* Sem a integração configurada, a porta não abre para ninguém — nem com cabeçalho vazio. */
  it('refuses a wrong token, a missing header and an installation without the bot', () => {
    expect(isBot(`Bearer ${'x'.repeat(40)}`, token)).toBe(false);
    expect(isBot(undefined, token)).toBe(false);
    expect(isBot('Bearer undefined', undefined)).toBe(false);
    expect(isBot('', undefined)).toBe(false);
  });
});
