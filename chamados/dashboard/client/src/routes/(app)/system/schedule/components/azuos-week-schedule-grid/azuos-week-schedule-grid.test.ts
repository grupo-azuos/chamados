import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type SoftwareTimelineEvent } from '@template/shared/schemas/software-timeline.schema';

import { type DayColumn } from '$lib/hooks/use-software-schedule/use-software-schedule.svelte';
import WeekScheduleGrid, {
  type AzuosWeekScheduleGridProps,
  timeAtOffset,
} from './azuos-week-schedule-grid.svelte';

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function renderView(
  overrides: {
    data?: Partial<AzuosWeekScheduleGridProps['data']>;
    state?: Partial<AzuosWeekScheduleGridProps['state']>;
  } = {},
) {
  const actions = {
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onToday: vi.fn(),
    onViewModeChange: vi.fn(),
    onNewEvent: vi.fn(),
    onNewEventAt: vi.fn(),
    onSelectEvent: vi.fn(),
    onRetry: vi.fn(),
    onOpenGithubDay: vi.fn(),
    onProjectFilterChange: vi.fn(),
    onAuthorFilterChange: vi.fn(),
    onTypeFilterChange: vi.fn(),
    onClearFilters: vi.fn(),
  };

  const mockEvent = {
    id: 1,
    kind: 'appointment' as const,
    title: 'Deploy da v1.4',
    note: null,
    projectId: null,
    projectName: null,
    date: '2026-10-06',
    startTime: '09:00',
    endTime: '11:00',
    color: 'green' as const,
    category: 'deploy' as const,
    createdAt: '2026-10-01T00:00:00Z', createdById: 'u-ana', createdByEmail: 'ana@empresa.com.br', createdByName: 'Ana Lima',
  };

  const mockDays = [
    {
      dateString: '2026-10-05',
      dayNumber: 5,
      weekdayShort: 'Seg',
      isToday: false,
      isCurrentMonth: true,
      events: [],
    },
    {
      dateString: '2026-10-06',
      dayNumber: 6,
      weekdayShort: 'Ter',
      isToday: true,
      isCurrentMonth: true,
      events: [mockEvent],
    },
    {
      dateString: '2026-10-07',
      dayNumber: 7,
      weekdayShort: 'Qua',
      isToday: false,
      isCurrentMonth: true,
      events: [],
    },
    {
      dateString: '2026-10-08',
      dayNumber: 8,
      weekdayShort: 'Qui',
      isToday: false,
      isCurrentMonth: true,
      events: [],
    },
    {
      dateString: '2026-10-09',
      dayNumber: 9,
      weekdayShort: 'Sex',
      isToday: false,
      isCurrentMonth: true,
      events: [],
    },
    {
      dateString: '2026-10-10',
      dayNumber: 10,
      weekdayShort: 'Sáb',
      isToday: false,
      isCurrentMonth: true,
      events: [],
    },
    {
      dateString: '2026-10-11',
      dayNumber: 11,
      weekdayShort: 'Dom',
      isToday: false,
      isCurrentMonth: true,
      events: [],
    },
  ];

  render(WeekScheduleGrid, {
    props: {
      data: {
        monthYearTitle: 'Outubro de 2026',
        viewMode: 'week',
        days: mockDays,
        events: [mockEvent],
        nowTopPx: 100,
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

/* Um registro: algo feito, só com a hora. */
const recordEvent = {
  id: 9,
  kind: 'record' as const,
  title: 'Sistema enviado para revisão',
  note: null,
  projectId: null,
  projectName: null,
  date: '2026-10-06',
  startTime: '16:00',
  endTime: null,
  color: 'rose' as const,
  category: 'review' as const,
  createdAt: '2026-10-01T00:00:00Z',
  createdById: 'u-ana',
  createdByEmail: 'ana@empresa.com.br',
  createdByName: 'Ana Lima',
};

describe('AzuosWeekScheduleGrid', () => {
  it('offers project, author and type filters and a clear action', async () => {
    const actions = renderView({
      data: {
        filters: {
          project: '',
          author: 'ana',
          type: '',
          isActive: true,
          projectOptions: [{ value: '', label: 'Todos os projetos' }],
          authorOptions: [
            { value: '', label: 'Todos os autores' },
            { value: 'ana', label: 'ana' },
          ],
        },
      },
    });
    expect(screen.getByRole('button', { name: 'Filtrar por projeto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filtrar por autor' })).toBeInTheDocument();
    const chooseType = async (label: string) => {
      await userEvent.click(screen.getByRole('button', { name: 'Filtrar por tipo' }));
      // O jsdom não mede o popover; a lista aberta fica marcada como oculta pelo posicionador.
      const search = await screen.findByPlaceholderText('Buscar tipo…');
      const popup = search.closest('[data-slot="popover-content"]') as HTMLElement;
      await fireEvent.click(within(popup).getByText(label, { exact: true }));
    };
    await chooseType('Issues');
    expect(actions.onTypeFilterChange).toHaveBeenCalledWith('issue');
    await chooseType('Merges locais');
    expect(actions.onTypeFilterChange).toHaveBeenCalledWith('merge');
    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(actions.onClearFilters).toHaveBeenCalledOnce();
  });

  it('shows resolved issues in the time grid with their tooltip and daily dialog action', async () => {
    const issue = {
      id: 22,
      projectId: 1,
      type: 'issue' as const,
      externalId: '#22',
      title: 'Corrige impressão',
      description: null,
      url: 'https://github.com/example/project/issues/22',
      author: 'ana',
      status: 'closed' as const,
      eventDate: '2026-10-06T12:30:00Z',
      createdAt: '2026-10-01T12:00:00Z',
    };
    const actions = renderView({
      data: {
        githubEvents: [issue],
        days: [
          {
            dateString: '2026-10-06',
            dayNumber: 6,
            weekdayShort: 'Ter',
            isToday: false,
            isCurrentMonth: true,
            events: [],
            githubEvents: [issue],
          },
        ],
      },
    });
    const link = screen.getAllByRole('link', { name: /Corrige impressão/ })[0]!;
    expect(link.closest('[data-slot="github-hour-event"]')).toHaveStyle({ height: '52px' });
    await userEvent.hover(link);
    expect(await screen.findByText('Issue #22 · Resolvida')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ver 1 issue do dia 06/10/2026' }));
    expect(actions.onOpenGithubDay).toHaveBeenCalledWith('2026-10-06', 'issue');
  });
  it('explains navigation on keyboard focus without blocking the action', async () => {
    const actions = renderView();
    await userEvent.tab();
    const previous = screen.getByRole('button', { name: 'Semana anterior' });
    expect(previous).toHaveFocus();
    await waitFor(() => expect(previous).toHaveAttribute('aria-describedby'));
    expect(document.getElementById(previous.getAttribute('aria-describedby')!)).toHaveTextContent(
      'Semana anterior',
    );
    await userEvent.keyboard('{Enter}');
    expect(actions.onPrev).toHaveBeenCalledOnce();
  });

  it('shows the new appointment hint when its button receives keyboard focus', async () => {
    renderView();
    for (let index = 0; index < 7; index++) await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Novo agendamento' })).toHaveFocus();
    expect(
      await screen.findByText('Criar um agendamento na agenda de sistemas'),
    ).toBeInTheDocument();
  });

  it.each(['week', 'month'] as const)(
    'shows full appointment details in the %s tooltip',
    async (viewMode) => {
      const actions = renderView({ data: { viewMode } });
      const appointment = screen.getByRole('button', { name: /Deploy da v1.4/ });
      await userEvent.hover(appointment);
      await waitFor(() => expect(appointment).toHaveAttribute('aria-describedby'));
      const tooltip = document.getElementById(appointment.getAttribute('aria-describedby')!);
      expect(tooltip).toHaveTextContent('Deploy da v1.4');
      expect(tooltip).toHaveTextContent('06/10/2026 · 09:00 – 11:00');
      /* Quem marcou aparece para todo mundo — é como se sabe a quem perguntar. */
      expect(tooltip).toHaveTextContent('Marcado por Ana Lima');
      await userEvent.click(appointment);
      expect(actions.onSelectEvent).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    },
  );

  it.each(['day', 'week', 'month'] as const)(
    'opens all daily PRs even when the %s preview is full',
    async (viewMode) => {
      const githubEvents = Array.from({ length: 8 }, (_, index) => ({
        id: index + 1,
        projectId: 1,
        projectName: 'Azuos',
        type: 'pr' as const,
        externalId: `#${index + 1}`,
        title: `PR do dia ${index + 1}`,
        description: null,
        url: null,
        author: 'ana',
        status: 'open' as const,
        eventDate: '2026-10-06T12:00:00Z',
        createdAt: '2026-10-06T12:00:00Z',
      }));
      const actions = renderView({
        data: {
          viewMode,
          githubEvents,
          days: [
            {
              dateString: '2026-10-06',
              dayNumber: 6,
              weekdayShort: 'Ter',
              isToday: true,
              isCurrentMonth: true,
              events: [],
              githubEvents,
            },
          ],
        },
      });
      await userEvent.click(screen.getByRole('button', { name: 'Ver 8 PRs do dia 06/10/2026' }));
      expect(actions.onOpenGithubDay).toHaveBeenCalledWith('2026-10-06');
    },
  );

  it('shows synchronized GitHub activity, productivity, and event tooltip', async () => {
    const githubEvent = {
      id: 41,
      projectId: 2,
      projectName: 'paralegal',
      type: 'pr' as const,
      externalId: '#41',
      title: 'Ajusta filtros do painel',
      description: null,
      url: 'https://github.com/grupo-azuos/paralegal/pull/41',
      author: 'vinicius-gpl',
      status: 'merged' as const,
      eventDate: '2026-10-06T12:00:00.000Z',
      createdAt: '2026-10-05T12:00:00.000Z',
    };

    const actions = renderView({
      data: {
        githubEvents: [githubEvent],
        mergedPullRequests: 1,
        resolvedIssues: 2,
        developerStats: [{ author: 'vinicius-gpl', mergedPullRequests: 1, resolvedIssues: 2 }],
        days: [
          {
            dateString: '2026-10-06',
            dayNumber: 6,
            weekdayShort: 'Ter',
            isToday: true,
            isCurrentMonth: true,
            events: [],
            githubEvents: [githubEvent],
          },
        ],
      },
    });

    const calendarEventLink = screen.getAllByRole('link', { name: /Ajusta filtros do painel/ })[0];
    expect(calendarEventLink).toBeInTheDocument();
    const hourCard = calendarEventLink?.closest('[data-slot="github-hour-event"]');
    const localTime = new Date(githubEvent.eventDate);
    const expectedTop = Math.round(
      (((localTime.getHours() - 8) * 60 + localTime.getMinutes()) * 56) / 60,
    );
    expect(hourCard).toHaveStyle({ top: `${expectedTop}px` });
    await userEvent.hover(calendarEventLink!);
    expect(await screen.findByText('Pull Request #41 · Mergeado')).toBeInTheDocument();

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('PRs mergeados no período')).toBeInTheDocument();
    expect(screen.getByText('Issues resolvidas no período')).toBeInTheDocument();
    expect(screen.getByText('vinicius-gpl')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Ajusta filtros do painel/ })).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Ver 1 PR do dia 06/10/2026' }));
    expect(actions.onOpenGithubDay).toHaveBeenCalledWith('2026-10-06');
  });

  it('shows a loading state before displaying the calendar', () => {
    renderView({ state: { isLoading: true } });
    expect(screen.getByRole('status')).toHaveTextContent('Carregando cronograma');
    expect(screen.queryByText('Deploy da v1.4')).not.toBeInTheDocument();
  });

  it('keeps every monthly event accessible, including the fourth event', async () => {
    const events = Array.from({ length: 4 }, (_, index) => ({
      id: index + 1,
      kind: 'appointment' as const,
      title: `Agendamento ${index + 1}`,
      note: null,
      projectId: null,
      projectName: null,
      date: '2026-10-06',
      startTime: '09:00',
      endTime: '10:00',
      color: 'green' as const,
      category: 'deploy' as const,
      createdAt: '2026-10-01T00:00:00Z',
      createdById: 'u-ana',
      createdByEmail: 'ana@empresa.com.br',
      createdByName: 'Ana Lima',
    }));
    const actions = renderView({
      data: {
        viewMode: 'month',
        events,
        days: [
          {
            dateString: '2026-10-06',
            dayNumber: 6,
            weekdayShort: 'Ter',
            isToday: true,
            isCurrentMonth: true,
            events,
          },
        ],
      },
    });
    await userEvent.click(screen.getByRole('button', { name: /Agendamento 4/ }));
    expect(actions.onSelectEvent).toHaveBeenCalledWith(events[3]);
  });

  it('keeps events outside business hours accessible', async () => {
    const event = {
      id: 8,
      kind: 'appointment' as const,
      title: 'Deploy noturno',
      note: null,
      projectId: null,
      projectName: null,
      date: '2026-10-06',
      startTime: '20:00',
      endTime: '21:00',
      color: 'green' as const,
      category: 'deploy' as const,
      createdAt: '2026-10-01T00:00:00Z', createdById: 'u-ana', createdByEmail: 'ana@empresa.com.br', createdByName: 'Ana Lima',
    };
    const actions = renderView({
      data: {
        events: [event],
        days: [
          {
            dateString: '2026-10-06',
            dayNumber: 6,
            weekdayShort: 'Ter',
            isToday: true,
            isCurrentMonth: true,
            events: [event],
          },
        ],
      },
    });
    await userEvent.click(screen.getByRole('button', { name: /Deploy noturno/ }));
    expect(actions.onSelectEvent).toHaveBeenCalledWith(event);
  });

  // feliz
  it('renders week grid header and scheduled event', () => {
    renderView();

    expect(screen.getByText('Outubro de 2026')).toBeInTheDocument();
    expect(screen.getByText('Deploy da v1.4')).toBeInTheDocument();
    expect(screen.getByText(/09:00 – 11:00/)).toBeInTheDocument();
  });

  it('triggers onNewEvent when clicking Novo Agendamento', async () => {
    const actions = renderView();

    const newBtn = screen.getByRole('button', { name: /novo agendamento/i });
    await userEvent.click(newBtn);

    expect(actions.onNewEvent).toHaveBeenCalled();
  });

  it('triggers onSelectEvent when event block is clicked', async () => {
    const actions = renderView();

    const eventBlock = screen.getByText('Deploy da v1.4');
    await userEvent.click(eventBlock);

    expect(actions.onSelectEvent).toHaveBeenCalled();
  });

  it('opens a new appointment on the day clicked in the month view', async () => {
    const actions = renderView({ data: { viewMode: 'month' }, state: { canEdit: true } });

    await userEvent.click(screen.getByRole('button', { name: 'Novo agendamento em 05/10/2026' }));

    expect(actions.onNewEventAt).toHaveBeenCalledWith('2026-10-05');
  });

  it('opens a new appointment on the day and time clicked in the week view', async () => {
    const actions = renderView({ state: { canEdit: true } });

    await userEvent.click(screen.getByRole('button', { name: 'Novo agendamento em 07/10/2026' }));

    expect(actions.onNewEventAt).toHaveBeenCalledWith(
      '2026-10-07',
      expect.stringMatching(/^\d{2}:\d{2}$/),
    );
  });

  it('turns the clicked point of the grid into a half-hour slot', () => {
    expect(timeAtOffset(0)).toBe('08:00');
    expect(timeAtOffset(30)).toBe('08:30');
    expect(timeAtOffset(56 * 5 + 1)).toBe('13:00');
  });

  // triste
  /* Quem só consulta não cria: o espaço vazio do calendário não vira botão. */
  it('does not offer the empty days to who cannot edit', () => {
    renderView({ data: { viewMode: 'month' }, state: { canEdit: false } });

    expect(screen.queryByRole('button', { name: /novo agendamento em/i })).not.toBeInTheDocument();
  });

  it('keeps a click near the end of the grid inside business hours', () => {
    expect(timeAtOffset(9999)).toBe('17:30');
    expect(timeAtOffset(-10)).toBe('08:00');
  });

  it('shows error state and allows retry', async () => {
    const actions = renderView({
      state: { error: 'Falha ao buscar agenda' },
    });

    expect(screen.getByText(/erro ao carregar o cronograma/i)).toBeInTheDocument();
    expect(screen.getByText('Falha ao buscar agenda')).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /tentar de novo/i });
    await userEvent.click(retryButton);
    expect(actions.onRetry).toHaveBeenCalled();
  });

  // feliz
  it('shows a record as a single moment, with no end time', async () => {
    const record = recordEvent;
    const actions = renderView({
      data: {
        events: [record],
        days: [
          {
            dateString: '2026-10-06',
            dayNumber: 6,
            weekdayShort: 'Ter',
            isToday: true,
            isCurrentMonth: true,
            events: [record],
          },
        ],
      },
    });

    await userEvent.click(screen.getByRole('button', { name: /Sistema enviado para revisão/ }));
    expect(actions.onSelectEvent).toHaveBeenCalledWith(record);
    expect(screen.queryByText(/16:00 –/)).not.toBeInTheDocument();
    expect(screen.queryByText('Agendamentos fora do horário da grade')).not.toBeInTheDocument();
  });

  // triste
  it('lists a record made after the grid hours outside the grid instead of losing it', () => {
    const record = { ...recordEvent, id: 10, title: 'Deploy enviado à noite', startTime: '18:00' };
    renderView({
      data: {
        events: [record],
        days: [
          {
            dateString: '2026-10-06',
            dayNumber: 6,
            weekdayShort: 'Ter',
            isToday: true,
            isCurrentMonth: true,
            events: [record],
          },
        ],
      },
    });

    expect(screen.getByText('Agendamentos fora do horário da grade')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /18:00 · Deploy enviado à noite/ })).toBeInTheDocument();
  });
});

/* Um evento do GitHub pronto para variar tipo, status, horário e autor. */
function githubEvent(overrides: Partial<SoftwareTimelineEvent> = {}): SoftwareTimelineEvent {
  return {
    id: 100,
    projectId: 1,
    projectName: 'Azuos',
    type: 'pr',
    externalId: '#100',
    title: 'PR de exemplo',
    description: null,
    url: 'https://github.com/example/project/pull/100',
    author: 'ana',
    status: 'merged',
    /* 14:00 UTC cai dentro da grade tanto em UTC quanto em UTC-3. */
    eventDate: '2026-10-06T14:00:00Z',
    createdAt: '2026-10-06T14:00:00Z',
    ...overrides,
  };
}

function dayColumn(overrides: Partial<DayColumn> = {}): DayColumn {
  return {
    dateString: '2026-10-06',
    dayNumber: 6,
    weekdayShort: 'Ter',
    isToday: false,
    isCurrentMonth: true,
    events: [],
    ...overrides,
  };
}

async function hoverAndReadTooltip(trigger: HTMLElement): Promise<HTMLElement> {
  await userEvent.hover(trigger);
  await waitFor(() => expect(trigger).toHaveAttribute('aria-describedby'));
  return document.getElementById(trigger.getAttribute('aria-describedby')!)!;
}

describe('AzuosWeekScheduleGrid — toolbar', () => {
  // feliz
  it.each(['day', 'week', 'month'] as const)('switches to the %s view', async (mode) => {
    const labels = { day: 'Dia', week: 'Semana', month: 'Mês' };
    const actions = renderView();
    await userEvent.click(screen.getByRole('button', { name: labels[mode] }));
    expect(actions.onViewModeChange).toHaveBeenCalledWith(mode);
  });

  // feliz
  it('goes to today and to the next period', async () => {
    const actions = renderView({ data: { viewMode: 'day' } });
    await userEvent.click(screen.getByRole('button', { name: 'Hoje' }));
    await userEvent.click(screen.getByRole('button', { name: 'Próximo dia' }));
    expect(actions.onToday).toHaveBeenCalledOnce();
    expect(actions.onNext).toHaveBeenCalledOnce();
  });

  // feliz
  it('hides the new appointment hint when the focus leaves the button', async () => {
    renderView();
    const button = screen.getByRole('button', { name: 'Novo agendamento' });
    button.focus();
    expect(await screen.findByText('Criar um agendamento na agenda de sistemas')).toBeInTheDocument();
    await fireEvent.focusOut(button);
    await waitFor(() =>
      expect(screen.queryByText('Criar um agendamento na agenda de sistemas')).not.toBeInTheDocument(),
    );
  });

  // feliz
  it('explains each filter when its picker receives focus', async () => {
    renderView({
      data: {
        filters: {
          project: '',
          author: '',
          type: '',
          isActive: false,
          projectOptions: [{ value: '', label: 'Todos os projetos' }],
          authorOptions: [{ value: '', label: 'Todos os autores' }],
        },
      },
    });
    const picker = screen.getByRole('button', { name: 'Filtrar por projeto' });
    picker.focus();
    expect(
      await screen.findByText('Filtrar agendamentos, PRs, issues e merges por projeto'),
    ).toBeInTheDocument();
    await fireEvent.focusOut(picker);
    await waitFor(() =>
      expect(
        screen.queryByText('Filtrar agendamentos, PRs, issues e merges por projeto'),
      ).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument();
  });

  // feliz
  it('details the productivity of each developer, counting local merges', async () => {
    renderView({
      data: {
        developerStats: [
          { author: 'ana', mergedPullRequests: 3, localMerges: 2, resolvedIssues: 1 },
          { author: 'bia', mergedPullRequests: 0, resolvedIssues: 0 },
        ],
      },
    });
    expect(screen.getByText('2 merges')).toBeInTheDocument();
    expect(screen.getByText('0 merges')).toBeInTheDocument();
    const tooltip = await hoverAndReadTooltip(screen.getByRole('button', { name: /^bia/ }));
    expect(tooltip).toHaveTextContent('bia: 0 PRs mergeados, 0 merges locais e 0 issues resolvidas');
  });
});

describe('AzuosWeekScheduleGrid — month view', () => {
  const days = [
    ...Array.from({ length: 7 }, (_, index) =>
      dayColumn({
        dateString: `2026-09-${28 + index}`.replace('2026-09-31', '2026-10-01'),
        dayNumber: index < 3 ? 28 + index : index - 2,
        weekdayShort: WEEKDAYS[index]!,
        isCurrentMonth: index >= 3,
      }),
    ),
    dayColumn({ dateString: '2026-10-05', dayNumber: 5, weekdayShort: 'Seg', isToday: true }),
  ];

  // feliz
  it('tells the day summary when hovering a day number, today or not', async () => {
    renderView({ data: { viewMode: 'month', days, githubEvents: [] } });
    const today = await hoverAndReadTooltip(screen.getByRole('button', { name: '5' }));
    expect(today).toHaveTextContent('Seg, 05/10/2026 · 0 agendamentos · 0 atividades do GitHub');
    const other = await hoverAndReadTooltip(screen.getByRole('button', { name: '28' }));
    expect(other).toHaveTextContent('Seg, 28/09/2026 · 0 agendamentos · 0 atividades do GitHub');
    expect(screen.getByRole('button', { name: '28' })).toHaveClass('text-muted-foreground');
  });

  // feliz
  it('previews two GitHub activities per day and counts the rest', async () => {
    const events = [1, 2, 3].map((id) =>
      githubEvent({ id, externalId: `#${id}`, title: `Atividade ${id}`, type: 'issue', status: 'closed' }),
    );
    const actions = renderView({
      data: {
        viewMode: 'month',
        githubEvents: events,
        days: [dayColumn({ events: [], githubEvents: events })],
      },
    });
    const more = screen.getByRole('button', { name: '+1 atividades' });
    const tooltip = await hoverAndReadTooltip(more);
    expect(tooltip).toHaveTextContent('Mais 1 atividades');
    await userEvent.click(screen.getByRole('button', { name: 'Ver 3 issues do dia 06/10/2026' }));
    expect(actions.onOpenGithubDay).toHaveBeenCalledWith('2026-10-06', 'issue');
  });

  // feliz
  it('shows a record with its check and the project and note of an appointment', async () => {
    const appointment = {
      ...recordEvent,
      id: 11,
      kind: 'appointment' as const,
      title: 'Reunião de alinhamento',
      startTime: '10:00',
      endTime: '11:00',
      projectName: 'Azuos Ticket',
      note: 'Levar o relatório',
    };
    renderView({
      data: {
        viewMode: 'month',
        events: [recordEvent, appointment],
        days: [dayColumn({ events: [recordEvent, appointment] })],
      },
    });
    expect(screen.getByLabelText('Registro')).toBeInTheDocument();
    const tooltip = await hoverAndReadTooltip(
      screen.getByRole('button', { name: /Reunião de alinhamento/ }),
    );
    expect(tooltip).toHaveTextContent('Projeto: Azuos Ticket');
    expect(tooltip).toHaveTextContent('Levar o relatório');
    const recordTooltip = await hoverAndReadTooltip(
      screen.getByRole('button', { name: /Sistema enviado para revisão/ }),
    );
    expect(recordTooltip).toHaveTextContent('Registrado por Ana Lima');
  });
});

describe('AzuosWeekScheduleGrid — hour grid', () => {
  // feliz
  it('describes the day header, the hour and the GitHub activity outside the grid', async () => {
    const nightly = githubEvent({ id: 7, externalId: '#7', title: 'Merge noturno', type: 'merge', eventDate: '2026-10-06T23:30:00Z' });
    renderView({
      data: {
        githubEvents: [nightly],
        days: [dayColumn({ githubEvents: [nightly] }), dayColumn({ dateString: '2026-10-07', dayNumber: 7, weekdayShort: 'Qua', isToday: true })],
      },
    });
    const header = await hoverAndReadTooltip(screen.getByRole('button', { name: /^Ter\s*6$/ }));
    expect(header).toHaveTextContent('Ter, 06/10/2026 · 0 agendamentos · 1 atividades do GitHub');
    const hour = await hoverAndReadTooltip(screen.getByRole('button', { name: '08:00' }));
    expect(hour).toHaveTextContent('08:00 · Horário local da agenda');
    expect(screen.getAllByRole('link', { name: /Merge noturno/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Ver 1 merge do dia 06/10/2026' })).toBeInTheDocument();
  });

  // feliz
  it('opens the merges of the day in the daily dialog', async () => {
    const merges = [1, 2].map((id) => githubEvent({ id, externalId: `#${id}`, type: 'merge', eventDate: '2026-10-06T23:30:00Z' }));
    const actions = renderView({
      data: { githubEvents: merges, days: [dayColumn({ githubEvents: merges })] },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Ver 2 merges do dia 06/10/2026' }));
    expect(actions.onOpenGithubDay).toHaveBeenCalledWith('2026-10-06', 'merge');
  });

  // feliz
  it('splits the column when an appointment overlaps a GitHub card', async () => {
    const appointment = {
      ...recordEvent,
      id: 12,
      kind: 'appointment' as const,
      title: 'Dia inteiro de deploy',
      startTime: '08:00',
      endTime: '17:00',
      projectName: 'Azuos Ticket',
      note: 'Sem janela de almoço',
    };
    const pr = githubEvent();
    renderView({
      data: {
        events: [appointment],
        githubEvents: [pr],
        days: [dayColumn({ events: [appointment], githubEvents: [pr] })],
      },
    });
    const block = screen.getByRole('button', { name: /Dia inteiro de deploy/ });
    expect(block).toHaveStyle({ right: '50%' });
    expect(block).toHaveTextContent('Azuos Ticket');
    const card = screen.getAllByRole('link', { name: /PR de exemplo/ })[0]!.closest('[data-slot="github-hour-event"]');
    expect(card).toHaveStyle({ left: '50%' });
    const tooltip = await hoverAndReadTooltip(block);
    expect(tooltip).toHaveTextContent('Projeto: Azuos Ticket');
    expect(tooltip).toHaveTextContent('Sem janela de almoço');
  });

  // feliz
  it('groups nearby GitHub activities in one card that opens the whole day', async () => {
    const group = [
      githubEvent({ id: 1, externalId: '#1', title: 'Primeiro PR' }),
      githubEvent({ id: 2, externalId: '#2', title: 'Issue junto', type: 'issue', status: 'closed', eventDate: '2026-10-06T14:10:00Z' }),
    ];
    const actions = renderView({
      data: { githubEvents: group, days: [dayColumn({ githubEvents: group })] },
    });
    const card = screen.getByRole('button', { name: /Ver 2 atividades próximas das/ });
    expect(card).toHaveTextContent('2 atividades · Primeiro PR');
    const tooltip = await hoverAndReadTooltip(card);
    expect(tooltip).toHaveTextContent('PR #1 · Primeiro PR');
    expect(tooltip).toHaveTextContent('Issue #2 · Issue junto');
    await userEvent.click(card);
    expect(actions.onOpenGithubDay).toHaveBeenCalledWith('2026-10-06', 'all');
  });

  // feliz
  it('explains the current time marker', async () => {
    renderView();
    const marker = await hoverAndReadTooltip(screen.getByRole('button', { name: 'Horário atual' }));
    expect(marker).toHaveTextContent('Horário atual na agenda');
  });

  // triste
  it('hides the current time marker when there is no position for it', () => {
    renderView({ data: { nowTopPx: null } });
    expect(screen.queryByRole('button', { name: 'Horário atual' })).not.toBeInTheDocument();
  });

  // feliz
  it('details an appointment listed outside the grid hours', async () => {
    const late = {
      ...recordEvent,
      id: 13,
      kind: 'appointment' as const,
      title: 'Plantão',
      startTime: '19:00',
      endTime: '21:00',
      projectName: 'Azuos Ticket',
      note: 'Avisar o time',
    };
    renderView({ data: { events: [late], days: [dayColumn({ events: [late] })] } });
    const tooltip = await hoverAndReadTooltip(screen.getByRole('button', { name: /Plantão/ }));
    expect(tooltip).toHaveTextContent('Projeto: Azuos Ticket');
    expect(tooltip).toHaveTextContent('Marcado por Ana Lima');
    expect(tooltip).toHaveTextContent('Avisar o time');
  });
});

describe('AzuosWeekScheduleGrid — GitHub activity in the period', () => {
  // triste
  it('explains the empty activity list with and without filters', () => {
    const filters = {
      project: '1',
      author: '',
      type: '',
      isActive: true,
      projectOptions: [{ value: '', label: 'Todos os projetos' }],
      authorOptions: [{ value: '', label: 'Todos os autores' }],
    };
    const { unmount } = render(WeekScheduleGrid, {
      props: {
        data: { monthYearTitle: 'Outubro', viewMode: 'week', days: [], events: [], nowTopPx: null, filters, githubEvents: [] },
        state: { isLoading: false, error: null },
        actions: { onPrev: vi.fn(), onNext: vi.fn(), onToday: vi.fn(), onViewModeChange: vi.fn(), onNewEvent: vi.fn(), onSelectEvent: vi.fn(), onRetry: vi.fn() },
      },
    });
    expect(screen.getByText('Nenhuma atividade encontrada com os filtros atuais.')).toBeInTheDocument();
    unmount();
    renderView();
    expect(screen.getByText(/Nenhuma atividade sincronizada neste período/)).toBeInTheDocument();
  });

  // feliz
  it('names each kind of activity and who did it', async () => {
    const events = [
      githubEvent({ id: 1, externalId: '#1', title: 'Merge local feito', type: 'merge', status: 'merged', authorName: 'Ana Lima' }),
      githubEvent({ id: 2, externalId: '#2', title: 'Issue fechada', type: 'issue', status: 'closed' }),
      githubEvent({ id: 3, externalId: '#3', title: 'Issue aberta', type: 'issue', status: 'open' }),
      githubEvent({ id: 4, externalId: '#4', title: 'PR fechado sem merge', type: 'pr', status: 'closed', author: null, projectName: null }),
      githubEvent({ id: 5, externalId: '#5', title: 'PR aguardando', type: 'pr', status: 'open', url: null }),
    ];
    renderView({ data: { githubEvents: events, days: [dayColumn({ githubEvents: events })] } });
    const timeline = screen.getByText('Atividade do GitHub no período').closest('section')!;
    expect(timeline).toHaveTextContent('Merge local · por Ana Lima');
    expect(timeline).toHaveTextContent('Issue resolvida');
    expect(timeline).toHaveTextContent('Issue aberta · por ana');
    expect(timeline).toHaveTextContent('Projeto · PR fechado · por desconhecido');
    expect(timeline).toHaveTextContent('PR aberto');
    const link = within(timeline).getByRole('link', { name: /Merge local feito/ });
    const tooltip = await hoverAndReadTooltip(link);
    expect(tooltip).toHaveTextContent('#1 · Merge local feito');
    expect(tooltip).toHaveTextContent('Azuos · por Ana Lima');
  });
});
