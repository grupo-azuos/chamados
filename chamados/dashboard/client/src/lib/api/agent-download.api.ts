import {
  agentLtsSchema,
  agentFileLinkSchema,
  type AgentDownloadKind,
} from '@template/shared/schemas/agent-release.schema';
import { apiRequest } from './http-client';

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
};
