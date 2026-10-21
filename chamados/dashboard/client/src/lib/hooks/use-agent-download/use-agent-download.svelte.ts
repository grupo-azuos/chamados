import { triggerUrlDownload } from '$lib/utils/download-file.util';
import { createQuery } from '@tanstack/svelte-query';
import {
  type AgentDownloadKind,
  type AgentLts,
  type AgentReleaseItem,
} from '@template/shared/schemas/agent-release.schema';
import { agentDownloadApi } from '$lib/api/agent-download.api';
import { readError } from '$lib/api/http-client';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { downloadAgentInstallerScript } from '$lib/utils/agent-installer-script.util';
import { useAgentBundleModel } from '$lib/hooks/use-agent-bundle/use-agent-bundle.svelte';

export type AgentDownloadModel = {
  data: { release: AgentLts | null; releases: AgentReleaseItem[] };
  state: {
    isLoading: boolean;
    error: string | null;
    downloadError: string | null;
    downloading: AgentDownloadKind | null;
    isLoadingReleases: boolean;
    releasesError: string | null;
    downloadingVersion: { version: string; kind: AgentDownloadKind } | null;
    isDownloadingBundle: boolean;
    bundleError: string | null;
  };
  actions: {
    onRetry: () => void;
    onDownload: (kind: AgentDownloadKind) => void;
    onDownloadVersion: (version: string, kind: AgentDownloadKind) => void;
    onDownloadInstallerScript: () => void;
    onDownloadBundle: () => void;
  };
};

/** Cada clique pede um link novo: uma aba aberta por horas não guarda URL vencida. */
export function useAgentDownloadModel(): AgentDownloadModel {
  const release = mirrorStore(
    createQuery({ queryKey: ['agent-lts'], queryFn: agentDownloadApi.lts, staleTime: 30_000 }),
  );
  const releases = mirrorStore(
    createQuery({ queryKey: ['agent-releases'], queryFn: agentDownloadApi.releases, staleTime: 30_000 }),
  );
  const bundle = useAgentBundleModel();
  let downloading = $state<AgentDownloadKind | null>(null);
  let downloadingVersion = $state<{ version: string; kind: AgentDownloadKind } | null>(null);
  let downloadError = $state<string | null>(null);

  async function download(kind: AgentDownloadKind): Promise<void> {
    const version = release.current.data?.version;
    if (!version || downloading || downloadingVersion) return;
    downloading = kind;
    downloadError = null;
    try {
      const file = await agentDownloadApi.download(kind, version);
      // Navegar para o link de attachment baixa direto do bucket, sem pôr o MSI na memória da API.
      triggerUrlDownload(file.url);
    } catch (error) {
      downloadError = readError(error);
    } finally {
      downloading = null;
    }
  }

  async function downloadVersion(version: string, kind: AgentDownloadKind): Promise<void> {
    if (downloading || downloadingVersion) return;
    downloadingVersion = { version, kind };
    downloadError = null;
    try {
      const file = await agentDownloadApi.downloadVersion(kind, version);
      triggerUrlDownload(file.url);
    } catch (error) {
      downloadError = readError(error);
    } finally {
      downloadingVersion = null;
    }
  }

  return {
    get data() {
      return { release: release.current.data ?? null, releases: releases.current.data ?? [] };
    },
    get state() {
      return {
        isLoading: release.current.isPending,
        error: readError(release.current.error),
        downloadError,
        downloading,
        isLoadingReleases: releases.current.isPending,
        releasesError: readError(releases.current.error),
        downloadingVersion,
        isDownloadingBundle: bundle.state.isDownloading,
        bundleError: bundle.state.error,
      };
    },
    actions: {
      onRetry: () => {
        downloadError = null;
        void release.current.refetch();
        void releases.current.refetch();
      },
      onDownload: (kind) => void download(kind),
      onDownloadVersion: (version, kind) => void downloadVersion(version, kind),
      onDownloadInstallerScript: () => {
        const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
        downloadAgentInstallerScript({ serverUrl: origin });
      },
      /* Sem máquina: o script do pacote pergunta o token na hora de instalar. */
      onDownloadBundle: () => bundle.actions.onDownload(),
    },
  };
}
