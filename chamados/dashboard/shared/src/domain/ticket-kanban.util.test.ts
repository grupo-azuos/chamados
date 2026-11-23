import { describe, expect, it } from 'vitest';

import { TICKET_KANBAN_COLUMNS, ticketKanbanMove, ticketKanbanTitle } from './ticket-kanban.util';

describe('TICKET_KANBAN_COLUMNS', () => {
  // feliz
  it('has one column per moment of the ticket, in the order the work goes', () => {
    expect(TICKET_KANBAN_COLUMNS.map((column) => column.phase)).toEqual([
      'queue',
      'working',
      'waiting',
      'closed',
    ]);
    expect(ticketKanbanTitle('closed')).toBe('Concluído');
  });
});

describe('ticketKanbanMove', () => {
  // feliz
  it('starts a queued ticket and resumes a waiting one right away, with the text of the board', () => {
    expect(ticketKanbanMove('open', 'working')).toEqual({
      kind: 'direct',
      type: 'start',
      description: 'Iniciado atendimento via Kanban.',
    });
    expect(ticketKanbanMove('requester_reply', 'working')).toMatchObject({ kind: 'direct', type: 'start' });
    expect(ticketKanbanMove('waiting_third_party', 'working')).toMatchObject({
      kind: 'direct',
      type: 'resume',
    });
  });

  it('asks for the solution before closing, offering every way to close', () => {
    expect(ticketKanbanMove('in_progress', 'closed')).toEqual({
      kind: 'dialog',
      types: ['resolution', 'closure_with_caveats', 'cancellation'],
      initialType: 'resolution',
    });
  });

  it('asks who the ticket waits for, and why a closed ticket is reopened', () => {
    expect(ticketKanbanMove('in_progress', 'waiting')).toEqual({
      kind: 'dialog',
      types: ['waiting_requester', 'waiting_third_party'],
      initialType: 'waiting_requester',
    });
    expect(ticketKanbanMove('resolved', 'working')).toEqual({
      kind: 'dialog',
      types: ['reopening'],
      initialType: 'reopening',
    });
  });

  // triste
  it('does nothing when the card goes back to the column it was in', () => {
    expect(ticketKanbanMove('waiting_requester', 'waiting')).toEqual({ kind: 'none' });
    expect(ticketKanbanMove('cancelled', 'closed')).toEqual({ kind: 'none' });
  });

  it('refuses what no history can do, explaining the way that works', () => {
    expect(ticketKanbanMove('in_progress', 'queue')).toMatchObject({
      kind: 'refused',
      message: expect.stringContaining('não volta para "A fazer"'),
    });
    expect(ticketKanbanMove('resolved', 'waiting')).toMatchObject({
      kind: 'refused',
      message: expect.stringContaining('reabertura'),
    });
    expect(ticketKanbanMove('cancelled', 'queue')).toMatchObject({ kind: 'refused' });
  });
});
