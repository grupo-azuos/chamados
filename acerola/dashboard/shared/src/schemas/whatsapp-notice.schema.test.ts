import { describe, expect, it } from 'vitest';

import { canRetryWhatsappNotice, whatsappNoticeSchema } from './whatsapp-notice.schema';

const notice = {
  id: 1,
  kind: 'ticket_ready',
  status: 'failed',
  attempts: 3,
  failureReason: 'not_connected',
  createdAt: '2026-10-14T12:00:00.000Z',
  sentAt: null,
};

describe('whatsappNoticeSchema', () => {
  // feliz
  it('accepts a notice that did not go out, with the reason', () => {
    expect(whatsappNoticeSchema.parse(notice)).toEqual(notice);
  });

  // triste
  it('refuses a status or a reason the queue does not know', () => {
    expect(whatsappNoticeSchema.safeParse({ ...notice, status: 'lost' }).success).toBe(false);
    expect(whatsappNoticeSchema.safeParse({ ...notice, failureReason: 'oops' }).success).toBe(
      false,
    );
  });
});

describe('canRetryWhatsappNotice', () => {
  // feliz
  it('lets a stopped notice be sent again', () => {
    expect(canRetryWhatsappNotice('failed')).toBe(true);
    expect(canRetryWhatsappNotice('discarded')).toBe(true);
  });

  // triste
  /* Na fila ele já vai sair; enviado já saiu — reenviar seria a mesma mensagem duas vezes. */
  it('does not retry what is queued or already sent', () => {
    expect(canRetryWhatsappNotice('pending')).toBe(false);
    expect(canRetryWhatsappNotice('sent')).toBe(false);
  });
});
