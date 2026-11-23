import { describe, expect, it } from 'vitest';

import { TICKET_STATUSES, ticketStatusLabel } from './ticket-status.util';
import { TICKET_KANBAN_COLUMNS, ticketKanbanMove, ticketKanbanTitle } from './ticket-kanban.util';

describe('TICKET_KANBAN_COLUMNS', () => {
  // feliz
  it('has one column per stage of the ticket, in the order the work goes, with the name of the stage', () => {
    expect(TICKET_KANBAN_COLUMNS.map((column) => column.status)).toEqual([...TICKET_STATUSES]);
    expect(TICKET_KANBAN_COLUMNS.map((column) => column.title)).toEqual([
      'Aberto',
      'Retorno do solicitante',
      'Em atendimento',
      'Aguardando solicitante',
      'Aguardando terceiro',
      'Resolvido',
      'Encerrado com ressalva',
      'Cancelado',
    ]);
  });

  // triste
  it('never names a column differently from the stage badge', () => {
    for (const status of TICKET_STATUSES) expect(ticketKanbanTitle(status)).toBe(ticketStatusLabel(status));
  });
});

describe('ticketKanbanMove', () => {
  // feliz
  it('starts a queued ticket and resumes a waiting one right away, with the text of the board', () => {
    expect(ticketKanbanMove('open', 'in_progress')).toEqual({
      kind: 'direct',
      type: 'start',
      description: 'Iniciado atendimento via Kanban.',
    });
    expect(ticketKanbanMove('requester_reply', 'in_progress')).toMatchObject({ kind: 'direct', type: 'start' });
    expect(ticketKanbanMove('waiting_third_party', 'in_progress')).toEqual({
      kind: 'direct',
      type: 'resume',
      description: 'Retomado o atendimento via Kanban.',
    });
  });

  it('opens the form already on the one history that leads to each closing column', () => {
    expect(ticketKanbanMove('in_progress', 'resolved')).toEqual({
      kind: 'dialog',
      types: ['resolution'],
      initialType: 'resolution',
    });
    expect(ticketKanbanMove('open', 'resolved_with_caveats')).toEqual({
      kind: 'dialog',
      types: ['closure_with_caveats'],
      initialType: 'closure_with_caveats',
    });
    expect(ticketKanbanMove('waiting_requester', 'cancelled')).toEqual({
      kind: 'dialog',
      types: ['cancellation'],
      initialType: 'cancellation',
    });
  });

  it('asks why the ticket waits, for whom, and why a closed ticket is reopened', () => {
    expect(ticketKanbanMove('in_progress', 'waiting_requester')).toEqual({
      kind: 'dialog',
      types: ['waiting_requester'],
      initialType: 'waiting_requester',
    });
    expect(ticketKanbanMove('waiting_requester', 'waiting_third_party')).toEqual({
      kind: 'dialog',
      types: ['waiting_third_party'],
      initialType: 'waiting_third_party',
    });
    expect(ticketKanbanMove('resolved', 'in_progress')).toEqual({
      kind: 'dialog',
      types: ['reopening'],
      initialType: 'reopening',
    });
  });

  // triste
  it('does nothing when the card goes back to the column it was in', () => {
    expect(ticketKanbanMove('waiting_requester', 'waiting_requester')).toEqual({ kind: 'none' });
    expect(ticketKanbanMove('cancelled', 'cancelled')).toEqual({ kind: 'none' });
  });

  it('refuses what no history of who attends can do, explaining the way that works', () => {
    expect(ticketKanbanMove('in_progress', 'open')).toEqual({
      kind: 'refused',
      message:
        'Um chamado não volta para "Aberto". Para pausá-lo, mova para "Aguardando solicitante" ou "Aguardando terceiro".',
    });
    expect(ticketKanbanMove('open', 'requester_reply')).toMatchObject({
      kind: 'refused',
      message: expect.stringContaining('quem abriu o chamado'),
    });
    expect(ticketKanbanMove('resolved', 'waiting_requester')).toMatchObject({
      kind: 'refused',
      message: expect.stringContaining('reabertura'),
    });
    expect(ticketKanbanMove('cancelled', 'resolved')).toMatchObject({ kind: 'refused' });
    expect(ticketKanbanMove('resolved_with_caveats', 'open')).toMatchObject({
      kind: 'refused',
      message: expect.stringContaining('encerrado'),
    });
  });
});
