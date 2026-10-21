import {
  agentLtsSchema,
  agentFileLinkSchema,
  agentReleaseItemSchema,
  type AgentBundleRequest,
  type AgentDownloadKind,
} from '@template/shared/schemas/agent-release.schema';
import { apiDownload, apiRequest, type Downloaded } from './http-client';

export const agentDownloadApi = {
  lts: async () => {
    const result = await apiRequest<unknown>('/agent/downloads/lts');
    if (result === undefined) return null;
    return agentLtsSchema.parse(result);
  },
  download: async (kind: AgentDownloadKind, version: string) =>
    agentFileLinkSchema.parse(
      await apiRequest<unknown>(`/agent/downloads/lts/${kind}`, { query: { version } }),
    ),
  releases: async () =>
    agentReleaseItemSchema.array().parse(await apiRequest<unknown>('/agent/downloads/releases')),
  downloadVersion: async (kind: AgentDownloadKind, version: string) =>
    agentFileLinkSchema.parse(
      await apiRequest<unknown>(
        `/agent/downloads/releases/${encodeURIComponent(version)}/${kind}`,
      ),
    ),
  /** O zip com MSI, certificado e scripts; POST porque o token, quando vem, vai no corpo. */
  bundle: (request: AgentBundleRequest): Promise<Downloaded> =>
    apiDownload('/agent/downloads/bundle', { method: 'POST', body: request }),
};
