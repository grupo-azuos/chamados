import { describe, expect, it, vi } from 'vitest';

import { type Env } from '../../../lib/config/env.schema';
import { type WhatsappConnectionsRepository } from '../repository/whatsapp-connections.repository';
import { type WhatsappMessagesRepository } from '../repository/whatsapp-messages.repository';
import { type BotClientService } from './bot-client.service';
import { startOfDay, WhatsappMessagingService } from './whatsapp-messaging.service';
import { type WhatsappTemplatesService } from './whatsapp-templates.service';

const message = {
  senderUserId: 'u-ana',
  to: '5562999990002',
  kind: 'ticket_ready' as const,
  values: { nome: 'Bia' },
  ticketId: 7,
};

function makeService(
  options: {
    sent?: number;
    limit?: number;
    linked?: boolean;
    outcome?: string;
    isConfigured?: boolean;
  } = {},
) {
  let sent = options.sent ?? 0;
  const bot = {
    isConfigured: options.isConfigured ?? true,
    sendText: vi.fn().mockResolvedValue(options.outcome ?? 'sent'),
  };
  const connections = {
    find: vi
      .fn()
      .mockResolvedValue(
        options.linked === false ? null : { userId: 'u-ana', phone: '5562999990001' },
      ),
  };
  const messages = {
    countSince: vi.fn(async () => sent),
    record: vi.fn(async () => void (sent += 1)),
  };
  const templates = { render: vi.fn(async (kind: string) => `text:${kind}`) };
  const service = new WhatsappMessagingService(
    { WHATSAPP_DAILY_LIMIT: options.limit ?? 100 } as Env,
    bot as unknown as BotClientService,
    connections as unknown as WhatsappConnectionsRepository,
    messages as unknown as WhatsappMessagesRepository,
    templates as unknown as WhatsappTemplatesService,
  );

  return { service, bot, messages, templates };
}

describe('WhatsappMessagingService.send', () => {
  // feliz
  it('sends the rendered text through the bot and counts it', async () => {
    const { service, bot, messages } = makeService();

    expect(await service.send(message)).toBe('sent');
    expect(bot.sendText).toHaveBeenCalledWith('u-ana', '5562999990002', 'text:ticket_ready');
    expect(messages.record).toHaveBeenCalledWith({
      senderUserId: 'u-ana',
      ticketId: 7,
      kind: 'ticket_ready',
      recipient: '5562999990002',
    });
  });

  /* Na 70ª mensagem do dia, a pessoa é avisada pelo próprio número — e o aviso não conta. */
  it('alerts the sender on their own number when the day reaches 70% of the limit', async () => {
    const { service, bot, messages } = makeService({ sent: 69 });

    await service.send(message);

    expect(bot.sendText).toHaveBeenLastCalledWith('u-ana', '5562999990001', 'text:limit_alert');
    expect(messages.record).toHaveBeenCalledTimes(1);
  });

  it('alerts only once: the next message goes without another warning', async () => {
    const { service, bot } = makeService({ sent: 70 });

    await service.send(message);

    expect(bot.sendText).toHaveBeenCalledTimes(1);
  });

  // triste
  /* O teto do dia: passou dele, nada sai por aquele número até amanhã. */
  it('refuses to send once the daily limit is reached', async () => {
    const { service, bot, messages } = makeService({ sent: 100 });

    expect(await service.send(message)).toBe('limit_reached');
    expect(bot.sendText).not.toHaveBeenCalled();
    expect(messages.record).not.toHaveBeenCalled();
  });

  it('does not count a message the bot could not deliver', async () => {
    const { service, messages } = makeService({ outcome: 'not_connected' });

    expect(await service.send(message)).toBe('not_connected');
    expect(messages.record).not.toHaveBeenCalled();
  });

  it('says so when the sender has no linked number, or there is no bot', async () => {
    expect(await makeService({ linked: false }).service.send(message)).toBe('not_linked');
    expect(await makeService({ isConfigured: false }).service.send(message)).toBe('not_configured');
  });
});

describe('WhatsappMessagingService.reply', () => {
  const reply = {
    senderUserId: 'u-ana',
    recipient: '5562999990002',
    kind: 'intake_link' as const,
    values: {},
    ticketId: null,
  };

  // feliz
  it('hands back the text and counts it, leaving the delivery to the bot', async () => {
    const { service, bot, messages } = makeService();

    expect(await service.reply(reply)).toBe('text:intake_link');
    expect(messages.record).toHaveBeenCalledOnce();
    expect(bot.sendText).not.toHaveBeenCalled();
  });

  // triste
  it('answers null, and counts nothing, once the daily limit is reached', async () => {
    const { service, messages } = makeService({ sent: 100 });

    expect(await service.reply(reply)).toBeNull();
    expect(messages.record).not.toHaveBeenCalled();
  });
});

describe('WhatsappMessagingService.usage', () => {
  // feliz
  it('tells how many went out today against the limit', async () => {
    expect(await makeService({ sent: 12, limit: 50 }).service.usage('u-ana')).toEqual({
      sentToday: 12,
      dailyLimit: 50,
    });
  });
});

describe('startOfDay', () => {
  // feliz
  /* 15h em Brasília (18h UTC): o dia começou às 03h UTC. */
  it('finds the midnight of the day in the given time zone', () => {
    const now = new Date('2026-10-10T18:30:45.000Z');

    expect(startOfDay(now, 'America/Sao_Paulo').toISOString()).toBe('2026-10-10T03:00:00.000Z');
  });

  // triste
  /* 01h UTC ainda é "ontem" em Brasília (22h): o dia de lá começou no dia anterior de UTC. */
  it('does not use the UTC day when the zone is still on the day before', () => {
    const now = new Date('2026-10-11T01:00:00.000Z');

    expect(startOfDay(now, 'America/Sao_Paulo').toISOString()).toBe('2026-10-10T03:00:00.000Z');
  });
});
