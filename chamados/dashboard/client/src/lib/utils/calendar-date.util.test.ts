import { describe, expect, it } from 'vitest';

import {
  addDaysIso,
  daysBetween,
  isValidIsoDate,
  parseIsoDate,
  todayIso,
} from './calendar-date.util';

describe('calendar dates', () => {
  // feliz
  it('reads a calendar date without time zone shifts', () => {
    expect(parseIsoDate('2026-03-15')?.toISOString()).toBe('2026-03-15T00:00:00.000Z');
  });

  it('adds days across month and year boundaries', () => {
    expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysIso('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('counts calendar days: today is 0, yesterday is -1', () => {
    expect(daysBetween('2026-09-16', '2026-09-16')).toBe(0);
    expect(daysBetween('2026-09-16', '2026-09-15')).toBe(-1);
    expect(daysBetween('2026-09-16', '2026-10-16')).toBe(30);
  });

  it('takes today from the local calendar, not from UTC', () => {
    expect(todayIso(new Date(2026, 8, 16, 23, 30))).toBe('2026-09-16');
  });

  // triste
  /* `new Date` transformaria 31/02 em 03/03 sem reclamar. */
  it('refuses a date that does not exist, instead of rolling it over', () => {
    expect(isValidIsoDate('2026-02-31')).toBe(false);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
    expect(addDaysIso('2026-02-31', 1)).toBe('');
  });

  it('refuses text that is not in the calendar date format', () => {
    expect(isValidIsoDate('15/03/2026')).toBe(false);
    expect(daysBetween('', '2026-01-01')).toBeNull();
  });
});
