import { describe, expect, it } from 'vitest';

import { isTaskBranch } from './task-branch.util';

const refs = { taskId: 42, ticketId: 56, issueNumber: 85 };

describe('isTaskBranch', () => {
  // feliz
  it('finds the task, the ticket and the issue in the branch name', () => {
    expect(isTaskBranch('feature/tarefa-42-mapa', refs)).toBe(true);
    expect(isTaskBranch('bugfix/task42', refs)).toBe(true);
    expect(isTaskBranch('feature/CH-0056-tela', refs)).toBe(true);
    expect(isTaskBranch('feature/85-tela', refs)).toBe(true);
  });

  // triste
  it('does not take a number that only starts the same', () => {
    expect(isTaskBranch('feature/tarefa-420', refs)).toBe(false);
    expect(isTaskBranch('feature/850-x', refs)).toBe(false);
    expect(isTaskBranch('develop', refs)).toBe(false);
    expect(isTaskBranch('feature/56-x', { taskId: 1, ticketId: null, issueNumber: null })).toBe(
      false,
    );
  });
});
