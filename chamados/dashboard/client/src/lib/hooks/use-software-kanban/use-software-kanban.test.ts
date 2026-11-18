import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';
import { type Ticket } from '@template/shared/schemas/ticket.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-software-kanban-harness.test.svelte';
import { type SoftwareKanbanModel } from './use-software-kanban.svelte';

vi.mock('$lib/api/software-projects.api', () => ({
  softwareProjectsApi: { list: vi.fn() },
}));

vi.mock('$lib/api/tickets.api', () => ({
  ticketsApi: { list: vi.fn(), createHistory: vi.fn() },
}));

const { softwareProjectsApi } = await import('$lib/api/software-projects.api');
const { ticketsApi } = await import('$lib/api/tickets.api');
const { goto } = await import('$app/navigation');

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

function project(overrides: Partial<SoftwareProject> = {}): SoftwareProject {
  return {
    id: 1,
    name: 'Chamados',
    description: null,
    repositoryUrl: 'org/chamados',
    status: 'active',
    color: 'blue',
    githubRepoOwner: 'org',
    githubRepoName: 'chamados',
    responsibleId: null,
    responsibleName: null,
    openTicketsCount: 0,
    pullRequestsCount: 0,
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: null,
    ...overrides,
  };
}

const page = <T,>(items: T[]) => ({ items, total: items.length, page: 1, pageSize: 200 });

const BOARD = [
  ticket({ id: 1, status: 'open' }),
  ticket({ id: 2, status: 'in_progress' }),
  ticket({ id: 3, status: 'waiting_requester' }),
  ticket({ id: 4, status: 'resolved' }),
  ticket({ id: 5, status: 'waiting_third_party' }),
  ticket({ id: 6, status: 'cancelled' }),
];

function mountModel(): SoftwareKanbanModel {
  let model!: SoftwareKanbanModel;
  render(Harness, { props: { onReady: (ready: SoftwareKanbanModel) => (model = ready) } });

  return model;
}

async function mountLoadedModel(): Promise<SoftwareKanbanModel> {
  const model = mountModel();
  /* Como a tela: lê o quadro E a situação. Só a situação, lida em laço, nunca assenta — o
     espelho da consulta só anda quando os dados também são lidos. */
  await vi.waitFor(
    () => {
      expect(model.data.columns).toHaveLength(4);
      expect(model.state.isLoading).toBe(false);
    },
    { timeout: 4_000 },
  );

  return model;
}

describe('useSoftwareKanbanModel', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(softwareProjectsApi.list).mockResolvedValue(page([project()]));
    vi.mocked(ticketsApi.list).mockResolvedValue(page(BOARD));
    vi.mocked(ticketsApi.createHistory).mockResolvedValue({} as never);
  });

  // feliz
  it('splits the tickets of the System area into the four columns', async () => {
    const model = await mountLoadedModel();

    expect(ticketsApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ area: 'sistema', projectId: undefined }),
    );
    expect(model.data.columns.map((column) => [column.id, column.tickets.length])).toEqual([
      ['todo', 1],
      ['in_progress', 1],
      ['waiting', 2],
      ['done', 2],
    ]);
    expect(model.data.totalTickets).toBe(6);
    expect(model.data.projects).toHaveLength(1);
    expect(model.state.isEmpty).toBe(false);
  });

  it('asks the server again for the tickets of the chosen system', async () => {
    const model = await mountLoadedModel();

    model.actions.onSelectProject(1);

    await waitFor(() =>
      expect(ticketsApi.list).toHaveBeenCalledWith(expect.objectContaining({ projectId: 1 })),
    );
    expect(model.data.selectedProjectId).toBe(1);
  });

  it('starts the attendance when a queued ticket is dragged to "in progress", optimistically', async () => {
    const model = await mountLoadedModel();

    const move = model.actions.onMoveTicket(1, 'in_progress');
    expect(model.data.columns[1]?.tickets.map((item) => item.id)).toContain(1);
    await move;

    expect(ticketsApi.createHistory).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ type: 'start', description: 'Iniciado atendimento via Kanban.' }),
      [],
    );
    expect(model.state.moveError).toBeNull();
  });

  it('chooses the right history for each move', async () => {
    const model = await mountLoadedModel();
    const moves: [number, 'in_progress' | 'waiting' | 'done', string][] = [
      [3, 'in_progress', 'resume'],
      [2, 'waiting', 'waiting_requester'],
      [2, 'done', 'resolution'],
      [4, 'in_progress', 'reopening'],
    ];

    for (const [ticketId, column, expectedType] of moves) {
      vi.mocked(ticketsApi.createHistory).mockClear();
      await model.actions.onMoveTicket(ticketId, column);
      expect(ticketsApi.createHistory).toHaveBeenCalledWith(
        ticketId,
        expect.objectContaining({ type: expectedType }),
        [],
      );
    }
  });

  it('remembers the color chosen for a card in the browser', async () => {
    const model = await mountLoadedModel();

    model.actions.onSetCardColor(2, 'rose');

    expect(model.data.cardColors).toEqual({ 2: 'rose' });
    expect(JSON.parse(localStorage.getItem('azuos_kanban_card_colors') ?? '{}')).toEqual({
      2: 'rose',
    });
  });

  it('opens the ticket inside the System context', async () => {
    const model = await mountLoadedModel();

    model.actions.onOpenTicket(2);

    expect(goto).toHaveBeenCalledWith(expect.stringContaining('/tickets/2'));
  });

  // triste
  it('does nothing when the card is dropped on its own column or a missing ticket', async () => {
    const model = await mountLoadedModel();

    await model.actions.onMoveTicket(1, 'todo');
    await model.actions.onMoveTicket(4, 'done');
    await model.actions.onMoveTicket(999, 'done');

    expect(ticketsApi.createHistory).not.toHaveBeenCalled();
  });

  it('refuses moves the domain does not accept, explaining why', async () => {
    const model = await mountLoadedModel();

    await model.actions.onMoveTicket(2, 'todo');
    expect(model.state.moveError).toContain('não volta para "A Fazer"');

    await model.actions.onMoveTicket(4, 'waiting');
    expect(model.state.moveError).toContain('Reabra o chamado');
    expect(ticketsApi.createHistory).not.toHaveBeenCalled();

    model.actions.onClearMoveError();
    expect(model.state.moveError).toBeNull();
  });

  it('rolls the card back and shows the server message when the move fails', async () => {
    vi.mocked(ticketsApi.createHistory).mockRejectedValue(
      new ApiError(403, 'Seu perfil não permite atender chamados.'),
    );
    const model = await mountLoadedModel();

    await model.actions.onMoveTicket(1, 'in_progress');

    expect(model.state.moveError).toBe('Seu perfil não permite atender chamados.');
    expect(model.data.columns[0]?.tickets.map((item) => item.id)).toContain(1);
  });

  it('shows the error of the queue and retries on demand', async () => {
    vi.mocked(ticketsApi.list).mockRejectedValueOnce(new ApiError(500, 'Banco fora do ar.'));
    const model = mountModel();

    await waitFor(() => expect(model.state.error).toBe('Banco fora do ar.'));
    expect(model.state.isEmpty).toBe(true);

    model.actions.onRetry();
    await waitFor(() => expect(model.state.error).toBeNull());
  });

  it('ignores a corrupted color store', async () => {
    localStorage.setItem('azuos_kanban_card_colors', '{nao-e-json');
    const model = await mountLoadedModel();

    expect(model.data.cardColors).toEqual({});
  });
});

describe('useSoftwareKanbanModel — closed tickets, busy moves and retry', () => {
  beforeEach(() => {
    vi.mocked(softwareProjectsApi.list).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 100 });
    vi.mocked(ticketsApi.list).mockResolvedValue({
      items: [ticket({ id: 1, status: 'resolved' }), ticket({ id: 2, status: 'open' })],
      total: 2,
      page: 1,
      pageSize: 200,
    });
    vi.mocked(ticketsApi.createHistory).mockReset();
  });

  // triste
  it('refuses to put a closed ticket on hold and ignores dropping it on "done" again', async () => {
    const model = await mountLoadedModel();

    await model.actions.onMoveTicket(1, 'waiting');
    expect(model.state.moveError).toMatch(/Reabra o chamado/);
    model.actions.onClearMoveError();
    expect(model.state.moveError).toBeNull();

    await model.actions.onMoveTicket(1, 'done');
    expect(ticketsApi.createHistory).not.toHaveBeenCalled();
  });

  // triste
  it('does not start a second move while the first is on the way', async () => {
    let finish!: () => void;
    vi.mocked(ticketsApi.createHistory).mockReturnValue(
      new Promise((resolve) => {
        finish = () => resolve({} as never);
      }),
    );
    const model = await mountLoadedModel();

    const first = model.actions.onMoveTicket(2, 'in_progress');
    await waitFor(() => expect(ticketsApi.createHistory).toHaveBeenCalledTimes(1));
    await model.actions.onMoveTicket(1, 'in_progress');
    expect(ticketsApi.createHistory).toHaveBeenCalledTimes(1);
    finish();
    await first;
  });

  // feliz
  it('clears the move error and asks the server again on retry', async () => {
    const model = await mountLoadedModel();
    await model.actions.onMoveTicket(1, 'waiting');
    vi.mocked(ticketsApi.list).mockClear();

    model.actions.onRetry();

    expect(model.state.moveError).toBeNull();
    await waitFor(() => expect(ticketsApi.list).toHaveBeenCalled());
  });
});

describe('useSoftwareKanbanModel — every move the board accepts', () => {
  beforeEach(() => {
    vi.mocked(softwareProjectsApi.list).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 100 });
    vi.mocked(ticketsApi.list).mockResolvedValue({
      items: [
        ticket({ id: 1, status: 'waiting_third_party' }),
        ticket({ id: 2, status: 'in_progress' }),
        ticket({ id: 3, status: 'resolved' }),
      ],
      total: 3,
      page: 1,
      pageSize: 200,
    });
    vi.mocked(ticketsApi.createHistory).mockReset().mockResolvedValue({} as never);
  });

  // feliz
  it('resumes a ticket waiting on a third party, resolves one in progress and reopens a closed one', async () => {
    const model = await mountLoadedModel();

    await model.actions.onMoveTicket(1, 'in_progress');
    expect(vi.mocked(ticketsApi.createHistory).mock.calls.at(-1)?.[1]).toMatchObject({ type: 'resume' });
    await model.actions.onMoveTicket(2, 'done');
    expect(vi.mocked(ticketsApi.createHistory).mock.calls.at(-1)?.[1]).toMatchObject({ type: 'resolution' });
    await model.actions.onMoveTicket(3, 'in_progress');
    expect(vi.mocked(ticketsApi.createHistory).mock.calls.at(-1)?.[1]).toMatchObject({ type: 'reopening' });
    /* Soltar na própria coluna não registra nada. */
    const calls = vi.mocked(ticketsApi.createHistory).mock.calls.length;
    await model.actions.onMoveTicket(2, 'in_progress');
    expect(ticketsApi.createHistory).toHaveBeenCalledTimes(calls);
  });

  // triste
  it('explains a refused move with a generic message when the server said nothing', async () => {
    vi.mocked(ticketsApi.createHistory).mockRejectedValueOnce(null as never);
    const model = await mountLoadedModel();

    await model.actions.onMoveTicket(2, 'done');

    expect(model.state.moveError).toMatch(/Não foi possível movimentar/);
  });
});

describe('useSoftwareKanbanModel — waiting on third parties, and moves before the board loads', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(softwareProjectsApi.list).mockResolvedValue(page([project()]));
    vi.mocked(ticketsApi.list).mockResolvedValue(page(BOARD));
    vi.mocked(ticketsApi.createHistory).mockReset().mockResolvedValue({} as never);
  });

  // feliz
  it('resumes a ticket that was waiting on a third party', async () => {
    const model = await mountLoadedModel();

    await model.actions.onMoveTicket(5, 'in_progress');

    expect(ticketsApi.createHistory).toHaveBeenCalledWith(5, expect.objectContaining({ type: 'resume' }), []);
  });

  // triste
  it('resolves a ticket dragged from the waiting column to done', async () => {
    const model = await mountLoadedModel();

    await model.actions.onMoveTicket(3, 'done');

    expect(ticketsApi.createHistory).toHaveBeenCalledWith(3, expect.objectContaining({ type: 'resolution' }), []);
  });

  it('ignores a move asked before the board arrived', async () => {
    vi.mocked(ticketsApi.list).mockReturnValue(new Promise(() => undefined));
    const model = mountModel();

    await model.actions.onMoveTicket(1, 'in_progress');

    expect(ticketsApi.createHistory).not.toHaveBeenCalled();
  });
});
