import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SoftwareTimelineEvent } from '@template/shared/schemas/software-timeline.schema';
import type { SoftwareScheduleModel } from './use-software-schedule.svelte';
import Harness from './use-software-schedule-harness.test.svelte';

vi.mock('$lib/api/software-schedule.api', () => ({
  softwareScheduleApi: { list: vi.fn(), remove: vi.fn() },
}));
vi.mock('$lib/api/software-timeline.api', () => ({ softwareTimelineApi: { list: vi.fn() } }));
vi.mock('$lib/api/software-projects.api', () => ({ softwareProjectsApi: { list: vi.fn() } }));
const { softwareScheduleApi } = await import('$lib/api/software-schedule.api');
const { softwareTimelineApi } = await import('$lib/api/software-timeline.api');
const { softwareProjectsApi } = await import('$lib/api/software-projects.api');

function activity(id: number): SoftwareTimelineEvent {
  const date = new Date();
  date.setHours(8, id * 5, 0, 0);
  return {
    id,
    projectId: 1,
    projectName: 'Azuos',
    type: 'pr',
    externalId: `#${id}`,
    title: `PR ${id}`,
    description: null,
    url: null,
    author: 'ana',
    status: 'merged',
    eventDate: date.toISOString(),
    createdAt: date.toISOString(),
  };
}

async function mount(): Promise<SoftwareScheduleModel> {
  let model!: SoftwareScheduleModel;
  render(Harness, {
    onReady: (value) => {
      model = value;
    },
  });
  await waitFor(() => expect(model.state.isLoading).toBe(false));
  return model;
}

describe('default view', () => {
  // feliz
  it('opens on the month view', async () => {
    const model = await mount();

    expect(model.data.viewMode).toBe('month');
  });

  // triste
  /* Mês por padrão não prende ninguém: semana e dia continuam a um clique. */
  it('still switches to the week view', async () => {
    const model = await mount();

    model.actions.onViewModeChange('week');

    await waitFor(() => expect(model.data.viewMode).toBe('week'));
  });
});

describe('daily GitHub PRs', () => {
  it('filters appointments by project while author and type only affect GitHub activity', async () => {
    const date = new Date().toLocaleDateString('sv-SE');
    const appointment = {
      id: 1,
      kind: 'appointment' as const,
      title: 'Deploy',
      date,
      startTime: '10:00',
      endTime: '11:00',
      category: 'deploy' as const,
      color: 'green' as const,
      note: null,
      projectId: 1,
      projectName: 'Azuos',
      createdAt: new Date().toISOString(), createdById: 'u-ana', createdByEmail: 'ana@empresa.com.br', createdByName: 'Ana Lima',
    };
    vi.mocked(softwareScheduleApi.list).mockResolvedValue([
      appointment,
      { ...appointment, id: 2, projectId: 2, projectName: 'Outro' },
    ]);
    const model = await mount();
    model.actions.onProjectFilterChange('1');
    model.actions.onAuthorFilterChange('ana');
    model.actions.onTypeFilterChange('issue');
    expect(model.data.events.map((event) => event.id)).toEqual([1]);
    expect(
      model.data.days.find((day) => day.dateString === date)?.events.map((event) => event.id),
    ).toEqual([1]);
    model.actions.onClearFilters();
    expect(model.data.events).toHaveLength(2);
  });

  it('filters by author without removing available choices', async () => {
    const model = await mount();
    model.actions.onAuthorFilterChange('autor-sem-atividade');
    expect(model.data.githubEvents.every((event) => event.type === 'issue')).toBe(true);
    expect(model.data.filters.authorOptions).toContainEqual({ value: 'ana', label: 'ana' });
    expect(model.data.filters.authorOptions).toContainEqual({
      value: 'autor-sem-atividade',
      label: 'autor-sem-atividade',
    });
  });
  // feliz
  // feliz
  /* A branch do Guilherme juntada por outra pessoa conta para ele também (co-autor). */
  it('finds and counts a person through the work they co-authored', async () => {
    const merge = {
      ...activity(1),
      type: 'merge' as const,
      author: 'vinicius-gpl',
      authorName: 'Vinícius Gabriel',
      coAuthors: ['Guilherme Siqueira'],
    };
    vi.mocked(softwareTimelineApi.list).mockResolvedValue({
      items: [merge, { ...activity(2), author: 'outra', authorName: 'Ana Lima' }],
      total: 2,
      page: 1,
      pageSize: 200,
    });
    const model = await mount();

    const guilherme = model.data.filters.authorOptions.find(
      (option) => option.label === 'Guilherme Siqueira',
    );
    expect(guilherme).toBeDefined();
    model.actions.onAuthorFilterChange(guilherme!.value);
    expect(model.data.githubEvents.map((event) => event.id)).toEqual([1]);
    expect(
      model.data.developerStats.find((developer) => developer.author === 'Guilherme Siqueira'),
    ).toMatchObject({ localMerges: 1 });
  });

  // triste
  it('does not list a co-author twice when they are also the author', async () => {
    vi.mocked(softwareTimelineApi.list).mockResolvedValue({
      items: [{ ...activity(1), authorName: 'Ana Lima', coAuthors: ['ana lima'] }],
      total: 1,
      page: 1,
      pageSize: 200,
    });
    const model = await mount();

    expect(
      model.data.filters.authorOptions.filter((option) => /ana lima/i.test(option.label)),
    ).toHaveLength(1);
  });

  /* A mesma pessoa com dois identificadores (login do GitHub e nome do commit) é uma só no
     filtro e na produtividade — com ou sem acento no nome. */
  it('groups the same person under one author even with different logins', async () => {
    const pr = { ...activity(1), author: 'vinicius-gpl', authorName: 'Vinícius Gabriel' };
    const merge = {
      ...activity(2),
      type: 'merge' as const,
      author: 'Vinicius Gabriel',
      authorName: 'Vinicius Gabriel',
    };
    const other = { ...activity(3), author: 'gui', authorName: 'Guilherme Siqueira' };
    vi.mocked(softwareTimelineApi.list).mockResolvedValue({
      items: [pr, merge, other],
      total: 3,
      page: 1,
      pageSize: 200,
    });
    const model = await mount();

    const vinicius = model.data.filters.authorOptions.filter((option) =>
      option.label.startsWith('Vin'),
    );
    expect(vinicius).toHaveLength(1);
    model.actions.onAuthorFilterChange(vinicius[0]!.value);
    expect(model.data.githubEvents.map((event) => event.id).sort()).toEqual([1, 2]);
  });

  // triste
  it('keeps different people with the same surname apart', async () => {
    vi.mocked(softwareTimelineApi.list).mockResolvedValue({
      items: [
        { ...activity(1), author: 'ana', authorName: 'Ana Lima' },
        { ...activity(2), author: 'bia', authorName: 'Bia Lima' },
      ],
      total: 2,
      page: 1,
      pageSize: 200,
    });
    const model = await mount();

    expect(model.data.filters.authorOptions.map((option) => option.label)).toEqual([
      'Todos os autores',
      'Ana Lima',
      'Bia Lima',
    ]);
  });

  it('combines author, type and project filters across counts, days and the daily dialog', async () => {
    const model = await mount();
    const today = new Date().toLocaleDateString('sv-SE');
    model.actions.onAuthorFilterChange('ana');
    model.actions.onTypeFilterChange('issue');
    model.actions.onProjectFilterChange('1');
    expect(
      model.data.githubEvents.every(
        (event) => event.type === 'issue' && event.author === 'ana' && event.projectId === 1,
      ),
    ).toBe(true);
    expect(model.data.githubEvents).toHaveLength(1);
    expect(model.data.mergedPullRequests).toBe(0);
    model.actions.onOpenGithubDay(today, 'all');
    expect(model.data.githubDay?.items.map((event) => event.id)).toEqual([13]);
    model.actions.onClearFilters();
    expect(model.data.githubDay?.total).toBe(13);
    expect(model.data.filters.isActive).toBe(false);
  });

  it('keeps filter options available when there are no matching activities', async () => {
    const model = await mount();
    model.actions.onProjectFilterChange('999');
    expect(model.data.githubEvents.every((event) => event.type === 'issue')).toBe(true);
    expect(model.data.days.every((day) => !day.githubEvents?.length)).toBe(true);
    expect(model.data.filters.authorOptions).toContainEqual({ value: 'ana', label: 'ana' });
    expect(model.data.filters.projectOptions).toContainEqual({ value: '1', label: 'Azuos' });
    model.actions.onClearFilters();
    expect(model.data.githubEvents.length).toBeGreaterThan(0);
  });
  it('opens issues separately and includes both types for a mixed hourly group', async () => {
    const model = await mount();
    const today = new Date().toLocaleDateString('sv-SE');
    model.actions.onOpenGithubDay(today, 'issue');
    expect(model.data.githubDay?.type).toBe('issue');
    expect(model.data.githubDay?.items.map((event) => event.id)).toEqual([13]);
    model.actions.onOpenGithubDay(today, 'all');
    expect(model.data.githubDay?.total).toBe(13);
    model.actions.onGithubDayPageChange(3);
    expect(model.data.githubDay?.items.map((event) => event.id)).toEqual([11, 12, 13]);
    model.actions.onOpenGithubDay(today);
    expect(model.data.githubDay?.type).toBe('pr');
    expect(model.data.githubDay?.total).toBe(12);
    expect(model.data.githubDay?.page).toBe(1);
  });
  beforeEach(() => {
    vi.mocked(softwareScheduleApi.list).mockResolvedValue([]);
    vi.mocked(softwareProjectsApi.list).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 100,
    });
    const prs = Array.from({ length: 12 }, (_, index) => activity(index + 1));
    const otherDay = activity(14);
    const previousDate = new Date(otherDay.eventDate);
    previousDate.setDate(previousDate.getDate() - 1);
    otherDay.eventDate = previousDate.toISOString();
    const items = [...prs.reverse(), { ...activity(13), type: 'issue' as const }, otherDay];
    vi.mocked(softwareTimelineApi.list).mockResolvedValue({
      items,
      total: items.length,
      page: 1,
      pageSize: 200,
    });
  });

  it('keeps every PR of the local day in timestamp order across pages', async () => {
    const model = await mount();
    model.actions.onViewModeChange('day');
    const today = model.data.days[0]!.dateString;
    model.actions.onOpenGithubDay(today);
    await waitFor(() => expect(model.data.githubDay?.total).toBe(12));
    expect(model.data.githubDay?.items.map((event) => event.id)).toEqual([1, 2, 3, 4, 5]);
    model.actions.onGithubDayPageChange(2);
    expect(model.data.githubDay?.items.map((event) => event.id)).toEqual([6, 7, 8, 9, 10]);
    model.actions.onGithubDayPageChange(3);
    expect(model.data.githubDay?.items.map((event) => event.id)).toEqual([11, 12]);
  });

  it('starts at page one when reopening a day and clears the selection when closed', async () => {
    const model = await mount();
    const today = new Date().toLocaleDateString('sv-SE');
    model.actions.onOpenGithubDay(today);
    model.actions.onGithubDayPageChange(3);
    model.actions.onCloseGithubDay();
    expect(model.data.githubDay).toBeNull();
    model.actions.onOpenGithubDay(today);
    expect(model.data.githubDay?.page).toBe(1);
    expect(model.data.githubDay?.items[0]?.id).toBe(1);
  });

  // feliz
  /* Abrir e paginar a janela de um dia não pode remontar o calendário: era isso que travava a
     tela por segundos num dia cheio de PRs. */
  it('keeps the same calendar while the day dialog opens and pages', async () => {
    const model = await mount();
    const days = model.data.days;
    const today = new Date().toLocaleDateString('sv-SE');

    model.actions.onOpenGithubDay(today);
    model.actions.onGithubDayPageChange(2);

    expect(model.data.githubDay?.page).toBe(2);
    expect(model.data.days).toBe(days);
  });

  // triste
  /* Já filtro muda o que aparece no calendário: aí ele precisa ser refeito. */
  it('rebuilds the calendar when a filter changes', async () => {
    const model = await mount();
    const days = model.data.days;

    model.actions.onTypeFilterChange('issue');

    await waitFor(() => expect(model.data.days).not.toBe(days));
    expect(model.data.githubEvents.every((event) => event.type === 'issue')).toBe(true);
  });
});

describe('navigation between periods', () => {
  // feliz
  it.each([
    ['day', 1],
    ['week', 7],
  ] as const)('moves one %s back and forth', async (mode, amount) => {
    const model = await mount();
    model.actions.onViewModeChange(mode);
    await waitFor(() => expect(model.data.viewMode).toBe(mode));
    const start = model.data.currentDate.getTime();

    model.actions.onNext();
    await waitFor(() => expect(model.data.currentDate.getTime()).toBe(start + amount * 86_400_000));
    model.actions.onPrev();
    await waitFor(() => expect(model.data.currentDate.getTime()).toBe(start));
  });

  // feliz
  it('moves whole months without overflowing the day and returns to today', async () => {
    const model = await mount();
    const start = new Date(model.data.currentDate);

    model.actions.onNext();
    await waitFor(() =>
      expect(model.data.currentDate.getMonth()).toBe((start.getMonth() + 1) % 12),
    );
    expect(model.data.currentDate.getDate()).toBeLessThanOrEqual(start.getDate());
    model.actions.onPrev();
    model.actions.onPrev();
    await waitFor(() =>
      expect(model.data.currentDate.getMonth()).toBe((start.getMonth() + 11) % 12),
    );
    expect(model.data.monthYearTitle).not.toBe('');
    model.actions.onToday();
    await waitFor(() => expect(model.data.currentDate.getMonth()).toBe(start.getMonth()));
    model.actions.onViewModeChange('day');
    await waitFor(() => expect(model.data.monthYearTitle).toMatch(/^\d{1,2} de /));
  });

  // feliz
  it('fetches the three sources again on retry', async () => {
    const model = await mount();
    vi.mocked(softwareScheduleApi.list).mockClear();
    vi.mocked(softwareTimelineApi.list).mockClear();
    vi.mocked(softwareProjectsApi.list).mockClear();

    model.actions.onRetry();

    await waitFor(() => expect(softwareScheduleApi.list).toHaveBeenCalled());
    await waitFor(() => expect(softwareTimelineApi.list).toHaveBeenCalled());
    await waitFor(() => expect(softwareProjectsApi.list).toHaveBeenCalled());
  });

  // triste
  it('ignores an unknown activity type in the filter', async () => {
    const model = await mount();
    model.actions.onTypeFilterChange('issue');
    model.actions.onTypeFilterChange('bogus');
    expect(model.data.filters.type).toBe('');
    expect(model.data.filters.isActive).toBe(false);
  });

  // triste
  it('shows an empty day dialog for a date outside the calendar', async () => {
    const model = await mount();
    model.actions.onOpenGithubDay('1999-01-01', 'all');
    expect(model.data.githubDay).toMatchObject({ total: 0, items: [], page: 1 });
  });
});

describe('deleting an event', () => {
  // feliz
  it('confirms the deletion and refreshes the calendar', async () => {
    vi.mocked(softwareScheduleApi.remove).mockResolvedValue(undefined as never);
    const model = await mount();

    await expect(model.actions.onDeleteEvent(1)).resolves.toBe(true);
    expect(softwareScheduleApi.remove).toHaveBeenCalledWith(1);
    await waitFor(() => expect(model.state.isDeleting).toBe(false));
  });

  // triste
  it('reports the failure instead of throwing', async () => {
    vi.mocked(softwareScheduleApi.remove).mockRejectedValue(new Error('Serviço fora do ar.'));
    const model = await mount();

    await expect(model.actions.onDeleteEvent(1)).resolves.toBe(false);
    await waitFor(() => expect(model.state.deleteError).toBeTruthy());
  });

  // triste
  it('does not start a second deletion while one is pending', async () => {
    let finish!: () => void;
    vi.mocked(softwareScheduleApi.remove).mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }) as never,
    );
    const model = await mount();

    const first = model.actions.onDeleteEvent(1);
    await waitFor(() => expect(model.state.isDeleting).toBe(true));
    await expect(model.actions.onDeleteEvent(2)).resolves.toBe(false);
    finish();
    await expect(first).resolves.toBe(true);
    expect(softwareScheduleApi.remove).toHaveBeenCalledTimes(1);
  });
});

describe('projects, people and the current time', () => {
  const project = {
    id: 7,
    name: 'Portal',
    description: null,
    repositoryUrl: 'https://github.com/example/portal',
    status: 'active' as const,
    color: 'blue' as const,
    githubRepoOwner: null,
    githubRepoName: null,
    responsibleId: null,
    responsibleName: null,
    openTicketsCount: 0,
    pullRequestsCount: 0,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: null,
  };

  // feliz
  it('lists registered projects and names unknown ones by their id', async () => {
    vi.mocked(softwareProjectsApi.list).mockResolvedValue({ items: [project], total: 1, page: 1, pageSize: 100 });
    const items = [
      { ...activity(1), projectId: 7, projectName: null },
      { ...activity(2), projectId: 9, projectName: null },
      { ...activity(3), projectId: 9, projectName: null, author: null, authorName: null, type: 'merge' as const },
      { ...activity(4), projectId: 7, projectName: null, type: 'issue' as const, status: 'closed' as const, author: 'bia', coAuthors: ['bot[bot]'] },
      { ...activity(5), type: 'issue' as const, status: 'open' as const },
    ];
    vi.mocked(softwareTimelineApi.list).mockResolvedValue({ items, total: items.length, page: 1, pageSize: 200 });
    const model = await mount();

    await waitFor(() => expect(model.data.projects).toHaveLength(1));
    expect(model.data.filters.projectOptions.map((option) => option.label)).toEqual([
      'Todos os projetos',
      'Azuos',
      'Portal',
      'Projeto 9',
    ]);
    expect(model.data.filters.authorOptions.map((option) => option.label)).toEqual([
      'Todos os autores',
      'ana',
      'bia',
      'bot[bot]',
      'Não informado',
    ]);
    expect(model.data.developerStats).toEqual([
      { author: 'ana', mergedPullRequests: 2, localMerges: 0, resolvedIssues: 0 },
      { author: 'bia', mergedPullRequests: 0, localMerges: 0, resolvedIssues: 1 },
      { author: 'Não informado', mergedPullRequests: 0, localMerges: 1, resolvedIssues: 0 },
    ]);
  });

  // feliz
  it('loads every page of the timeline when the period has more than one', async () => {
    vi.mocked(softwareTimelineApi.list).mockImplementation(async (query) => {
      const page = query?.page ?? 1;
      return { items: [activity(page === 1 ? 1 : 2)], total: 201, page, pageSize: 200 };
    });
    const model = await mount();

    await waitFor(() => expect(model.data.githubEvents).toHaveLength(2));
    expect(softwareTimelineApi.list).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
  });

  // feliz
  /* O `SvelteDate` guarda o `Date` original na importação, então o relógio falso do vitest não
     chega até ele; o que ele consulta é o protótipo, e é lá que a hora é fixada. */
  it('positions the current time line inside business hours', async () => {
    vi.spyOn(Date.prototype, 'getHours').mockReturnValue(10);
    vi.spyOn(Date.prototype, 'getMinutes').mockReturnValue(30);
    try {
      const model = await mount();
      expect(model.data.nowTopPx).toBe(140);
    } finally {
      vi.restoreAllMocks();
    }
  });

  // triste
  it('hides the current time line outside business hours', async () => {
    vi.spyOn(Date.prototype, 'getHours').mockReturnValue(22);
    try {
      const model = await mount();
      expect(model.data.nowTopPx).toBeNull();
    } finally {
      vi.restoreAllMocks();
    }
  });
});
