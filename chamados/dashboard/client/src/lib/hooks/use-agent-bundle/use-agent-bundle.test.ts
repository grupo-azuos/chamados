import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('$lib/api/agent-download.api', () => ({
  agentDownloadApi: { lts: vi.fn(), bundle: vi.fn() },
}));
vi.mock('$lib/utils/download-file.util', () => ({ triggerBrowserDownload: vi.fn() }));
import { ApiError } from '$lib/api/http-client';
import { agentDownloadApi } from '$lib/api/agent-download.api';
import { triggerBrowserDownload } from '$lib/utils/download-file.util';
import { type AgentBundleModel } from './use-agent-bundle.svelte';
import Harness from './use-agent-bundle-harness.test.svelte';

function mount(): AgentBundleModel {
  let model!: AgentBundleModel;
  render(Harness, {
    onReady: (ready: AgentBundleModel) => {
      model = ready;
    },
  });
  return model;
}

const zip = { blob: new Blob(['PK']), fileName: 'azuos-agent-1.2.3-recepcao-01.zip' };

describe('useAgentBundleModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(agentDownloadApi.lts).mockResolvedValue({
      version: '1.2.3',
      publishedAt: '2026-10-16T12:00:00.000Z',
      sizeBytes: 123,
    });
    vi.mocked(agentDownloadApi.bundle).mockResolvedValue(zip);
  });

  // feliz
  it('asks for the LTS package with the machine token and saves the zip', async () => {
    const model = mount();

    model.actions.onDownload({ token: 'agt_x', computerId: 7 });

    await waitFor(() => expect(triggerBrowserDownload).toHaveBeenCalledWith(zip.blob, zip.fileName));
    expect(agentDownloadApi.bundle).toHaveBeenCalledWith({
      version: '1.2.3',
      serverUrl: window.location.origin,
      token: 'agt_x',
      computerId: 7,
    });
    expect(model.state.isDownloading).toBe(false);
  });

  // triste
  it('explains when no LTS version exists yet, without asking for a package', async () => {
    vi.mocked(agentDownloadApi.lts).mockResolvedValue(null);
    const model = mount();

    model.actions.onDownload();

    await waitFor(() =>
      expect(model.state.error).toBe('Nenhuma versão LTS do agente foi publicada ainda.'),
    );
    expect(agentDownloadApi.bundle).not.toHaveBeenCalled();
  });

  // triste
  it('shows the server reason when the package is refused', async () => {
    vi.mocked(agentDownloadApi.bundle).mockRejectedValue(
      new ApiError(403, 'Este token não é desta máquina.'),
    );
    const model = mount();

    model.actions.onDownload({ token: 'agt_x', computerId: 7 });

    await waitFor(() => expect(model.state.error).toBe('Este token não é desta máquina.'));
    expect(triggerBrowserDownload).not.toHaveBeenCalled();
  });
});
