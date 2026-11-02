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
    expect(eventStatusOf(event({ status: 'closed' })).label).toBe('Fechado sem merge');
  });

  // triste
  it('shows only the author when nobody worked together', () => {
    expect(peopleLineOf(event({ coAuthors: ['  '] }))).toBe('Ana Lima');
  });
});

describe('AzuosProjectDetailView — sync feedback, tickets and the timeline filter', () => {
  const ticket = {
    id: 7,
    status: 'open',
    problemType: 'bug',
    requesterName: 'Marta',
  } as never;

  function renderFull(
    data: Partial<Parameters<typeof ProjectDetailView>[1]['data']> = {},
    state: Parameters<typeof ProjectDetailView>[1]['state'] = { canSync: true },
  ) {
    const events = [event({ id: 1, status: 'open', url: 'https://github.com/example/portal/pull/1' })];
    return render(ProjectDetailView, {
      props: {
        data: {
          project,
          progress: projectProgressOf(events, Date.parse('2026-10-23T12:00:00.000Z')),
          days: timelineDaysOf(events, ''),
          openTickets: [],
          filter: '',
          ...data,
        },
        state,
        actions,
      },
    });
  }

  beforeEach(() => vi.clearAllMocks());

  // triste
  it('shows the sync failure before any success message', () => {
    renderFull({ syncMessage: 'Sincronizado agora.' }, { canSync: true, syncError: 'GitHub indisponível.', isSyncing: true });
    expect(screen.getByText('GitHub indisponível.')).toBeInTheDocument();
    expect(screen.queryByText('Sincronizado agora.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sincronizando…' })).toBeInTheDocument();
  });

  // feliz
  it('tells when the sync finished and that the history was cut', () => {
    renderFull({ syncMessage: 'Sincronizado agora.', isTruncated: true });
    expect(screen.getByRole('status')).toHaveTextContent('Sincronizado agora.');
    expect(screen.getByText(/Mostrando a atividade mais recente/)).toBeInTheDocument();
  });

  // feliz
  it('opens a ticket, links to GitHub and filters the timeline', async () => {
    renderFull({ openTickets: [ticket] });
    await userEvent.click(screen.getByRole('button', { name: /Marta/ }));
    expect(actions.onOpenTicket).toHaveBeenCalledWith(ticket);
    expect(screen.getByRole('link', { name: 'Abrir #1 no GitHub' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ver no GitHub' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Issues' }));
    expect(actions.onFilterChange).toHaveBeenCalledWith('issue');
    await userEvent.click(screen.getByRole('button', { name: /Voltar para os projetos/ }));
    expect(actions.onBack).toHaveBeenCalled();
  });

  // triste
  it('describes a project without description and an event without identifier', () => {
    const events = [event({ id: 3, externalId: null, url: null, type: 'issue', status: 'open' })];
    render(ProjectDetailView, {
      props: {
        data: {
          project: { ...project, description: null },
          progress: projectProgressOf(events, Date.parse('2026-10-23T12:00:00.000Z')),
          days: timelineDaysOf(events, ''),
          openTickets: [],
          filter: '',
        },
        state: {},
        actions,
      },
    });
    expect(screen.getByText('Sem descrição cadastrada.')).toBeInTheDocument();
    expect(screen.getAllByText('Pendente').length).toBeGreaterThan(0);
  });
});

describe('eventStatusOf — every kind', () => {
  // feliz
  it('reads merged PRs, resolved issues and releases', () => {
    expect(eventStatusOf(event({ status: 'merged' }))).toEqual({ label: 'Entregue', tone: 'success' });
    expect(eventStatusOf(event({ type: 'issue', status: 'closed' }))).toEqual({ label: 'Resolvida', tone: 'success' });
    expect(eventStatusOf(event({ type: 'release', status: 'closed' })).tone).toBe('brand');
  });

  // triste
  it('falls back to the login and then to "not informed" for the author', () => {
    expect(peopleLineOf(event({ authorName: null }))).toBe('ana');
    expect(peopleLineOf(event({ authorName: null, author: null }))).toBe('Não informado');
    expect(peopleLineOf(event({ coAuthors: undefined }))).toBe('Ana Lima');
  });
});

describe('AzuosProjectDetailView — events without a number, with a link', () => {
  // feliz
  it('links the open work to GitHub and copes with events that have no number', () => {
    renderWith([
      event({ id: 1, status: 'open', externalId: null, url: 'https://github.com/example/project/pull/1' }),
      event({ id: 2, status: 'merged', externalId: null, title: 'Merge sem número' }),
    ]);

    const links = screen.getAllByRole('link').filter((link) => link.getAttribute('href')?.includes('/pull/1'));
    expect(links.length).toBeGreaterThan(0);
    expect(screen.getAllByText('Merge sem número').length).toBeGreaterThan(0);
  });
});
