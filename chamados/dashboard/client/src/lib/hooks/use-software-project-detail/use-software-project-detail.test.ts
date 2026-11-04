import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';
import { type SoftwareTimelineEvent } from '@template/shared/schemas/software-timeline.schema';
import { type Ticket } from '@template/shared/schemas/ticket.schema';
import { render } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-software-project-detail-harness.test.svelte';
import {
  projectProgressOf,
  type SoftwareProjectDetailModel,
  timelineDaysOf,
} from './use-software-project-detail.svelte';

vi.mock('$lib/api/software-projects.api', () => ({
  softwareProjectsApi: { get: vi.fn(), syncGithub: vi.fn() },
}));
vi.mock('$lib/api/software-timeline.api', () => ({
  softwareTimelineApi: { list: vi.fn() },
}));
vi.mock('$lib/api/tickets.api', () => ({
  ticketsApi: { list: vi.fn() },
}));
vi.mock('$lib/api/github-integration.api', () => ({
  githubIntegrationApi: { status: vi.fn(), authorize: vi.fn() },
}));

const { softwareProjectsApi } = await import('$lib/api/software-projects.api');
const { softwareTimelineApi } = await import('$lib/api/software-timeline.api');
const { ticketsApi } = await import('$lib/api/tickets.api');

const NOW = Date.parse('2026-10-20T12:00:00.000Z');

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

function event(overrides: Partial<SoftwareTimelineEvent> = {}): SoftwareTimelineEvent {
  return {
    id: 1,
    projectId: 1,
    projectName: 'Chamados',
    type: 'pr',
    externalId: '#1',
    title: 'PR',
    description: null,
    url: null,
    author: 'dev',
    authorName: 'Dev',
    coAuthors: [],
    status: 'open',
    eventDate: '2026-10-19T12:00:00.000Z',
    createdAt: '2026-10-19T12:00:00.000Z',
    ...overrides,
  };
}

const TIMELINE = [
  event({ id: 1, type: 'pr', status: 'open', eventDate: '2026-10-19T12:00:00.000Z' }),
  event({ id: 2, type: 'pr', status: 'merged', eventDate: '2026-10-18T12:00:00.000Z' }),
  event({ id: 3, type: 'issue', status: 'open', eventDate: '2026-10-18T09:00:00.000Z' }),
  event({ id: 4, type: 'merge', status: 'merged', eventDate: '2026-10-01T12:00:00.000Z' }),
];

const page = <T,>(items: T[], total = items.length) => ({ items, total, page: 1, pageSize: 200 });

function mountModel(id = 1): SoftwareProjectDetailModel {
  let model!: SoftwareProjectDetailModel;
  render(Harness, { props: { id, onReady: (ready: SoftwareProjectDetailModel) => (model = ready) } });

  return model;
}

async function mountLoadedModel(): Promise<SoftwareProjectDetailModel> {
  const model = mountModel();
  await vi.waitFor(
    () => {
      expect(model.data.days).toBeDefined();
      expect(model.state.isLoading).toBe(false);
    },
    { timeout: 4_000 },
  );

  return model;
}

describe('useSoftwareProjectDetailModel', () => {
  beforeEach(() => {
    vi.mocked(softwareProjectsApi.get).mockResolvedValue(project());
    vi.mocked(softwareProjectsApi.syncGithub).mockResolvedValue({ synced: 2, message: '2 PRs.' });
    vi.mocked(softwareTimelineApi.list).mockResolvedValue(page(TIMELINE));
    vi.mocked(ticketsApi.list).mockResolvedValue(
      page([{ id: 1, status: 'open' } as Ticket, { id: 2, status: 'resolved' } as Ticket]),
    );
  });

  // feliz
  it('brings the system, its progress, the open tickets and the timeline by day', async () => {
    const model = await mountLoadedModel();

    expect(model.data.project?.name).toBe('Chamados');
    expect(model.data.openTickets.map((ticket) => ticket.id)).toEqual([1]);
    expect(model.data.progress.openPullRequests.map((item) => item.id)).toEqual([1]);
    expect(model.data.progress.openIssues.map((item) => item.id)).toEqual([3]);
    expect(model.data.days.map((day) => day.events.length)).toEqual([1, 2, 1]);
    expect(model.data.isTruncated).toBe(false);
    expect(model.state.isMissing).toBe(false);
    /* Sem pessoa na sessão do teste, não há vínculo com o GitHub para sincronizar. */
    expect(model.state.canSync).toBe(false);
  });

  it('filters the timeline by kind without asking the server again', async () => {
    const model = await mountLoadedModel();

    model.actions.onFilterChange('issue');

    expect(model.data.filter).toBe('issue');
    expect(model.data.days.flatMap((day) => day.events).map((item) => item.id)).toEqual([3]);
    expect(softwareTimelineApi.list).toHaveBeenCalledTimes(1);
  });

  it('synchronizes and keeps the message of the server', async () => {
    const model = await mountLoadedModel();

    model.actions.onSync();

    await vi.waitFor(() => expect(model.data.syncMessage).toBe('2 PRs.'));
    expect(softwareProjectsApi.syncGithub).toHaveBeenCalledWith(1);
  });

  it('warns when the timeline was cut at the ceiling of the query', async () => {
    vi.mocked(softwareTimelineApi.list).mockResolvedValue(page(TIMELINE, 900));
    const model = await mountLoadedModel();

    expect(model.data.isTruncated).toBe(true);
  });

  // triste
  it('tells a missing system apart from an error, and retries', async () => {
    vi.mocked(softwareProjectsApi.get).mockRejectedValueOnce(new ApiError(404, 'Não achei.'));
    const model = mountModel();
    await vi.waitFor(() => expect(model.state.isMissing).toBe(true), { timeout: 4_000 });
    expect(model.state.error).toBeNull();

    model.actions.onRetry();
    await vi.waitFor(() => expect(model.state.isMissing).toBe(false), { timeout: 4_000 });
    expect(softwareProjectsApi.get).toHaveBeenCalledTimes(2);
  });

  it('shows the error of the server when the system cannot be read', async () => {
    vi.mocked(softwareProjectsApi.get).mockRejectedValue(new ApiError(500, 'Banco fora.'));
    const model = mountModel();

    await vi.waitFor(() => expect(model.state.error).toBe('Banco fora.'), { timeout: 4_000 });
  });

  it('shows the refusal of the sync and does not fire it twice', async () => {
    let release!: () => void;
    vi.mocked(softwareProjectsApi.syncGithub).mockReturnValueOnce(
      new Promise((resolve) => (release = () => resolve({ synced: 0, message: 'ok' }))),
    );
    const model = await mountLoadedModel();

    model.actions.onSync();
    await vi.waitFor(() => expect(model.state.isSyncing).toBe(true));
    model.actions.onSync();
    expect(softwareProjectsApi.syncGithub).toHaveBeenCalledTimes(1);
    release();
    await vi.waitFor(() => expect(model.state.isSyncing).toBe(false));

    vi.mocked(softwareProjectsApi.syncGithub).mockRejectedValueOnce(new ApiError(403, 'Vincule.'));
    model.actions.onSync();
    await vi.waitFor(() => expect(model.state.syncError).toBe('Vincule.'));
  });
});

describe('projectProgressOf', () => {
  // feliz
  it('counts what was delivered in the last week and the latest activity', () => {
    const progress = projectProgressOf(TIMELINE, NOW);

    expect(progress.deliveredLastWeek).toBe(1);
    expect(progress.lastActivityAt).toBe('2026-10-19T12:00:00.000Z');
  });

  // triste
  it('has nothing to say about a system never synchronized', () => {
    expect(projectProgressOf([], NOW)).toEqual({
      openPullRequests: [],
      openIssues: [],
      deliveredLastWeek: 0,
      lastActivityAt: null,
    });
  });
});

describe('timelineDaysOf', () => {
  // feliz
  it('groups by day, newest first, respecting the filter', () => {
    const days = timelineDaysOf(TIMELINE, '');
    expect(days.map((day) => day.events.map((item) => item.id))).toEqual([[1], [2, 3], [4]]);

    expect(timelineDaysOf(TIMELINE, 'merge').flatMap((day) => day.events).map((item) => item.id)).toEqual([4]);
  });
});
