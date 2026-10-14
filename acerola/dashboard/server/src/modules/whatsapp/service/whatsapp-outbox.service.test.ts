import { describe, expect, it, vi } from 'vitest';

import { type WhatsappMessageRow } from '../../../lib/db/schema/whatsapp-connections.schema';
import { type WhatsappMessagesRepository } from '../repository/whatsapp-messages.repository';
import { type BotClientService } from './bot-client.service';
import { type WhatsappMessagingService } from './whatsapp-messaging.service';
import { WhatsappOutboxService } from './whatsapp-outbox.service';

const NOW = new Date('2026-10-14T15:00:00.000Z');
const HOUR = 60 * 60 * 1000;

function row(overrides: Partial<WhatsappMessageRow> = {}): WhatsappMessageRow {
  return {
    id: 4,
    senderUserId: 'u-ana',
    ticketId: 7,
    kind: 'ticket_ready',
    recipient: '5562999990002',
    status: 'pending',
    body: 'Olá, Bia!',
    attempts: 1,
    nextAttemptAt: NOW,
    expiresAt: new Date(NOW.getTime() + 24 * HOUR),
    sentAt: null,
    failureReason: null,
    createdAt: NOW,
    ...overrides,
  };
}

function makeOutbox(due: WhatsappMessageRow[], outcome = 'sent') {
  const messages = {
    claimDue: vi.fn().mockResolvedValue(due),
    stop: vi.fn(async () => undefined),
    reschedule: vi.fn(async () => undefined),
  };
  const messaging = { deliver: vi.fn().mockResolvedValue(outcome) };
  const outbox = new WhatsappOutboxService(
    { isConfigured: true } as BotClientService,
    messages as unknown as WhatsappMessagesRepository,
    messaging as unknown as WhatsappMessagingService,
  );

  return { outbox, messages, messaging };
}

describe('WhatsappOutboxService.tick', () => {
  // feliz
  /* Pega o que está na vez, reservando por 2 minutos — se cair no meio, a linha volta sozinha. */
  it('claims what is due and delivers each message', async () => {
    const { outbox, messages, messaging } = makeOutbox([row(), row({ id: 5 })]);

    await outbox.tick(NOW);

    expect(messages.claimDue).toHaveBeenCalledWith(NOW, new Date(NOW.getTime() + 2 * 60_000), 20);
    expect(messaging.deliver).toHaveBeenCalledTimes(2);
    expect(messages.stop).not.toHaveBeenCalled();
    expect(messages.reschedule).not.toHaveBeenCalled();
  });

  it('schedules another try when the phone is disconnected', async () => {
    const { outbox, messages } = makeOutbox([row()], 'not_connected');

    await outbox.tick(NOW);

    expect(messages.reschedule).toHaveBeenCalledWith(
      4,
      new Date(NOW.getTime() + 30_000),
      'not_connected',
      undefined,
    );
  });

  // triste
  it('gives up on a notice past its validity without calling the bot', async () => {
    const { outbox, messages, messaging } = makeOutbox([row({ expiresAt: NOW })]);

    await outbox.tick(NOW);

    expect(messaging.deliver).not.toHaveBeenCalled();
    expect(messages.stop).toHaveBeenCalledWith(4, 'failed', 'expired');
  });

  it('stops for good when the number has no WhatsApp', async () => {
    const { outbox, messages } = makeOutbox([row()], 'recipient_not_found');

    await outbox.tick(NOW);

    expect(messages.stop).toHaveBeenCalledWith(4, 'failed', 'recipient_not_found');
  });

  /* Um erro do banco não derruba o servidor: a volta seguinte tenta de novo. */
  it('survives a database error in the middle of a round', async () => {
    const { outbox, messages } = makeOutbox([]);
    messages.claimDue.mockRejectedValueOnce(new Error('connection reset'));

    await expect(outbox.tick(NOW)).resolves.toBeUndefined();
  });

  /* Uma volta lenta não pode se sobrepor à seguinte: a mesma linha sairia duas vezes. */
  it('skips a round while the previous one is still running', async () => {
    const { outbox, messages, messaging } = makeOutbox([row()]);
    let finish: (value: string) => void = () => undefined;
    messaging.deliver.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));

    const first = outbox.tick(NOW);
    await outbox.tick(NOW);
    finish('sent');
    await first;

    expect(messages.claimDue).toHaveBeenCalledTimes(1);
  });
});
