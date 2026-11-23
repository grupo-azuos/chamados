import { type Ticket } from '@template/shared/schemas/ticket.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { goto } from '$app/navigation';
import { page } from '$app/state';
import { ApiError } from '$lib/api/http-client';
import { type AreaContext } from '$lib/hooks/use-area-context/use-area-context.svelte';

import Harness from './use-ticket-kanban-harness.test.svelte';
import { toKanbanColumns, type TicketKanbanModel } from './use-ticket-kanban.svelte';

vi.mock('$lib/api/tickets.api', () => ({
  ticketsApi: { createHistory: vi.fn(), assigneeOptions: vi.fn(() => Promise.resolve([])) },
}));

const { ticketsApi } = await import('$lib/api/tickets.api');

function ticket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 1,
    protocol: 'CH-0001',
    status: 'open',
    priority: 'high',
    requesterName: 'Bia Costa',
    area: 'sistema',
    department: 'Comercial',
    problemType: 'bug',
    participantAreas: [],
    anydeskId: null,
    contactPhone: '62999990001',
    notifyWhatsapp: false,
    description: 'A tela não abre.',
    screenshotUrl: null,
    computerId: null,
    computerName: null,
    assignee: null,
    solution: null,
    createdAt: '2026-09-15T12:10:00.000Z',
    startedAt: null,
    resolvedAt: null,
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  } as Ticket;
}

const BOARD = [
  ticket({ id: 1, status: 'open' }),
  ticket({ id: 2, status: 'in_progress' }),
  ticket({ id: 3, status: 'waiting_requester' }),
  ticket({ id: 4, status: 'resolved' }),
  ticket({ id: 5, status: 'waiting_third_party' }),
  ticket({ id: 6, status: 'cancelled' }),
];

const ADMIN = { id: 'u-ana', role: 'superadmin' };

/** Quem está na tela: o quadro pergunta pela mesma régua do servidor. */
function signedInAs(user: Record<string, unknown> | undefined) {
  (page as unknown as { data: Record<string, unknown> }).data = { user };
}

function mountModel(input: { tickets?: Ticket[]; area?: AreaContext } = {}): TicketKanbanModel {
  const tickets = input.tickets ?? BOARD;
  let model!: TicketKanbanModel;
  render(Harness, {
    props: {
      area: input.area ?? 'sistema',
      tickets: () => tickets,
      onReady: (ready: TicketKanbanModel) => (model = ready),
    },
  });

  return model;
}

const idsOf = (model: TicketKanbanModel, column: number) =>
  model.data.columns[column]?.tickets.map((item) => item.id);

describe('toKanbanColumns', () => {
  // feliz
  it('puts each ticket in the column of its own stage, every stage in order', () => {
    expect(toKanbanColumns(BOARD).map((column) => [column.id, column.tickets.map((t) => t.id)])).toEqual([
      ['open', [1]],
      ['requester_reply', []],
      ['in_progress', [2]],
      ['waiting_requester', [3]],
      ['waiting_third_party', [5]],
      ['resolved', [4]],
      ['resolved_with_caveats', []],
      ['cancelled', [6]],
    ]);
    expect(toKanbanColumns(BOARD).map((column) => column.title)).toContain('Encerrado com ressalva');
  });

  // triste
  it('keeps every stage column even without any ticket', () => {
    expect(toKanbanColumns([]).map((column) => column.tickets.length)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

describe('useTicketKanbanModel', () => {
  beforeEach(() => {
    localStorage.clear();
    signedInAs(ADMIN);
    vi.mocked(goto).mockClear();
    vi.mocked(ticketsApi.createHistory).mockReset().mockResolvedValue({} as never);
  });

  // feliz
  it('starts a queued ticket right away when it is dragged to "in progress", optimistically', async () => {
    const model = mountModel();

    const move = model.actions.onMoveTicket(1, 'in_progress');
    expect(idsOf(model, 2)).toContain(1);
    await move;

    expect(ticketsApi.createHistory).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ type: 'start', description: 'Iniciado atendimento via Kanban.' }),
      [],
    );
    expect(model.data.pendingMove).toBeNull();
    expect(model.state.moveError).toBeNull();
  });

  it('resumes a ticket that was waiting on a third party', async () => {
    const model = mountModel();

    await model.actions.onMoveTicket(5, 'in_progress');

    expect(ticketsApi.createHistory).toHaveBeenCalledWith(5, expect.objectContaining({ type: 'resume' }), []);
  });

  /* Encerrar pede a solução: o quadro abre o formulário já na Solução, e nada é lançado antes de
     confirmar. */
  it('opens the history form on the solution when the ticket is dragged to "Resolvido"', async () => {
    const model = mountModel();

    await model.actions.onMoveTicket(2, 'resolved');

    expect(ticketsApi.createHistory).not.toHaveBeenCalled();
    expect(model.data.pendingMove).toMatchObject({
      ticket: { id: 2 },
      target: 'resolved',
      targetTitle: 'Resolvido',
      types: ['resolution'],
      initialType: 'resolution',
    });
    /* O cartão não sai do lugar enquanto o diálogo está aberto. */
    expect(idsOf(model, 2)).toEqual([2]);
  });

  it('opens the form on the exact history of each column: caveat, cancellation, waiting, reopening', async () => {
    const model = mountModel();
    const typesOn = async (ticketId: number, target: Parameters<typeof model.actions.onMoveTicket>[1]) => {
      await model.actions.onMoveTicket(ticketId, target);
      const types = model.data.pendingMove?.types;
      model.actions.onCancelMove();

      return types;
    };

    expect(await typesOn(2, 'resolved_with_caveats')).toEqual(['closure_with_caveats']);
    expect(await typesOn(1, 'cancelled')).toEqual(['cancellation']);
    expect(await typesOn(2, 'waiting_requester')).toEqual(['waiting_requester']);
    expect(await typesOn(3, 'waiting_third_party')).toEqual(['waiting_third_party']);
    expect(await typesOn(4, 'in_progress')).toEqual(['reopening']);
    expect(ticketsApi.createHistory).not.toHaveBeenCalled();
  });

  it('closes the form once the history is recorded', async () => {
    const model = mountModel();
    await model.actions.onMoveTicket(2, 'resolved');

    model.actions.onMoveRecorded();

    expect(model.data.pendingMove).toBeNull();
  });

  it('remembers the label chosen for a card in the browser', () => {
    const model = mountModel();

    model.actions.onSetCardColor(2, 'warning');

    expect(model.data.cardColors).toEqual({ 2: 'warning' });
    expect(JSON.parse(localStorage.getItem('azuos_kanban_card_colors') ?? '{}')).toEqual({ 2: 'warning' });
  });

  it('gives each assignee photo by the person id, asking the people of the area', async () => {
    vi.mocked(ticketsApi.assigneeOptions).mockResolvedValueOnce([
      { id: 'u-ana', name: 'Ana', avatarUrl: 'https://cdn.example/ana.png' },
      { id: 'u-bia', name: 'Bia' },
    ]);
    const model = mountModel({ area: 'manutencao' });

    await waitFor(() =>
      expect(model.data.assigneePhotos).toEqual({ 'u-ana': 'https://cdn.example/ana.png', 'u-bia': null }),
    );
    expect(ticketsApi.assigneeOptions).toHaveBeenCalledWith('manutencao');
  });

  it('opens the ticket inside the area of the queue', () => {
    const model = mountModel({ area: 'infra' });

    model.actions.onOpenTicket(2);

    expect(goto).toHaveBeenCalledWith('/infra/tickets/2');
  });

  // triste
  it('cancelling the form leaves the card where it was, with nothing recorded', async () => {
    const model = mountModel();
    await model.actions.onMoveTicket(2, 'resolved');

    model.actions.onCancelMove();

    expect(model.data.pendingMove).toBeNull();
    expect(idsOf(model, 2)).toEqual([2]);
    expect(ticketsApi.createHistory).not.toHaveBeenCalled();
  });

  it('does not start another move while the form is open', async () => {
    const model = mountModel();
    await model.actions.onMoveTicket(2, 'resolved');

    await model.actions.onMoveTicket(1, 'in_progress');

    expect(ticketsApi.createHistory).not.toHaveBeenCalled();
    expect(model.data.pendingMove?.ticket.id).toBe(2);
  });

  it('does nothing when the card is dropped on its own column or is not on the board', async () => {
    const model = mountModel();

    await model.actions.onMoveTicket(3, 'waiting_requester');
    await model.actions.onMoveTicket(999, 'resolved');

    expect(ticketsApi.createHistory).not.toHaveBeenCalled();
    expect(model.data.pendingMove).toBeNull();
  });

  it('refuses moves no history can make, explaining why', async () => {
    const model = mountModel();

    await model.actions.onMoveTicket(2, 'open');
    expect(model.state.moveError).toContain('não volta para "Aberto"');

    await model.actions.onMoveTicket(2, 'requester_reply');
    expect(model.state.moveError).toContain('quem abriu o chamado');

    await model.actions.onMoveTicket(4, 'cancelled');
    expect(model.state.moveError).toContain('reabertura');
    expect(ticketsApi.createHistory).not.toHaveBeenCalled();

    model.actions.onClearMoveError();
    expect(model.state.moveError).toBeNull();
  });

  it('rolls the card back and shows the server message when the move fails', async () => {
    vi.mocked(ticketsApi.createHistory).mockRejectedValue(
      new ApiError(403, 'Seu acesso a estas áreas é só de consulta — não atende chamados.'),
    );
    const model = mountModel();

    await model.actions.onMoveTicket(1, 'in_progress');

    expect(model.state.moveError).toContain('só de consulta');
    expect(idsOf(model, 0)).toEqual([1]);
    expect(idsOf(model, 2)).toEqual([2]);
  });

  it('explains a refused move with a generic message when the server said nothing', async () => {
    vi.mocked(ticketsApi.createHistory).mockRejectedValueOnce(null as never);
    const model = mountModel();

    await model.actions.onMoveTicket(1, 'in_progress');

    expect(model.state.moveError).toMatch(/Não foi possível movimentar/);
  });

  it('does not start a second move while the first is on the way', async () => {
    let finish!: () => void;
    vi.mocked(ticketsApi.createHistory).mockReturnValue(
      new Promise((resolve) => {
        finish = () => resolve({} as never);
      }),
    );
    const model = mountModel();

    const first = model.actions.onMoveTicket(1, 'in_progress');
    await waitFor(() => expect(model.state.isMoving).toBe(true));
    await model.actions.onMoveTicket(5, 'in_progress');
    expect(ticketsApi.createHistory).toHaveBeenCalledTimes(1);
    finish();
    await first;
  });

  it('ignores a corrupted label store', () => {
    localStorage.setItem('azuos_kanban_card_colors', '{nao-e-json');

    expect(mountModel().data.cardColors).toEqual({});
  });
});

describe('useTicketKanbanModel — who can drag', () => {
  beforeEach(() => {
    vi.mocked(ticketsApi.createHistory).mockReset().mockResolvedValue({} as never);
  });

  // feliz
  it('lets an Administrator of a participant area move the ticket', async () => {
    signedInAs({ id: 'u-rui', role: 'admin', roles: { infra: 'user', manutencao: 'admin' } });
    const model = mountModel({
      area: 'infra',
      tickets: [ticket({ id: 8, area: 'infra', participantAreas: ['manutencao'] })],
    });

    expect(model.data.lockedTicketIds).toEqual([]);
    await model.actions.onMoveTicket(8, 'in_progress');
    expect(ticketsApi.createHistory).toHaveBeenCalled();
  });

  // triste
  /* Quem só consulta a área vê o quadro, mas o cartão fica parado — e nada é pedido à API. */
  it('locks every card for who only reads the area, and moves nothing', async () => {
    signedInAs({ id: 'u-leo', role: 'manager', roles: { sistema: 'user' } });
    const model = mountModel();

    expect(model.data.lockedTicketIds).toEqual([1, 2, 3, 4, 5, 6]);
    await model.actions.onMoveTicket(1, 'in_progress');
    await model.actions.onMoveTicket(2, 'resolved');

    expect(ticketsApi.createHistory).not.toHaveBeenCalled();
    expect(model.data.pendingMove).toBeNull();
  });
});
