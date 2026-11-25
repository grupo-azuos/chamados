import { describe, expect, it } from 'vitest';

import { calendarDayOf, daysOfMonth, monthLabel, timelineSpan } from './task-calendar.util';

describe('task calendar math', () => {
  // feliz
  it('lists the days of November 2026 and names the month', () => {
    const days = daysOfMonth('2026-11');
    expect(days[0]).toBe('2026-11-01');
    expect(days.at(-1)).toBe('2026-11-30');
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
