import { describe, expect, it } from 'vitest';

import { type GithubIssueEvent, ticketHistoryOfIssueEvent } from './github-issue-sync.util';

function event(overrides: Partial<GithubIssueEvent> = {}): GithubIssueEvent {
  return {
    action: 'closed',
    stateReason: 'completed',
    issueNumber: 85,
    senderLogin: 'vinicius-gpl',
    closingComment: null,
    ...overrides,
  };
}

describe('ticketHistoryOfIssueEvent', () => {
  // feliz
  it('closes an open ticket with the comment written when the issue was closed', () => {
    const entry = ticketHistoryOfIssueEvent(
      event({ closingComment: '  Corrigido no PR #90.  ' }),
      'in_progress',
    );

    expect(entry).toEqual({ type: 'resolution', description: 'Corrigido no PR #90.' });
  });

  // feliz
  it('says who closed it when the issue was closed without a comment', () => {
    expect(ticketHistoryOfIssueEvent(event(), 'open')?.description).toBe(
      'Issue #85 fechada no GitHub por @vinicius-gpl.',
    );
  });

  // feliz
  it('turns "close as not planned" into a cancellation', () => {
    expect(ticketHistoryOfIssueEvent(event({ stateReason: 'not_planned' }), 'open')?.type).toBe(
      'cancellation',
    );
  });

  // feliz
  it('reopens a closed ticket when the issue is reopened', () => {
    expect(ticketHistoryOfIssueEvent(event({ action: 'reopened' }), 'resolved')).toEqual({
      type: 'reopening',
      description: 'Issue #85 reaberta no GitHub por @vinicius-gpl.',
    });
  });

  // triste
  /* O eco: o sistema fechou a issue ao encerrar o chamado, e o GitHub avisa de volta. */
  it('ignores the closing of an issue whose ticket is already closed', () => {
    expect(ticketHistoryOfIssueEvent(event(), 'resolved')).toBeNull();
    expect(ticketHistoryOfIssueEvent(event(), 'cancelled')).toBeNull();
  });

  // triste
  it('ignores the reopening of an issue whose ticket is still open', () => {
    expect(ticketHistoryOfIssueEvent(event({ action: 'reopened' }), 'in_progress')).toBeNull();
  });

  // triste
  it('ignores every other issue action', () => {
    for (const action of ['opened', 'edited', 'labeled', 'assigned']) {
      expect(ticketHistoryOfIssueEvent(event({ action }), 'open')).toBeNull();
    }
  });
});
