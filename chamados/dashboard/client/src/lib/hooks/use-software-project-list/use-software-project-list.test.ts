import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';
import { render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-software-project-list-harness.test.svelte';
import { type SoftwareProjectListModel } from './use-software-project-list.svelte';

vi.mock('$lib/api/software-projects.api', () => ({
  softwareProjectsApi: { list: vi.fn(), remove: vi.fn(), syncGithub: vi.fn(), syncAllGithub: vi.fn() },
}));

const { softwareProjectsApi } = await import('$lib/api/software-projects.api');

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

const page = (items: SoftwareProject[]) => ({ items, total: items.length, page: 1, pageSize: 200 });

function mountModel(): SoftwareProjectListModel {
  let model!: SoftwareProjectListModel;
  render(Harness, { props: { onReady: (ready: SoftwareProjectListModel) => (model = ready) } });

  return model;
}

async function mountLoadedModel(): Promise<SoftwareProjectListModel> {
  const model = mountModel();
  await waitFor(() => expect(model.state.isLoading).toBe(false));

  return model;
}

describe('useSoftwareProjectListModel', () => {
  beforeEach(() => {
    vi.mocked(softwareProjectsApi.list).mockResolvedValue(page([project()]));
    vi.mocked(softwareProjectsApi.remove).mockResolvedValue(undefined as never);
    vi.mocked(softwareProjectsApi.syncGithub).mockResolvedValue({ synced: 1, message: '1 PR.' });
    vi.mocked(softwareProjectsApi.syncAllGithub).mockResolvedValue({
      projects: 1,
      prs: 1,
      issues: 0,
      merges: 0,
      failed: [],
      message: 'Tudo sincronizado.',
    } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // feliz
  it('brings the systems and sends the filters to the server', async () => {
    const model = await mountLoadedModel();
    expect(model.data.items).toHaveLength(1);
    expect(model.state.isEmpty).toBe(false);

    model.actions.onSearchChange('  chamados ');
    model.actions.onStatusChange('deprecated');

    await waitFor(() =>
      expect(softwareProjectsApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'chamados', status: 'deprecated' }),
      ),
    );
    expect(model.data.filter).toEqual({ search: '  chamados ', status: 'deprecated' });

    model.actions.onClearFilters();
    await waitFor(() =>
      expect(softwareProjectsApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: undefined, status: undefined }),
      ),
    );
  });

  it('asks before deleting and deletes on confirmation', async () => {
    const model = await mountLoadedModel();

    model.actions.onAskDelete(project());
    expect(model.data.deleting?.id).toBe(1);

    model.actions.onCancelDelete();
    expect(model.data.deleting).toBeNull();

    model.actions.onAskDelete(project());
    model.actions.onConfirmDelete();
    await waitFor(() => expect(softwareProjectsApi.remove).toHaveBeenCalledWith(1));
    await waitFor(() => expect(model.data.deleting).toBeNull());
  });

  it('synchronizes one system and shows the message for a while', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const model = await mountLoadedModel();

    model.actions.onSyncGithub(1);
    await waitFor(() => expect(model.state.syncMessage).toBe('1 PR.'));

    vi.advanceTimersByTime(5_000);
    await waitFor(() => expect(model.state.syncMessage).toBeNull());
  });

  it('synchronizes every system at once', async () => {
    const model = await mountLoadedModel();

    model.actions.onSyncAllGithub();

    await waitFor(() => expect(model.state.syncMessage).toBe('Tudo sincronizado.'));
    expect(softwareProjectsApi.syncAllGithub).toHaveBeenCalledTimes(1);
  });

  // triste
  it('tells filtered-out apart from empty', async () => {
    vi.mocked(softwareProjectsApi.list).mockResolvedValue(page([]));
    const model = await mountLoadedModel();
    expect(model.state.isEmpty).toBe(true);
    expect(model.state.isFilteredOut).toBe(false);

    model.actions.onSearchChange('nada');
    await waitFor(() => expect(model.state.isFilteredOut).toBe(true));
    expect(model.state.isEmpty).toBe(false);
  });

  it('shows the errors of the list, of the deletion and of the sync', async () => {
    vi.mocked(softwareProjectsApi.list).mockRejectedValueOnce(new ApiError(500, 'Banco fora.'));
    vi.mocked(softwareProjectsApi.remove).mockRejectedValue(new ApiError(409, 'Tem chamados.'));
    vi.mocked(softwareProjectsApi.syncGithub).mockRejectedValue(
      new ApiError(403, 'Vincule sua conta do GitHub.'),
    );
    const model = mountModel();
    await waitFor(() => expect(model.state.error).toBe('Banco fora.'));

    model.actions.onRetry();
    await waitFor(() => expect(model.state.error).toBeNull());

    model.actions.onAskDelete(project());
    model.actions.onConfirmDelete();
    await waitFor(() => expect(model.state.deleteError).toBe('Tem chamados.'));
    /* O diálogo fica aberto, com o erro, para a pessoa decidir. */
    expect(model.data.deleting?.id).toBe(1);

    model.actions.onSyncGithub(1);
    await waitFor(() => expect(model.state.syncError).toBe('Vincule sua conta do GitHub.'));
  });

  it('does not start a second sync or deletion while one is running', async () => {
    let release!: () => void;
    vi.mocked(softwareProjectsApi.syncGithub).mockReturnValue(
      new Promise((resolve) => (release = () => resolve({ synced: 0, message: 'ok' }))),
    );
    vi.mocked(softwareProjectsApi.syncAllGithub).mockReturnValue(new Promise(() => {}));
    const model = await mountLoadedModel();

    model.actions.onSyncGithub(1);
    await waitFor(() => expect(model.state.isSyncing).toBe(true));
    model.actions.onSyncGithub(1);
    expect(softwareProjectsApi.syncGithub).toHaveBeenCalledTimes(1);

    model.actions.onSyncAllGithub();
    await waitFor(() => expect(model.state.isSyncingAll).toBe(true));
    model.actions.onSyncAllGithub();
    expect(softwareProjectsApi.syncAllGithub).toHaveBeenCalledTimes(1);

    release();
    await waitFor(() => expect(model.state.isSyncing).toBe(false));
  });
});
