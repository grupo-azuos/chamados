import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';
import { type SoftwareTimelineEvent } from '@template/shared/schemas/software-timeline.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  projectProgressOf,
  timelineDaysOf,
} from '$lib/hooks/use-software-project-detail/use-software-project-detail.svelte';
import ProjectDetailView, { eventStatusOf, peopleLineOf } from './azuos-project-detail-view.svelte';

/* Dados INVENTADOS. */
const project: SoftwareProject = {
  id: 1,
  name: 'Portal do Cliente',
  description: 'Autoatendimento.',
  repositoryUrl: 'grupo-azuos/portal-cliente',
  githubRepoOwner: 'grupo-azuos',
  githubRepoName: 'portal-cliente',
  responsibleId: null,
  responsibleName: null,
  status: 'active',
  color: 'blue',
  openTicketsCount: 0,
  pullRequestsCount: 1,
  createdAt: '2026-01-10T08:00:00.000Z',
  updatedAt: null,
};

function event(over: Partial<SoftwareTimelineEvent>): SoftwareTimelineEvent {
  return {
    id: 1,
    projectId: 1,
    type: 'pr',
    externalId: '#1',
    title: 'Tela nova',
    description: null,
    url: null,
    author: 'ana',
    authorName: 'Ana Lima',
    coAuthors: [],
    status: 'merged',
    eventDate: '2026-10-21T14:00:00.000Z',
    createdAt: '2026-10-21T14:00:00.000Z',
    ...over,
  };
}

const actions = {
  onFilterChange: vi.fn(),
  onSync: vi.fn(),
  onBack: vi.fn(),
  onOpenTicket: vi.fn(),
};

function renderWith(events: SoftwareTimelineEvent[], canSync = true) {
  return render(ProjectDetailView, {
    props: {
      data: {
        project,
        progress: projectProgressOf(events, Date.parse('2026-10-23T12:00:00.000Z')),
        days: timelineDaysOf(events, ''),
        openTickets: [],
        filter: '',
      },
      state: { canSync },
      actions,
    },
  });
}

beforeEach(() => vi.clearAllMocks());

describe('AzuosProjectDetailView', () => {
  // feliz
  it('shows what is in progress and the timeline with who worked together', () => {
    renderWith([
      event({ id: 1, status: 'open', title: 'Filtro por período' }),
      event({ id: 2, type: 'merge', title: 'Relatório em Excel', coAuthors: ['Caio Souza'] }),
    ]);

    expect(screen.getAllByText('Filtro por período').length).toBeGreaterThan(0);
    expect(screen.getByText(/Ana Lima com Caio Souza/)).toBeInTheDocument();
  });

  it('syncs on demand for whoever has GitHub linked', async () => {
    renderWith([], true);

    await userEvent.click(screen.getByRole('button', { name: 'Sincronizar com o GitHub' }));
    expect(actions.onSync).toHaveBeenCalled();
  });

  // triste
  it('offers no sync to whoever has no GitHub linked, and explains an empty timeline', () => {
    renderWith([], false);

    expect(screen.queryByRole('button', { name: 'Sincronizar com o GitHub' })).toBeNull();
    expect(screen.getByText('Nada na timeline ainda')).toBeInTheDocument();
    expect(screen.getByText('Nada em aberto neste sistema.')).toBeInTheDocument();
  });
});

describe('eventStatusOf and peopleLineOf', () => {
  // feliz
  it('reads each event in plain words', () => {
    expect(eventStatusOf(event({ status: 'open' })).label).toBe('Em andamento');
    expect(eventStatusOf(event({ type: 'merge' })).label).toBe('Entregue');
    expect(eventStatusOf(event({ type: 'issue', status: 'open' })).label).toBe('Pendente');
  });

  // triste
  it('shows only the author when nobody worked together', () => {
    expect(peopleLineOf(event({ coAuthors: ['  '] }))).toBe('Ana Lima');
  });
});
