import { describe, expect, it } from 'vitest';

import {
  decideAfterAttempt,
  isExpired,
  type OutboxAttempt,
  retryDelayMs,
} from './whatsapp-outbox.util';

const NOW = new Date('2026-10-14T15:00:00.000Z');
/* Meia-noite de 14/10 em Brasília. */
const START_OF_TODAY = new Date('2026-10-14T03:00:00.000Z');
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function attempt(overrides: Partial<OutboxAttempt> = {}): OutboxAttempt {
  return {
    outcome: 'sent',
    kind: 'ticket_ready',
    attempts: 1,
    expiresAt: new Date(NOW.getTime() + 24 * HOUR),
    now: NOW,
    startOfToday: START_OF_TODAY,
    ...overrides,
  };
}

describe('retryDelayMs', () => {
  // feliz
  it('doubles the wait at each attempt, starting at 30 seconds', () => {
    expect(retryDelayMs(1)).toBe(30_000);
    expect(retryDelayMs(2)).toBe(60_000);
    expect(retryDelayMs(3)).toBe(120_000);
  });

  // triste
  /* Celular desligado a noite toda não vira uma tentativa a cada poucos segundos. */
  it('never waits more than 30 minutes', () => {
    expect(retryDelayMs(20)).toBe(30 * MINUTE);
  });
});

describe('decideAfterAttempt', () => {
  // feliz
  it('is done when the message went out', () => {
    expect(decideAfterAttempt(attempt())).toEqual({ action: 'sent' });
  });

  /* Bot fora do ar, celular desconectado: passa, e o aviso tenta de novo. */
  it('tries again later when the bot or the phone is unavailable', () => {
    expect(decideAfterAttempt(attempt({ outcome: 'not_connected', attempts: 2 }))).toEqual({
      action: 'retry',
      at: new Date(NOW.getTime() + MINUTE),
      reason: 'not_connected',
    });
    expect(decideAfterAttempt(attempt({ outcome: 'failed' }))).toMatchObject({ action: 'retry' });
  });

  /* "Chamado pronto" com o dia esgotado sai amanhã às 8h, com a validade andando junto. */
  it('leaves the ready notice for 8 a.m. the next day when the limit is over', () => {
    const tomorrowAtEight = new Date('2026-10-15T11:00:00.000Z');

    expect(decideAfterAttempt(attempt({ outcome: 'limit_reached' }))).toEqual({
      action: 'retry',
      at: tomorrowAtEight,
      reason: 'limit_reached',
      expiresAt: new Date(tomorrowAtEight.getTime() + 24 * HOUR),
    });
  });

  // triste
  it('discards the opening notice when the limit is over: tomorrow it says nothing', () => {
    expect(
      decideAfterAttempt(attempt({ outcome: 'limit_reached', kind: 'ticket_opened' })),
    ).toEqual({ action: 'stop', status: 'discarded', reason: 'limit_reached' });
  });

  /* Tentar de novo dá o mesmo resultado: para na hora, com o motivo. */
  it('stops at once when trying again cannot help', () => {
    for (const outcome of ['recipient_not_found', 'not_linked', 'not_configured'] as const) {
      expect(decideAfterAttempt(attempt({ outcome }))).toEqual({
        action: 'stop',
        status: 'failed',
        reason: outcome,
      });
    }
  });

  it('gives up when the next try would fall after the notice expires', () => {
    expect(
      decideAfterAttempt(
        attempt({ outcome: 'not_connected', expiresAt: new Date(NOW.getTime() + 10_000) }),
      ),
    ).toEqual({ action: 'stop', status: 'failed', reason: 'expired' });
  });
});

describe('isExpired', () => {
  // feliz
  it('lets through a notice that is still valid, or that never expires', () => {
    expect(isExpired(new Date(NOW.getTime() + 1), NOW)).toBe(false);
    expect(isExpired(null, NOW)).toBe(false);
  });

  // triste
  it('flags the notice past its validity', () => {
    expect(isExpired(NOW, NOW)).toBe(true);
  });
});
