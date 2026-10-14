import { describe, expect, it } from 'vitest';

import { createRateLimiter } from './inbound-rate-limit.util.js';

const NOW = 1_800_000_000_000;
const MINUTE = 60_000;

describe('createRateLimiter', () => {
  // feliz
  it('lets messages through up to the limit', () => {
    const allow = createRateLimiter({ limit: 3, windowMs: 10 * MINUTE });

    expect(allow('chat', NOW)).toBe(true);
    expect(allow('chat', NOW + 1)).toBe(true);
    expect(allow('chat', NOW + 2)).toBe(true);
  });

  it('lets the person write again once the window moves on', () => {
    const allow = createRateLimiter({ limit: 2, windowMs: 10 * MINUTE });
    allow('chat', NOW);
    allow('chat', NOW + MINUTE);

    expect(allow('chat', NOW + 5 * MINUTE)).toBe(false);
    /* A primeira saiu da janela: abre uma vaga, e só uma. */
    expect(allow('chat', NOW + 10 * MINUTE + 1)).toBe(true);
    expect(allow('chat', NOW + 10 * MINUTE + 2)).toBe(false);
  });

  // triste
  it('refuses the message past the limit', () => {
    const allow = createRateLimiter({ limit: 2, windowMs: 10 * MINUTE });
    allow('chat', NOW);
    allow('chat', NOW + 1);

    expect(allow('chat', NOW + 2)).toBe(false);
  });

  /* Recusada não conta: insistir durante o bloqueio não empurra o fim dele para a frente. */
  it('does not count refused messages', () => {
    const allow = createRateLimiter({ limit: 1, windowMs: 10 * MINUTE });
    allow('chat', NOW);
    for (let minute = 1; minute < 10; minute += 1) allow('chat', NOW + minute * MINUTE);

    expect(allow('chat', NOW + 10 * MINUTE + 1)).toBe(true);
  });

  it('keeps one conversation apart from another', () => {
    const allow = createRateLimiter({ limit: 1, windowMs: 10 * MINUTE });
    allow('a', NOW);

    expect(allow('a', NOW + 1)).toBe(false);
    expect(allow('b', NOW + 1)).toBe(true);
  });
});
