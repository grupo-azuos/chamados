import { describe, expect, it, vi } from 'vitest';

import * as downloadModule from './download-file.util';
import { downloadAgentInstallerScript } from './agent-installer-script.util';

describe('agent-installer-script.util', () => {
  describe('downloadAgentInstallerScript', () => {
    // feliz
    it('creates a blob and triggers browser download with the default filename', () => {
      const spy = vi.spyOn(downloadModule, 'triggerBrowserDownload').mockImplementation(() => {});

      downloadAgentInstallerScript({
        serverUrl: 'https://chamados.empresa.com',
        token: 'token-abc',
      });

      expect(spy).toHaveBeenCalledOnce();
      expect(spy.mock.calls[0]?.[1]).toBe('install-agent.ps1');
      expect(spy.mock.calls[0]?.[0]).toBeInstanceOf(Blob);

      spy.mockRestore();
    });

    // feliz
    it('respects a custom filename when provided', () => {
      const spy = vi.spyOn(downloadModule, 'triggerBrowserDownload').mockImplementation(() => {});

      downloadAgentInstallerScript({
        serverUrl: 'https://chamados.empresa.com',
        token: 'token-abc',
        fileName: 'instalar-recepcao-01.ps1',
      });

      expect(spy).toHaveBeenCalledOnce();
      expect(spy.mock.calls[0]?.[1]).toBe('instalar-recepcao-01.ps1');

      spy.mockRestore();
    });
  });
});
