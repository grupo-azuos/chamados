import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import SystemDashboardView, {
  type AzuosSystemDashboardViewProps,
} from './azuos-system-dashboard-view.svelte';

function renderView(
  overrides: {
    data?: Partial<AzuosSystemDashboardViewProps['data']>;
    state?: Partial<AzuosSystemDashboardViewProps['state']>;
  } = {},
) {
  const actions = {
    onRetry: vi.fn(),
    onOpenTickets: vi.fn(),
    onOpenKanban: vi.fn(),
    onOpenSchedule: vi.fn(),
    onOpenProjects: vi.fn(),
  };

  render(SystemDashboardView, {
    props: {
      data: {
        summary: {
          monthName: 'Outubro',
          monthYear: 'Outubro de 2026',
          projectsSummary: { total: 4, active: 2, maintenance: 1, deprecated: 1 },
          ticketsMonthSummary: {
            opened: 10,
            resolved: 8,
            pending: 2,
            resolutionRate: 80,
            averageResolutionHours: 3.2,
          },
          ticketsByProblemType: [
            { key: 'bug', label: 'Defeito / Bug', count: 5 },
          ],
          prsMonthSummary: { opened: 1, merged: 5, total: 6 },
          weeklyTrend: [
            { weekLabel: 'Semana 1', openedTickets: 2, resolvedTickets: 2, pullRequests: 1 },
          ],
          recentTimeline: [],
        },
        ...overrides.data,
      },
      state: {
        isLoading: false,
        error: null,
        ...overrides.state,
      },
      actions,
    },
  });

  return actions;
}

describe('AzuosSystemDashboardView', () => {
  // feliz
  it('renders monthly summary indicators and charts correctly', () => {
    renderView();

    expect(screen.getByText('Painel de Desenvolvimento e Sistemas')).toBeInTheDocument();
    expect(screen.getByText('Chamados no Mês')).toBeInTheDocument();
    expect(screen.getByText(/80%/)).toBeInTheDocument();
    expect(screen.getByText('PRs no Mês')).toBeInTheDocument();
  });

  it('navigates to schedule when Cronograma button is clicked', async () => {
    const actions = renderView();

    const scheduleBtn = screen.getByRole('button', { name: /cronograma/i });
    await userEvent.click(scheduleBtn);

    expect(actions.onOpenSchedule).toHaveBeenCalled();
  });

  // triste
  it('shows error state when summary fails to load', () => {
    renderView({
      data: { summary: null },
      state: { error: 'Erro ao carregar dados do painel' },
    });

    expect(screen.getByText(/não foi possível carregar o painel/i)).toBeInTheDocument();
  });
});

const timelineEvent = {
  id: 1,
  projectId: 1,
  projectName: 'Portal',
  type: 'pr' as const,
  externalId: '#12',
  title: 'Ajusta o login',
  description: null,
  url: 'https://github.com/example/portal/pull/12',
  author: 'ana',
  authorName: 'Ana Lima',
  status: 'merged' as const,
  eventDate: '2026-10-06T12:00:00.000Z',
  createdAt: '2026-10-06T12:00:00.000Z',
};

describe('AzuosSystemDashboardView — states and the recent timeline', () => {
  // triste
  it('shows placeholders while the summary loads', () => {
    renderView({ state: { isLoading: true } });
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(4);
    expect(screen.queryByText('Chamados no Mês')).not.toBeInTheDocument();
  });

  // triste
  it('renders nothing but the header when there is no summary yet', () => {
    renderView({ data: { summary: null } });
    expect(screen.getByText('Painel de Desenvolvimento e Sistemas')).toBeInTheDocument();
    expect(screen.queryByText('Chamados no Mês')).not.toBeInTheDocument();
  });

  // feliz
  it('opens the kanban and the projects from the header and the cards', async () => {
    const actions = renderView();
    await userEvent.click(screen.getByRole('button', { name: 'Kanban' }));
    expect(actions.onOpenKanban).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Ver lista' }));
    await userEvent.click(screen.getByRole('button', { name: 'Ver Sistemas' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sistemas' }));
    expect(actions.onOpenProjects).toHaveBeenCalledTimes(3);
  });

  // feliz
  it('lists recent activity with project, author and GitHub link', () => {
    renderView({
      data: {
        summary: {
          monthName: 'Outubro',
          monthYear: 'Outubro de 2026',
          projectsSummary: { total: 1, active: 1, maintenance: 0, deprecated: 0 },
          ticketsMonthSummary: { opened: 0, resolved: 0, pending: 0, resolutionRate: 0, averageResolutionHours: null },
          ticketsByProblemType: [],
          prsMonthSummary: { opened: 0, merged: 0, total: 0 },
          weeklyTrend: [],
          recentTimeline: [
            timelineEvent,
            { ...timelineEvent, id: 2, type: 'issue', externalId: null, url: null, projectName: null, authorName: null, title: 'Issue sem link' },
            { ...timelineEvent, id: 3, type: 'issue', author: null, authorName: null, title: 'Issue anônima' },
          ],
        },
      },
    });
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('Nenhum chamado registrado neste mês ainda.')).toBeInTheDocument();
    expect(screen.getAllByText('#12').length).toBeGreaterThan(0);
    expect(screen.getByText('Portal · por Ana Lima')).toBeInTheDocument();
    expect(screen.getByText('por ana')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Abrir no GitHub/ })[0]).toHaveAttribute('href', timelineEvent.url);
    expect(screen.getByText('Issue sem link')).toBeInTheDocument();
    expect(screen.getByText('Issue anônima').parentElement?.nextElementSibling).toHaveTextContent(/^Portal ·\s*$/);
  });

  // triste
  it('explains an empty timeline and a month without percentages', () => {
    renderView({
      data: {
        summary: {
          monthName: 'Outubro',
          monthYear: 'Outubro de 2026',
          projectsSummary: { total: 0, active: 0, maintenance: 0, deprecated: 0 },
          ticketsMonthSummary: { opened: 0, resolved: 0, pending: 0, resolutionRate: 0, averageResolutionHours: 2 },
          ticketsByProblemType: [{ key: 'bug', label: 'Defeito', count: 0 }],
          prsMonthSummary: { opened: 0, merged: 0, total: 0 },
          weeklyTrend: [],
          recentTimeline: [],
        },
      },
    });
    expect(screen.getByText('Nenhuma atividade sincronizada com o GitHub ainda.')).toBeInTheDocument();
    expect(screen.getByText('0 (0%)')).toBeInTheDocument();
    expect(screen.getByText('2h')).toBeInTheDocument();
  });
});
