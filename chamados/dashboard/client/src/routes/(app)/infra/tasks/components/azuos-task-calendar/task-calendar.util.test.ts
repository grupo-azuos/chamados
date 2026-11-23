import { describe, expect, it } from 'vitest';

import {
  calendarDayOf,
  monthLabel,
  monthWeeks,
  timelineSpan,
  weekdayOf,
} from './task-calendar.util';

describe('task calendar math', () => {
  // feliz
  it('knows the weekday and lays November 2026 out from Sunday to Saturday', () => {
    expect(weekdayOf('2026-11-01')).toBe(0);
    expect(weekdayOf('2026-11-23')).toBe(1);
    const weeks = monthWeeks('2026-11');
    expect(weeks[0]?.[0]).toBe('2026-11-01');
    expect(weeks.at(-1)?.filter(Boolean).at(-1)).toBe('2026-11-30');
    expect(monthLabel('2026-11')).toBe('Novembro de 2026');
  });

  // feliz
  it('places a task on its due day, and clips its bar to the month', () => {
    expect(calendarDayOf({ dueDate: '2026-11-30', startDate: '2026-11-01' })).toBe('2026-11-30');
    expect(timelineSpan({ startDate: '2026-10-25', dueDate: '2026-11-03' }, '2026-11')).toEqual({
      start: 0,
      end: 2,
    });
  });

  // triste
  it('leaves out a task that does not touch the month', () => {
    expect(timelineSpan({ startDate: '2026-12-02', dueDate: '2026-12-09' }, '2026-11')).toBeNull();
    expect(calendarDayOf({ dueDate: null, startDate: '2026-11-05' })).toBe('2026-11-05');
  });
});
