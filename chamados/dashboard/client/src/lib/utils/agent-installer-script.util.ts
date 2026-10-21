import { generateAgentInstallerScript } from '@template/shared/domain/agent-installer-script.util';

import { triggerBrowserDownload } from './download-file.util';

export type AgentInstallerScriptOptions = {
  serverUrl?: string;
  token?: string;
  fileName?: string;
};

/**
 * Baixa o script `install-agent.ps1` pronto para execução no computador Windows.
 */
export function downloadAgentInstallerScript(options: AgentInstallerScriptOptions = {}): void {
  const { serverUrl, token, fileName = 'install-agent.ps1' } = options;
  const content = generateAgentInstallerScript({ serverUrl, token });
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  triggerBrowserDownload(blob, fileName);
}
