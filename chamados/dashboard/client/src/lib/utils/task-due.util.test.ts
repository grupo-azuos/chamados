import { describe, expect, it } from 'vitest';

import { formatDay, taskDueBadge, taskPercentage } from './task-due.util';

const NOW = new Date('2026-11-23T17:00:00Z');

describe('taskDueBadge', () => {
  // feliz
  it('marks the overdue task in red and the one due this week in yellow', () => {
    expect(taskDueBadge({ dueDate: '2026-11-20', dueTime: null, status: 'open' }, NOW)).toEqual({
      label: 'Atrasada · 20/11/2026',
      tone: 'danger',
    });
    expect(taskDueBadge({ dueDate: '2026-11-26', dueTime: '09:00', status: 'open' }, NOW)).toEqual({
      label: 'Vence 26/11/2026 às 09:00',
      tone: 'warning',
    });
  });

  // triste
  it('shows a plain due date for a finished task and nothing without a due date', () => {
    expect(taskDueBadge({ dueDate: '2026-11-20', dueTime: null, status: 'done' }, NOW)?.tone).toBe(
      'neutral',
    );
    expect(taskDueBadge({ dueDate: null, dueTime: null, status: 'open' }, NOW)).toBeNull();
  });
});

describe('formatDay / taskPercentage', () => {
  // feliz
  it('writes the day the Brazilian way and rounds the progress', () => {
    expect(formatDay('2026-03-07')).toBe('07/03/2026');
    expect(taskPercentage({ progress: { done: 1, total: 3 } })).toBe(33);
  });

  // triste
  it('is 0% for a task without steps', () => {
    expect(taskPercentage({ progress: { done: 0, total: 0 } })).toBe(0);
  });
});
