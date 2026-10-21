import { agentDownloadApi } from '$lib/api/agent-download.api';
import { readError } from '$lib/api/http-client';
import { triggerBrowserDownload } from '$lib/utils/download-file.util';

/** A máquina cujo token vai dentro do pacote. Sem ela, o script do pacote pergunta o token. */
export type AgentBundleTarget = { token: string; computerId: number };

export type AgentBundleModel = {
  state: { isDownloading: boolean; error: string | null };
  actions: { onDownload: (target?: AgentBundleTarget) => void };
};

/**
 * Baixa o pacote de instalação do agente (.zip) da versão LTS.
 *
 * A versão é consultada no clique, e não guardada: uma aba aberta desde ontem não pode montar
 * o pacote de uma versão que já deixou de ser a LTS. O endereço do sistema vai junto porque é
 * por ele que o agente instalado encontra este servidor.
 */
export function useAgentBundleModel(): AgentBundleModel {
  let isDownloading = $state(false);
  let error = $state<string | null>(null);

  async function download(target?: AgentBundleTarget): Promise<void> {
    if (isDownloading) return;
    isDownloading = true;
    error = null;
    try {
      const release = await agentDownloadApi.lts();
      if (!release) {
        error = 'Nenhuma versão LTS do agente foi publicada ainda.';
        return;
      }
      const file = await agentDownloadApi.bundle({
        version: release.version,
        serverUrl: window.location.origin,
        ...target,
      });
      triggerBrowserDownload(file.blob, file.fileName);
    } catch (failure) {
      error = readError(failure);
    } finally {
      isDownloading = false;
    }
  }

  return {
    get state() {
      return { isDownloading, error };
    },
    actions: { onDownload: (target) => void download(target) },
  };
}
