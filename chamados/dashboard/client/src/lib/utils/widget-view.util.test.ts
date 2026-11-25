import { type WidgetData } from '@template/shared/schemas/dashboard-board.schema';
import { describe, expect, it } from 'vitest';

import {
  calendarDaysOf,
  gaugeOf,
  isEmptyResult,
  slicesOf,
  statItemsOf,
  timePointsOf,
} from './widget-view.util';

const DATA: WidgetData = {
  total: 7,
  grandTotal: 20,
  series: [
    { key: '2026-11-02', label: '2026-11-02', value: 3 },
    { key: '2026-11-01', label: '2026-11-01', value: 4 },
  ],
  cells: [],
};

describe('widget view', () => {
  // feliz
  it('turns the groups into slices, points in time and calendar days', () => {
    expect(slicesOf(DATA)).toEqual([
      { label: '2026-11-02', value: 3 },
      { label: '2026-11-01', value: 4 },
    ]);
    expect(timePointsOf(DATA).map((point) => point.at)).toEqual([
      '2026-11-01T12:00:00.000Z',
      '2026-11-02T12:00:00.000Z',
    ]);
    expect(
      timePointsOf({ ...DATA, series: [{ key: '2026-03', label: '03/2026', value: 1 }] })[0]?.at,
    ).toBe('2026-03-01T12:00:00.000Z');
    expect(calendarDaysOf(DATA)).toContainEqual({ date: '2026-11-01', count: 4 });
  });

  // feliz
  it('makes one card per group, up to four, or the total when not grouping', () => {
    expect(statItemsOf(DATA, 'chamados', false)).toEqual([
      { key: 'total', label: 'Chamados', value: 7, tone: 'blue' },
    ]);
    expect(statItemsOf(DATA, 'chamados', true)).toHaveLength(2);
  });

  // feliz
  it('measures the cut against the whole source', () => {
    expect(gaugeOf(DATA)).toEqual({ value: 7, max: 20, share: 35 });
  });

  // triste
  it('is empty only after the count came back with nothing', () => {
    expect(isEmptyResult(null)).toBe(false);
    expect(isEmptyResult({ total: 0, grandTotal: 0, series: [], cells: [] })).toBe(true);
    expect(gaugeOf(null)).toEqual({ value: 0, max: 1, share: 0 });
    expect(slicesOf(null)).toEqual([]);
  });

  // triste
  it('ignores keys that are not dates on the time charts', () => {
    expect(
      timePointsOf({ ...DATA, series: [{ key: '(Sem data)', label: '(Sem data)', value: 2 }] }),
    ).toEqual([]);
  });
});
