import { triggerUrlDownload } from '$lib/utils/download-file.util';
import { createQuery } from '@tanstack/svelte-query';
import {
  type AgentDownloadKind,
  type AgentLts,
} from '@template/shared/schemas/agent-release.schema';
import { agentDownloadApi } from '$lib/api/agent-download.api';
import { readError } from '$lib/api/http-client';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { downloadAgentInstallerScript } from '$lib/utils/agent-installer-script.util';

export type AgentDownloadModel = {
  data: { release: AgentLts | null };
  state: {
    isLoading: boolean;
    error: string | null;
    downloadError: string | null;
    downloading: AgentDownloadKind | null;
  };
  actions: {
    onRetry: () => void;
    onDownload: (kind: AgentDownloadKind) => void;
    onDownloadInstallerScript: () => void;
  };
};

/** Cada clique pede um link novo: uma aba aberta por horas não guarda URL vencida. */
export function useAgentDownloadModel(): AgentDownloadModel {
  const release = mirrorStore(
    createQuery({ queryKey: ['agent-lts'], queryFn: agentDownloadApi.lts, staleTime: 30_000 }),
  );
  let downloading = $state<AgentDownloadKind | null>(null);
  let downloadError = $state<string | null>(null);

  async function download(kind: AgentDownloadKind): Promise<void> {
    const version = release.current.data?.version;
    if (!version || downloading) return;
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

  return {
    get data() {
      return { release: release.current.data ?? null };
    },
    get state() {
      return {
        isLoading: release.current.isPending,
        error: readError(release.current.error),
        downloadError,
        downloading,
      };
    },
    actions: {
      onRetry: () => {
        downloadError = null;
        void release.current.refetch();
      },
      onDownload: (kind) => void download(kind),
      onDownloadInstallerScript: () => {
        const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
        downloadAgentInstallerScript({ serverUrl: origin });
      },
    },
  };
}
