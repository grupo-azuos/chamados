import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('$lib/api/agent-download.api', () => ({
  agentDownloadApi: { lts: vi.fn(), download: vi.fn(), releases: vi.fn(), downloadVersion: vi.fn() },
}));
vi.mock('$lib/utils/download-file.util', () => ({ triggerUrlDownload: vi.fn() }));
vi.mock('$lib/utils/agent-installer-script.util', () => ({ downloadAgentInstallerScript: vi.fn() }));
import { ApiError } from '$lib/api/http-client';
import { agentDownloadApi } from '$lib/api/agent-download.api';
import { triggerUrlDownload } from '$lib/utils/download-file.util';
import { downloadAgentInstallerScript } from '$lib/utils/agent-installer-script.util';
import { type AgentDownloadModel } from './use-agent-download.svelte';
import Harness from './use-agent-download-harness.test.svelte';

async function mount() {
  let model!: AgentDownloadModel;
  render(Harness, {
    onReady: (ready: AgentDownloadModel) => {
      model = ready;
    },
  });
  await waitFor(() => expect(model.state.isLoading).toBe(false));
  return model;
}
describe('useAgentDownloadModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(agentDownloadApi.lts).mockResolvedValue({
      version: '1.2.3',
      publishedAt: '2026-10-16T12:00:00.000Z',
      sizeBytes: 123,
    });
    vi.mocked(agentDownloadApi.download).mockResolvedValue({
      version: '1.2.3',
      url: 'https://storage.example.test/signed',
    });
    vi.mocked(agentDownloadApi.releases).mockResolvedValue([
      { version: '1.2.3', publishedAt: '2026-10-16T12:00:00.000Z', sizeBytes: 123, isLts: true },
      { version: '1.0.2', publishedAt: '2026-09-16T12:00:00.000Z', sizeBytes: 100, isLts: false },
    ]);
    vi.mocked(agentDownloadApi.downloadVersion).mockResolvedValue({
      version: '1.0.2',
      url: 'https://storage.example.test/older',
    });
  });
  // feliz
  it('requests a fresh signed link for each click and the displayed version', async () => {
    const model = await mount();
    model.actions.onDownload('msi');
    await waitFor(() => expect(triggerUrlDownload).toHaveBeenCalledOnce());
    expect(agentDownloadApi.download).toHaveBeenCalledWith('msi', '1.2.3');
    model.actions.onDownload('msi');
    await waitFor(() => expect(agentDownloadApi.download).toHaveBeenCalledTimes(2));
  });
  // triste
  it('does not request files without an LTS', async () => {
    vi.mocked(agentDownloadApi.lts).mockResolvedValue(null);
    const model = await mount();
    model.actions.onDownload('msi');
    expect(agentDownloadApi.download).not.toHaveBeenCalled();
  });
  it('surfaces a download rejection and releases the controls', async () => {
    vi.mocked(agentDownloadApi.download).mockRejectedValue(new ApiError(409, 'A versão mudou.'));
    const model = await mount();
    model.actions.onDownload('certificate');
    await waitFor(() => expect(model.state.downloadError).toBe('A versão mudou.'));
    expect(model.state.downloading).toBeNull();
    expect(triggerUrlDownload).not.toHaveBeenCalled();
    model.actions.onRetry();
    expect(model.state.downloadError).toBeNull();
  });
  it('surfaces storage failures instead of an empty release', async () => {
    vi.mocked(agentDownloadApi.lts).mockRejectedValue(new ApiError(503, 'Storage indisponível.'));
    const model = await mount();
    expect(model.state.error).toBe('Storage indisponível.');
  });
  it('triggers installer script download with current origin', async () => {
    const model = await mount();
    model.actions.onDownloadInstallerScript();
    expect(downloadAgentInstallerScript).toHaveBeenCalledOnce();
  });

  it('downloads an older published version through a fresh signed link', async () => {
    const model = await mount();
    model.actions.onDownloadVersion('1.0.2', 'msi');
    await waitFor(() => expect(triggerUrlDownload).toHaveBeenCalledWith('https://storage.example.test/older'));
    expect(agentDownloadApi.downloadVersion).toHaveBeenCalledWith('msi', '1.0.2');
    expect(model.state.downloadingVersion).toBeNull();
  });
});
