import { describe, expect, it } from 'vitest';

import {
  TEST_NOW,
  taskFixture,
} from '../../routes/(app)/infra/tasks/components/task-fixture.test-support';
import {
  brazilianDay,
  ganttBarOf,
  ganttDays,
  ganttLanesOf,
  ganttTitleOf,
  ganttWindowOf,
  isWeekend,
  mondayOf,
  shiftGanttWindow,
  taskHueOf,
} from './task-gantt.util';

describe('task gantt', () => {
  // feliz
  it('opens five weeks from the monday of last week, and each zoom on its own size', () => {
    expect(mondayOf('2026-11-23')).toBe('2026-11-23');
    expect(mondayOf('2026-11-29')).toBe('2026-11-23');
    expect(ganttWindowOf('2026-11-25')).toEqual({ from: '2026-11-16', to: '2026-12-20' });
    expect(ganttWindowOf('2026-11-25', 'week')).toEqual({ from: '2026-11-23', to: '2026-11-29' });
    expect(ganttWindowOf('2026-11-25', 'fortnight')).toEqual({
      from: '2026-11-23',
      to: '2026-12-06',
    });
    expect(shiftGanttWindow({ from: '2026-11-23', to: '2026-11-29' }, -1)).toEqual({
      from: '2026-11-16',
      to: '2026-11-22',
    });
    expect(ganttDays({ from: '2026-11-23', to: '2026-11-29' })).toHaveLength(7);
    expect(ganttTitleOf({ from: '2026-11-16', to: '2026-12-20' })).toBe('16/11 a 20/12');
  });

  // feliz
  it('cuts the bar at the edges of the window', () => {
    const window = { from: '2026-11-16', to: '2026-11-22' };

    expect(ganttBarOf({ startDate: '2026-11-10', dueDate: '2026-11-18' }, window)).toEqual({
      column: 0,
      span: 3,
      isCutStart: true,
      isCutEnd: false,
    });
    expect(ganttBarOf({ startDate: '2026-11-20', dueDate: null }, window)).toEqual({
      column: 4,
      span: 1,
      isCutStart: false,
      isCutEnd: false,
    });
  });

  // feliz
  it('puts one lane per owner, by name, with "Sem responsável" last', () => {
    const lanes = ganttLanesOf([
      taskFixture({ id: 1, owner: null }),
      taskFixture({ id: 2, owner: { id: 'z', name: 'Zélia', avatarUrl: null } }),
      taskFixture({ id: 3, startDate: '2026-11-12' }),
      taskFixture({ id: 4, startDate: '2026-11-01' }),
    ]);

    expect(lanes.map((lane) => lane.ownerName)).toEqual(['Ana Prado', 'Zélia', 'Sem responsável']);
    expect(lanes[0]!.tasks.map((task) => task.id)).toEqual([4, 3]);
  });

  // triste
  it('leaves out a task outside the window and paints a late task red', () => {
    expect(
      ganttBarOf(
        { startDate: '2026-12-01', dueDate: '2026-12-02' },
        { from: '2026-11-16', to: '2026-11-22' },
      ),
    ).toBeNull();
    expect(taskHueOf(taskFixture({ dueDate: '2026-11-01' }), TEST_NOW)).toBe('red');
    expect(taskHueOf(taskFixture({ status: 'done', dueDate: '2026-12-30' }), TEST_NOW)).toBe(
      'green',
    );
    expect(isWeekend('2026-11-22')).toBe(true);
    expect(isWeekend('2026-11-23')).toBe(false);
    expect(brazilianDay('2026-11-05')).toBe('05/11/2026');
  });
});
