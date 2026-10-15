import { describe, expect, it } from 'vitest';

import { isNearWhatsappLimit, whatsappAlertThreshold } from './whatsapp-connection.schema';

describe('whatsapp limit', () => {
  // feliz
  it('alerts at 70% of the daily limit', () => {
    expect(whatsappAlertThreshold(100)).toBe(70);
    expect(isNearWhatsappLimit(70, 100)).toBe(true);
    expect(isNearWhatsappLimit(100, 100)).toBe(true);
  });

  // triste
  it('stays quiet below the threshold', () => {
    expect(isNearWhatsappLimit(69, 100)).toBe(false);
    expect(isNearWhatsappLimit(0, 100)).toBe(false);
  });

  /* Teto que não divide redondo: o aviso arredonda para cima, nunca dispara antes da hora. */
  it('rounds the threshold up for a limit that does not divide evenly (edge case)', () => {
    expect(whatsappAlertThreshold(15)).toBe(11);
    expect(whatsappAlertThreshold(1)).toBe(1);
  });
});
