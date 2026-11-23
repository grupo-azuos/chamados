import { describe, expect, it } from 'vitest';

import {
  addDays,
  canMoveTask,
  isTaskDueSoon,
  isTaskOverdue,
  maintenanceTaskNeed,
  taskStatusAfterSteps,
  taskStatusFromTicket,
} from './task-flow.util';

/* 23/11/2026, 14h em Brasília (17h UTC). */
const NOW = new Date('2026-11-23T17:00:00Z');

describe('taskStatusAfterSteps', () => {
  // feliz
  it('finishes the task when the last step is checked', () => {
    expect(taskStatusAfterSteps('open', [{ done: true }, { done: true }])).toBe('done');
  });

  // feliz
  it('reopens a finished task when a step is unchecked', () => {
    expect(taskStatusAfterSteps('done', [{ done: true }, { done: false }])).toBe('reopened');
  });

  // triste
  it('leaves a task without steps alone', () => {
    expect(taskStatusAfterSteps('open', [])).toBe('open');
  });
});

describe('canMoveTask', () => {
  // feliz
  it('finishes what is not finished and reopens what is', () => {
    expect(canMoveTask('open', 'done')).toBe(true);
    expect(canMoveTask('done', 'reopened')).toBe(true);
  });

  // triste
  it('refuses finishing twice, reopening an open task and going back to open', () => {
    expect(canMoveTask('done', 'done')).toBe(false);
    expect(canMoveTask('open', 'reopened')).toBe(false);
    expect(canMoveTask('reopened', 'open')).toBe(false);
  });
});

describe('taskStatusFromTicket', () => {
  // feliz
  it('finishes with the closed ticket and reopens with the reopened one', () => {
    expect(taskStatusFromTicket('open', true)).toBe('done');
    expect(taskStatusFromTicket('done', false)).toBe('reopened');
  });

  // triste
  it('changes nothing when the task already follows the ticket', () => {
    expect(taskStatusFromTicket('done', true)).toBeNull();
    expect(taskStatusFromTicket('open', false)).toBeNull();
  });
});

describe('isTaskOverdue / isTaskDueSoon', () => {
  // feliz
  it('is overdue after the due day, and after the due hour on the day itself', () => {
    expect(isTaskOverdue({ dueDate: '2026-11-22', dueTime: null, status: 'open' }, NOW)).toBe(true);
    expect(isTaskOverdue({ dueDate: '2026-11-23', dueTime: '13:30', status: 'open' }, NOW)).toBe(
      true,
    );
  });

  // triste
  it('is not overdue when finished, without a due day, or later today', () => {
    expect(isTaskOverdue({ dueDate: '2026-11-01', dueTime: null, status: 'done' }, NOW)).toBe(
      false,
    );
    expect(isTaskOverdue({ dueDate: null, dueTime: null, status: 'open' }, NOW)).toBe(false);
    expect(isTaskOverdue({ dueDate: '2026-11-23', dueTime: null, status: 'open' }, NOW)).toBe(
      false,
    );
  });

  // feliz
  it('is due soon within the next days, not after them', () => {
    expect(isTaskDueSoon({ dueDate: '2026-11-30', status: 'open' }, 7, NOW)).toBe(true);
    expect(isTaskDueSoon({ dueDate: '2026-12-01', status: 'open' }, 7, NOW)).toBe(false);
  });
});

describe('maintenanceTaskNeed', () => {
  // feliz
  it('asks for a task when the preventive is overdue or due within a week', () => {
    expect(
      maintenanceTaskNeed(
        { scheduledFor: null, nextPreventiveAt: '2026-11-18T10:00:00.000Z' },
        NOW,
      ),
    ).toEqual({ dueDate: '2026-11-18', reason: 'preventive' });
    expect(
      maintenanceTaskNeed(
        { scheduledFor: null, nextPreventiveAt: '2026-11-29T10:00:00.000Z' },
        NOW,
      ),
    ).toEqual({ dueDate: '2026-11-29', reason: 'preventive' });
  });

  // feliz
  it('follows the schedule when there is one', () => {
    expect(
      maintenanceTaskNeed(
        { scheduledFor: '2026-11-25', nextPreventiveAt: '2027-02-01T00:00:00Z' },
        NOW,
      ),
    ).toEqual({ dueDate: '2026-11-25', reason: 'scheduled' });
  });

  // triste
  it('asks for nothing when everything is far away or there is no date', () => {
    expect(
      maintenanceTaskNeed({ scheduledFor: '2026-12-20', nextPreventiveAt: null }, NOW),
    ).toBeNull();
    expect(maintenanceTaskNeed({ scheduledFor: null, nextPreventiveAt: null }, NOW)).toBeNull();
  });
});

describe('addDays', () => {
  // feliz
  it('crosses month ends by the calendar', () => {
    expect(addDays('2026-11-28', 7)).toBe('2026-12-05');
  });
});
