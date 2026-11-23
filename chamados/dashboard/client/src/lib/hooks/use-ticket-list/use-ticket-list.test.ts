import { type Ticket } from '@template/shared/schemas/ticket.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { replaceState } from '$app/navigation';
import { page as currentPage } from '$app/state';
import { type AreaContext } from '$lib/hooks/use-area-context/use-area-context.svelte';
import { ApiError } from '$lib/api/http-client';
import { triggerBrowserDownload } from '$lib/utils/download-file.util';
import Harness from './use-ticket-list-harness.test.svelte';
import {
  TICKETS_BOARD_SIZE,
  toAssigneeFilterOptions,
  toProjectFilterOptions,
  type TicketListModel,
} from './use-ticket-list.svelte';

vi.mock('$lib/api/tickets.api', () => ({
  ticketsApi: {
    list: vi.fn(),
    dashboard: vi.fn(),
    update: vi.fn(),
    exportReport: vi.fn(),
    assigneeOptions: vi.fn(),
  },
}));

vi.mock('$lib/api/software-projects.api', () => ({
  softwareProjectsApi: { list: vi.fn() },
}));

vi.mock('$lib/utils/download-file.util', () => ({ triggerBrowserDownload: vi.fn() }));

const { ticketsApi } = await import('$lib/api/tickets.api');
const { softwareProjectsApi } = await import('$lib/api/software-projects.api');

function ticket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 1,
    protocol: 'CH-0001',
    status: 'open',
    priority: 'high',
    requesterName: 'Bia Costa',
    area: 'infra',
    department: 'financeiro',
    problemType: 'printer',
    participantAreas: [],
    anydeskId: null,
    contactPhone: '62999990001',
    notifyWhatsapp: false,
    description: 'A impressora não puxa papel.',
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
  };
}

function page(items: Ticket[], total = items.length) {
  return { items, total, page: 1, pageSize: 200 };
}

const emptyDashboard = {
  total: 0,
  open: 0,
  inProgress: 0,
  waiting: 0,
  resolved: 0,
  cancelled: 0,
  averageResolutionHours: null,
  byProblemType: [],
  byDepartment: [],
};

/** Monta o model. O objeto devolvido tem getters, então continua vivo enquanto o teste roda. */
function mountModel(area: AreaContext = 'infra'): TicketListModel {
  let model!: TicketListModel;
  render(Harness, { props: { area, onReady: (ready: TicketListModel) => (model = ready) } });

  return model;
}

async function mountLoadedModel(area: AreaContext = 'infra'): Promise<TicketListModel> {
  const model = mountModel(area);
  await waitFor(() => expect(model.state.isLoading).toBe(false));

  return model;
}

/* O endereço é de escopo de módulo no apoio do `$app/state`: cada teste começa na fila limpa. */
function visitingUrl(path = '/infra/tickets') {
  (currentPage as { url: URL }).url = new URL(`http://localhost:5173${path}`);
}

describe('useTicketListModel', () => {
  beforeEach(() => {
    visitingUrl();
    vi.mocked(ticketsApi.list).mockResolvedValue(page([ticket()]));
    vi.mocked(ticketsApi.dashboard).mockResolvedValue(emptyDashboard);
    vi.mocked(ticketsApi.assigneeOptions).mockResolvedValue([
      { id: 'u-ana', name: 'Ana Lima', avatarUrl: 'https://fotos.example/ana.png' },
    ]);
  });

  // feliz
  it('brings the queue translated into the contract', async () => {
    const model = await mountLoadedModel();

    expect(model.data.tickets).toHaveLength(1);
    expect(model.data.tickets[0]?.protocol).toBe('CH-0001');
  });

  it('sends every filter together to the API', async () => {
    const model = await mountLoadedModel();

    model.actions.onStatusChange('open');
    model.actions.onDepartmentChange('rh');

    await waitFor(() => {
      expect(ticketsApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'open', department: 'rh' }),
      );
    });
  });

  it('asks for the queue of the responsible person picked, with the people of the area', async () => {
    const model = await mountLoadedModel();

    model.actions.onAssigneeChange('u-ana');

    await waitFor(() => {
      expect(ticketsApi.list).toHaveBeenCalledWith(expect.objectContaining({ assigneeId: 'u-ana' }));
    });
    await waitFor(() => expect(model.data.assigneeOptions).toHaveLength(2));
    expect(ticketsApi.assigneeOptions).toHaveBeenCalledWith('infra');
  });

  /* Estágio e grupo são o MESMO filtro em dois tamanhos: os dois juntos pediriam "aberto E
     aguardando", que não acha nada. Escolher um limpa o outro. */
  it('filters by a whole group of stages, dropping the single stage that was on', async () => {
    const model = mountModel();

    model.actions.onStatusChange('open');
    model.actions.onStatusGroupChange('waiting');

    await waitFor(() =>
      expect(ticketsApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ statusGroup: 'waiting', status: undefined }),
      ),
    );
    expect(model.data.filter).toMatchObject({ status: '', statusGroup: 'waiting' });

    model.actions.onStatusChange('in_progress');

    await waitFor(() =>
      expect(ticketsApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'in_progress', statusGroup: undefined }),
      ),
    );
  });

  it('clears every filter at once', async () => {
    const model = await mountLoadedModel();

    model.actions.onStatusChange('resolved');
    model.actions.onSearchChange('impressora');
    await waitFor(() => expect(model.data.filter.status).toBe('resolved'));

    model.actions.onClearFilters();

    await waitFor(() => {
      expect(model.data.filter.status).toBe('');
      expect(model.data.filter.search).toBe('');
    });
  });

  it('navigates to another page when requested', async () => {
    const model = await mountLoadedModel();

    model.actions.onPageChange(3);

    await waitFor(() => {
      expect(model.data.paging?.page).toBe(3);
      expect(ticketsApi.list).toHaveBeenCalledWith(expect.objectContaining({ page: 3 }));
    });
  });

  it('resets to page 1 when any filter changes', async () => {
    const model = await mountLoadedModel();

    model.actions.onPageChange(2);
    await waitFor(() => expect(model.data.paging?.page).toBe(2));

    model.actions.onStatusChange('open');

    await waitFor(() => {
      expect(model.data.paging?.page).toBe(1);
      expect(ticketsApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'open', page: 1 }),
      );
    });
  });

  // triste
  /* "Ainda não há chamado" e "o filtro escondeu tudo" pedem ações opostas de quem lê. */
  it('separates an empty queue from a queue hidden by the filter', async () => {
    vi.mocked(ticketsApi.list).mockResolvedValue(page([]));
    const model = await mountLoadedModel();

    expect(model.state.isEmpty).toBe(true);
    expect(model.state.isFilteredOut).toBe(false);

    model.actions.onStatusChange('resolved');

    await waitFor(() => {
      expect(model.state.isFilteredOut).toBe(true);
      expect(model.state.isEmpty).toBe(false);
    });
  });

  it('does not call the queue empty while it is still loading', () => {
    const model = mountModel();

    expect(model.state.isLoading).toBe(true);
    expect(model.state.isEmpty).toBe(false);
  });

  it('reports the failure with the reason the server gave', async () => {
    vi.mocked(ticketsApi.list).mockRejectedValue(new ApiError(500, 'O banco está ocupado.'));
    const model = mountModel();

    await waitFor(() => expect(model.state.error).toBe('O banco está ocupado.'));
  });

  /* Truncar calado é mentir sobre o tamanho da fila. */
  it('says the page does not hold everything that matched', async () => {
    vi.mocked(ticketsApi.list).mockResolvedValue(page([ticket()], 240));
    const model = await mountLoadedModel();

    expect(model.state.isTruncated).toBe(true);
    expect(model.data.total).toBe(240);
  });

  /* "Quanto tempo levamos para resolver" é uma pergunta sobre o atendimento inteiro. */
  it('does not refetch the indicators when a list filter changes', async () => {
    const model = await mountLoadedModel();
    await waitFor(() => expect(ticketsApi.dashboard).toHaveBeenCalledOnce());

    model.actions.onStatusChange('resolved');
    await waitFor(() => expect(model.data.filter.status).toBe('resolved'));

    expect(ticketsApi.dashboard).toHaveBeenCalledOnce();
  });

  describe('onExportReport', () => {
    // feliz
    it('downloads the file with the same filters as the queue', async () => {
      vi.mocked(ticketsApi.exportReport).mockResolvedValue({
        blob: new Blob(['x']),
        fileName: 'chamados.xlsx',
      });
      const model = await mountLoadedModel();
      model.actions.onDepartmentChange('rh');
      await waitFor(() => expect(model.data.filter.department).toBe('rh'));

      model.actions.onExportReport('xlsx');
      await waitFor(() => expect(model.state.exportingFormat).toBeNull());

      expect(ticketsApi.exportReport).toHaveBeenCalledWith(
        expect.objectContaining({ department: 'rh' }),
        'xlsx',
      );
      expect(triggerBrowserDownload).toHaveBeenCalledWith(expect.any(Blob), 'chamados.xlsx');
    });

    // triste
    it('shows the reason instead of a silently missing download', async () => {
      vi.mocked(ticketsApi.exportReport).mockRejectedValue(
        new ApiError(403, 'Seu perfil não permite consultar os chamados.'),
      );
      const model = await mountLoadedModel();

      model.actions.onExportReport('pdf');

      await waitFor(() => {
        expect(model.state.exportError).toBe('Seu perfil não permite consultar os chamados.');
        expect(model.state.exportingFormat).toBeNull();
      });
    });
  });
});

describe('useTicketListModel — the board view', () => {
  beforeEach(() => {
    visitingUrl();
    vi.mocked(ticketsApi.list).mockReset().mockResolvedValue(page([ticket()]));
    vi.mocked(ticketsApi.dashboard).mockResolvedValue(emptyDashboard);
    vi.mocked(ticketsApi.assigneeOptions).mockResolvedValue([]);
    vi.mocked(replaceState).mockClear();
  });

  // feliz
  it('opens on the board when the address asks, bringing every ticket and no pages', async () => {
    visitingUrl('/infra/tickets?view=kanban');
    const model = await mountLoadedModel();

    expect(model.data.view).toBe('kanban');
    expect(model.data.paging).toBeUndefined();
    expect(ticketsApi.list).toHaveBeenCalledTimes(1);
    expect(ticketsApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: TICKETS_BOARD_SIZE, area: 'infra' }),
    );
  });

  it('switches to the board and back, writing the choice on the address', async () => {
    const model = await mountLoadedModel();

    model.actions.onViewChange('kanban');
    await waitFor(() =>
      expect(ticketsApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ pageSize: TICKETS_BOARD_SIZE }),
      ),
    );
    expect(currentPage.url.searchParams.get('view')).toBe('kanban');

    model.actions.onViewChange('list');
    await waitFor(() => expect(model.data.paging?.page).toBe(1));
    expect(currentPage.url.searchParams.has('view')).toBe(false);
  });

  it('applies the same filters of the list to the board', async () => {
    visitingUrl('/infra/tickets?view=kanban');
    const model = await mountLoadedModel();

    model.actions.onSearchChange('impressora');
    model.actions.onStatusGroupChange('waiting');
    model.actions.onDepartmentChange('rh');

    await waitFor(() =>
      expect(ticketsApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: 'impressora',
          statusGroup: 'waiting',
          department: 'rh',
          pageSize: TICKETS_BOARD_SIZE,
        }),
      ),
    );
  });

  it('says the board does not hold everything that matched', async () => {
    visitingUrl('/infra/tickets?view=kanban');
    vi.mocked(ticketsApi.list).mockResolvedValue(page([ticket()], 450));
    const model = await mountLoadedModel();

    expect(model.state.isTruncated).toBe(true);
    expect(model.data.total).toBe(450);
  });

  // triste
  it('ignores a view the address made up, and a click on the view already in use', async () => {
    visitingUrl('/infra/tickets?view=gantt');
    const model = await mountLoadedModel();

    expect(model.data.view).toBe('list');
    model.actions.onViewChange('list');

    expect(replaceState).not.toHaveBeenCalled();
  });

  it('shows the error of the board and asks again on retry', async () => {
    visitingUrl('/infra/tickets?view=kanban');
    vi.mocked(ticketsApi.list).mockRejectedValueOnce(new ApiError(500, 'Banco fora do ar.'));
    const model = mountModel();

    await waitFor(() => expect(model.state.error).toBe('Banco fora do ar.'));
    model.actions.onRetry();

    await waitFor(() => expect(model.state.error).toBeNull());
  });
});

describe('useTicketListModel — the system filter', () => {
  beforeEach(() => {
    visitingUrl('/system/tickets');
    vi.mocked(ticketsApi.list).mockReset().mockResolvedValue(page([ticket({ area: 'sistema' })]));
    vi.mocked(ticketsApi.dashboard).mockResolvedValue(emptyDashboard);
    vi.mocked(ticketsApi.assigneeOptions).mockResolvedValue([]);
    vi.mocked(softwareProjectsApi.list).mockReset().mockResolvedValue({
      items: [{ id: 7, name: 'Portal do cliente' }] as never,
      total: 1,
      page: 1,
      pageSize: 100,
    });
  });

  // feliz
  it('offers the registered systems and asks the queue of the one picked', async () => {
    const model = await mountLoadedModel('sistema');
    await waitFor(() =>
      expect(model.data.projectOptions).toEqual([{ value: '7', label: 'Portal do cliente' }]),
    );

    model.actions.onProjectChange('7');

    await waitFor(() =>
      expect(ticketsApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ area: 'sistema', projectId: 7 }),
      ),
    );
    expect(model.state.isFilteredOut).toBe(false);
  });

  // triste
  it('never asks for systems, nor sends one, outside the System queue', async () => {
    visitingUrl('/infra/tickets?projectId=7');
    const model = await mountLoadedModel('infra');

    expect(softwareProjectsApi.list).not.toHaveBeenCalled();
    expect(model.data.projectOptions).toEqual([]);
    expect(ticketsApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ projectId: undefined }));
  });

  it('refuses a system id that is not a number', async () => {
    visitingUrl('/system/tickets?projectId=abc');
    const model = await mountLoadedModel('sistema');

    expect(model.data.filter.projectId).toBe('');
  });
});

describe('toProjectFilterOptions', () => {
  // feliz
  it('turns each system into an option by its id', () => {
    expect(toProjectFilterOptions([{ id: 3, name: 'ERP' }])).toEqual([{ value: '3', label: 'ERP' }]);
  });

  // triste
  it('offers nothing when no system is registered', () => {
    expect(toProjectFilterOptions([])).toEqual([]);
  });
});

describe('toAssigneeFilterOptions', () => {
  // feliz
  it('puts the tickets nobody took first, then the people of the area with photo', () => {
    expect(
      toAssigneeFilterOptions([{ id: 'u-ana', name: 'Ana Lima', avatarUrl: 'https://f/ana.png' }]),
    ).toEqual([
      { value: 'none', label: '(Sem responsável)' },
      {
        value: 'u-ana',
        label: 'Ana Lima',
        avatar: { name: 'Ana Lima', url: 'https://f/ana.png' },
        separatorBefore: true,
      },
    ]);
  });

  // triste
  it('still offers the unassigned queue when nobody attends the area, or has no photo', () => {
    expect(toAssigneeFilterOptions([])).toEqual([{ value: 'none', label: '(Sem responsável)' }]);
    expect(toAssigneeFilterOptions([{ id: 'u-bia', name: 'Bia' }])[1]?.avatar?.url).toBeNull();
  });
});
