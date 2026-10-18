import { describe, expect, it } from 'vitest';

import { msUntilBrasiliaTime, nextBrasiliaTime } from './daily-schedule.util';

describe('daily-schedule.util', () => {
  // feliz
  it('schedules midnight in Brasília as 03:00 UTC of the next day', () => {
    // 15:00 em Brasília (18:00 UTC)
    const now = new Date('2026-10-17T18:00:00Z');

    expect(nextBrasiliaTime(now, 0).toISOString()).toBe('2026-10-18T03:00:00.000Z');
  });

  // feliz
  it('keeps the same Brasília night when UTC already turned the day', () => {
    // 22:30 em Brasília do dia 17 = 01:30 UTC do dia 18
    const now = new Date('2026-10-18T01:30:00Z');

    expect(nextBrasiliaTime(now, 0).toISOString()).toBe('2026-10-18T03:00:00.000Z');
    expect(nextBrasiliaTime(now, 3).toISOString()).toBe('2026-10-18T06:00:00.000Z');
  });

  // feliz
  it('pushes to the next day when it is exactly the scheduled time', () => {
    const now = new Date('2026-10-18T03:00:00Z');

    expect(nextBrasiliaTime(now, 0).toISOString()).toBe('2026-10-19T03:00:00.000Z');
    expect(msUntilBrasiliaTime(now, 0)).toBe(24 * 60 * 60 * 1000);
  });

  // triste
  it('rejects an hour outside the day', () => {
    const now = new Date('2026-10-18T03:00:00Z');

    expect(() => nextBrasiliaTime(now, 24)).toThrow(RangeError);
    expect(() => nextBrasiliaTime(now, -1)).toThrow(RangeError);
    expect(() => nextBrasiliaTime(now, 1.5)).toThrow(RangeError);
  });
});
