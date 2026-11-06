import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-ticket-relations-harness.test.svelte';
import { type TicketRelationsModel } from './use-ticket-relations.svelte';

vi.mock('$lib/api/tickets.api', () => ({
  ticketsApi: {
    relations: vi.fn(),
    list: vi.fn(),
    addRelation: vi.fn(),
    removeRelation: vi.fn(),
  },
}));

const { ticketsApi } = await import('$lib/api/tickets.api');

function mountModel(): TicketRelationsModel {
  let model: TicketRelationsModel | undefined;
  render(Harness, {
    props: { ticketId: 10, onReady: (ready: TicketRelationsModel) => (model = ready) },
  });
  if (!model) throw new Error('model not ready');

  return model;
}

const mockRelation = {
  id: 1,
  ticketId: 10,
  relatedTicketId: 15,
  relatedTicket: {
    id: 15,
    protocol: 'CH-0015',
    description: 'Problema no roteador',
    status: 'open' as const,
    priority: 'high' as const,
    area: 'infra' as const,
    requesterName: 'Lucas Lima',
    createdAt: '2026-11-05T10:00:00.000Z',
  },
  createdAt: '2026-11-05T12:00:00.000Z',
  createdBy: 'admin@azuos.local',
};

describe('useTicketRelationsModel', () => {
  beforeEach(() => {
    vi.mocked(ticketsApi.relations).mockResolvedValue([mockRelation]);
    vi.mocked(ticketsApi.list).mockResolvedValue({
      items: [
        {
          id: 20,
          protocol: 'CH-0020',
          description: 'Ajuste de perfil',
          status: 'open' as const,
          priority: 'medium' as const,
          area: 'sistema' as const,
          requesterName: 'Ana Clara',
          createdAt: '2026-11-05T11:00:00.000Z',
          problemType: 'bug' as const,
          department: 'rh' as const,
          contactPhone: null,
          notifyWhatsapp: false,
          anydeskId: null,
          participantAreas: [],
          screenshotUrl: null,
          assignee: null,
          solution: null,
          startedAt: null,
          resolvedAt: null,
          customSystemName: null,
          githubIssueUrl: null,
          githubIssueNumber: null,
          projectId: null,
          projectName: null,
          computerId: null,
          computerName: null,
          updatedAt: null,
          updatedBy: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 8,
    });
    vi.mocked(ticketsApi.addRelation).mockReset();
    vi.mocked(ticketsApi.removeRelation).mockReset();
  });

  it('loads relations and allows adding a relation', async () => {
    vi.mocked(ticketsApi.addRelation).mockResolvedValue([mockRelation]);
    const model = mountModel();

    await waitFor(() => expect(model.data.relations).toHaveLength(1));
    expect(model.data.relations[0]?.relatedTicket.protocol).toBe('CH-0015');

    model.actions.onAddRelation(20);

    await waitFor(() => expect(ticketsApi.addRelation).toHaveBeenCalledWith(10, 20));
  });

  it('allows removing a relation', async () => {
    vi.mocked(ticketsApi.removeRelation).mockResolvedValue([]);
    const model = mountModel();

    await waitFor(() => expect(model.data.relations).toHaveLength(1));

    model.actions.onRemoveRelation(15);

    await waitFor(() => expect(ticketsApi.removeRelation).toHaveBeenCalledWith(10, 15));
  });

  it('searches for tickets when search term changes', async () => {
    const model = mountModel();

    model.actions.onSearchChange('Ajuste');

    await waitFor(() => expect(ticketsApi.list).toHaveBeenCalledWith({ search: 'Ajuste', pageSize: 8 }));
    await waitFor(() => expect(model.data.searchResults).toHaveLength(1));
    expect(model.data.searchResults[0]?.protocol).toBe('CH-0020');
  });

  it('shows error if adding relation fails', async () => {
    vi.mocked(ticketsApi.addRelation).mockRejectedValue(
      new ApiError(400, 'Estes chamados já estão vinculados.'),
    );
    const model = mountModel();
    await waitFor(() => expect(model.state.isLoading).toBe(false));

    model.actions.onAddRelation(15);

    await waitFor(() => expect(model.state.error).toMatch(/já estão vinculados/));
  });
});
