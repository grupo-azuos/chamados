import { describe, expect, it } from 'vitest';

import { type WhatsappMessageRow } from '../../../lib/db/schema/whatsapp-connections.schema';
import { toWhatsappNotice } from './whatsapp-notices.mapper';

function row(overrides: Partial<WhatsappMessageRow> = {}): WhatsappMessageRow {
  return {
    id: 4,
    senderUserId: 'u-ana',
    ticketId: 7,
    kind: 'ticket_ready',
    recipient: '5562999990002',
    status: 'failed',
    body: 'Olá, Bia!',
    attempts: 2,
    nextAttemptAt: null,
    expiresAt: new Date('2026-10-15T12:00:00.000Z'),
    sentAt: null,
    failureReason: 'not_connected',
    createdAt: new Date('2026-10-14T12:00:00.000Z'),
    ...overrides,
  };
}

describe('toWhatsappNotice', () => {
  // feliz
  it('shows whether the notice went out and why not, without the text or the phone', () => {
    const notice = toWhatsappNotice(row());

    expect(notice).toEqual({
      id: 4,
      kind: 'ticket_ready',
      status: 'failed',
      attempts: 2,
      failureReason: 'not_connected',
      createdAt: '2026-10-14T12:00:00.000Z',
      sentAt: null,
    });
    expect(JSON.stringify(notice)).not.toContain('5562999990002');
  });

  // triste
  it('leaves out what is not a ticket notice', () => {
    expect(toWhatsappNotice(row({ kind: 'access_created' }))).toBeNull();
  });
});
