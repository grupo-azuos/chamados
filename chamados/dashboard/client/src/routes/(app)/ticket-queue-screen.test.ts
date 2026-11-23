import { type Ticket } from '@template/shared/schemas/ticket.schema';
import { fireEvent, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { page } from '$app/state';
import { type AreaContext } from '$lib/hooks/use-area-context/use-area-context.svelte';

import { renderPage, visiting } from '../route-page.test-support';
import Screen from './ticket-queue-screen.svelte';

vi.mock('$lib/api/tickets.api', () => ({
  ticketsApi: {
    list: vi.fn(),
    dashboard: vi.fn(),
    assigneeOptions: vi.fn(() => Promise.resolve([])),
    exportReport: vi.fn(),
    createHistory: vi.fn(),
    people: vi.fn(() => Promise.resolve({ watchers: [], notifiable: [] })),
  },
}));

vi.mock('$lib/api/software-projects.api', () => ({
  softwareProjectsApi: {
    list: vi.fn(() =>
      Promise.resolve({ items: [{ id: 7, name: 'Portal do cliente' }], total: 1, page: 1, pageSize: 100 }),
    ),
  },
}));

/* Os departamentos (RH) não são assunto desta tela: respondem vazio. */
vi.mock('$lib/api/http-client', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();

  return { ...original, apiRequest: vi.fn(() => Promise.resolve([])) };
});

const { ticketsApi } = await import('$lib/api/tickets.api');

function ticket(area: AreaContext, overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 31,
    protocol: 'CH-0031',
    status: 'in_progress',
    priority: 'medium',
    requesterName: 'Bia Costa',
    area,
    department: 'financeiro',
    problemType: 'other',
    participantAreas: [],
    anydeskId: null,
    contactPhone: null,
    notifyWhatsapp: false,
    description: 'Preciso de ajuda com a minha mesa.',
    screenshotUrl: null,
    computerId: null,
    computerName: null,
    assignee: null,
    solution: null,
    createdAt: '2026-11-02T12:00:00.000Z',
    startedAt: null,
    resolvedAt: null,
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

const DASHBOARD = {
  total: 1,
  open: 0,
  inProgress: 1,
  waiting: 0,
  resolved: 0,
  cancelled: 0,
  averageResolutionHours: null,
  byProblemType: [],
  byDepartment: [],
};

const AREAS: [AreaContext, string][] = [
  ['infra', '/infra/tickets'],
  ['sistema', '/system/tickets'],
  ['manutencao', '/maintenance/tickets'],
];

function opening(path: string) {
  (page as unknown as { url: URL }).url = new URL(`http://localhost:5173${path}`);
}

describe('the ticket queue on the board, in each area', () => {
  beforeEach(() => {
    /* A escolha de lista ou quadro fica guardada por pessoa: cada teste começa sem nada guardado. */
    localStorage.clear();
    visiting({});
    vi.mocked(ticketsApi.dashboard).mockResolvedValue(DASHBOARD);
    vi.mocked(ticketsApi.list).mockReset();
  });

  // feliz
  it.each(AREAS)('shows the %s queue in columns, with every ticket of the cut', async (area, path) => {
    opening(`${path}?view=kanban`);
    vi.mocked(ticketsApi.list).mockResolvedValue({ items: [ticket(area)], total: 1, page: 1, pageSize: 200 });

    renderPage(Screen as never, { area });

    expect(await screen.findByRole('heading', { name: 'Em atendimento' })).toBeInTheDocument();
    for (const title of ['A fazer / triagem', 'Aguardando', 'Concluído']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Mover o chamado CH-0031' })).toBeInTheDocument();
    expect(ticketsApi.list).toHaveBeenCalledWith(expect.objectContaining({ area, page: 1, pageSize: 200 }));
  });

  it('applies the search of the queue to the board', async () => {
    opening('/maintenance/tickets?view=kanban');
    vi.mocked(ticketsApi.list).mockResolvedValue({ items: [ticket('manutencao')], total: 1, page: 1, pageSize: 200 });
    renderPage(Screen as never, { area: 'manutencao' });
    await screen.findByRole('heading', { name: 'Em atendimento' });

    await fireEvent.input(screen.getByRole('textbox', { name: 'Buscar' }), { target: { value: 'mesa' } });

    await waitFor(() =>
      expect(ticketsApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'mesa', area: 'manutencao', pageSize: 200 }),
      ),
    );
  });

  // triste
  it('shows the list, and not the board, when the address does not ask for it', async () => {
    opening('/infra/tickets');
    vi.mocked(ticketsApi.list).mockResolvedValue({ items: [ticket('infra')], total: 1, page: 1, pageSize: 15 });

    renderPage(Screen as never, { area: 'infra' });

    await waitFor(() => expect(ticketsApi.list).toHaveBeenCalledWith(expect.objectContaining({ pageSize: 15 })));
    expect(screen.queryByRole('region', { name: 'Quadro dos chamados' })).not.toBeInTheDocument();
  });

  it('keeps the cards still for who only reads the area', async () => {
    visiting({}, { ...visitingAdmin(), role: 'user', roles: { infra: 'user' } } as never);
    opening('/infra/tickets?view=kanban');
    vi.mocked(ticketsApi.list).mockResolvedValue({ items: [ticket('infra')], total: 1, page: 1, pageSize: 200 });

    renderPage(Screen as never, { area: 'infra' });

    expect(await screen.findByRole('button', { name: 'Mover o chamado CH-0031' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByText(/só de consulta/)).toBeInTheDocument();
  });
});

function visitingAdmin() {
  return (page as unknown as { data: { user: Record<string, unknown> } }).data.user;
}
