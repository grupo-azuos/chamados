import { describe, expect, it } from 'vitest';

import {
  addMonths,
  canShift,
  entriesOn,
  isInside,
  listDays,
  minuteOf,
  monthWeeks,
  placeTimed,
  shiftAnchor,
  titleOf,
  toDate,
  toDay,
  toEntry,
  visibleHours,
  visibleRangeOf,
  weekDays,
  weekdayInitial,
  yearMonths,
} from './event-calendar.util';

const NOV = toDate('2026-11-23');

describe('event calendar util', () => {
  // feliz
  it('shows the month with the leftover days of the neighbor weeks', () => {
    expect(visibleRangeOf('month', NOV)).toEqual({ from: '2026-11-01', to: '2026-12-05' });
    expect(monthWeeks(NOV)).toHaveLength(5);
    expect(weekDays(NOV).map(toDay)).toEqual([
      '2026-11-22',
      '2026-11-23',
      '2026-11-24',
      '2026-11-25',
      '2026-11-26',
      '2026-11-27',
      '2026-11-28',
    ]);
    expect(visibleRangeOf('year', NOV)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
    expect(visibleRangeOf('list', NOV)).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(yearMonths(NOV)).toHaveLength(12);
  });

  // feliz
  it('writes the toolbar title for each view', () => {
    expect(titleOf('month', NOV)).toBe('novembro de 2026');
    expect(titleOf('week', NOV)).toBe('22 – 28 de nov. de 2026');
    expect(titleOf('week', toDate('2026-11-30'))).toBe('29 de nov. – 5 de dez. de 2026');
    expect(titleOf('day', NOV)).toBe('segunda-feira, 23 de novembro de 2026');
    expect(titleOf('year', NOV)).toBe('2026');
    expect(weekdayInitial(NOV)).toBe('S');
  });

  // feliz
  it('steps by the size of the view, without skipping a short month', () => {
    expect(toDay(shiftAnchor('month', toDate('2026-01-31'), 1))).toBe('2026-02-28');
    expect(toDay(shiftAnchor('week', NOV, -1))).toBe('2026-11-16');
    expect(toDay(shiftAnchor('day', NOV, 1))).toBe('2026-11-24');
    expect(toDay(shiftAnchor('year', NOV, 1))).toBe('2027-11-23');
    expect(toDay(addMonths(NOV, -11))).toBe('2025-12-23');
  });

  // feliz
  it('reads timed events, splits overlapping ones into lanes and widens the hours', () => {
    const entries = [
      toEntry({ start: '2026-11-23T09:00', end: '2026-11-23T10:00' }),
      toEntry({ start: '2026-11-23T09:30' }),
      toEntry({ start: '2026-11-23' }),
      toEntry({ start: '2026-11-23T23:00' }),
    ];

    expect(entriesOn(entries, '2026-11-23')[0]!.startMinute).toBeNull();
    const hours = visibleHours(entries);
    expect(hours[0]).toBe(6);
    expect(hours.at(-1)).toBe(23);
    const placed = placeTimed(entries, hours);
    expect(placed[0]!.width).toBe(0.5);
    expect(placed[1]!.left).toBe(0.5);
    expect(listDays(NOV, entries, new Map([['2026-11-02', ['Finados']]]))).toEqual([
      '2026-11-02',
      '2026-11-23',
    ]);
  });

  // triste
  it('stops at the edges of the valid range and falls back to today on a broken day', () => {
    const range = { from: '2026-11-01', to: '2026-11-30' };

    expect(canShift('month', NOV, 1, range)).toBe(false);
    expect(canShift('month', NOV, -1, range)).toBe(false);
    expect(canShift('day', NOV, 1, range)).toBe(true);
    expect(canShift('month', NOV, 1, undefined)).toBe(true);
    expect(isInside('2026-12-01', range)).toBe(false);
    expect(isInside('2026-12-01', undefined)).toBe(true);
    expect(toDay(toDate('não é data'))).toBe(toDay(new Date()));
    expect(minuteOf('2026-11-23')).toBeNull();
  });
});
