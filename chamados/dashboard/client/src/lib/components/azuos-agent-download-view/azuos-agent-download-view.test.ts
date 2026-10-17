import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import AgentDownloadView from './azuos-agent-download-view.svelte';
const data = {
  release: { version: '1.2.3', publishedAt: '2026-10-16T12:00:00.000Z', sizeBytes: 45_000_000 },
};
const state = { isLoading: false, error: null, downloadError: null, downloading: null };
const actions = () => ({
  onRetry: vi.fn(),
  onDownload: vi.fn(),
  onDownloadInstallerScript: vi.fn(),
});

describe('AzuosAgentDownloadView', () => {
  // feliz
  it('shows the LTS and requests each installation artifact separately', async () => {
    const callbacks = actions();
    render(AgentDownloadView, { data, state, actions: callbacks });
    expect(screen.getByText('Azuos Agent 1.2.3')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Baixar instalador' }));
    await fireEvent.click(
      screen.getByRole('button', { name: 'Baixar script de instalação (install-agent.ps1)' }),
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Baixar certificado' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Baixar script do certificado' }));
    expect(callbacks.onDownloadInstallerScript).toHaveBeenCalledOnce();
    expect(callbacks.onDownload.mock.calls).toEqual([
      ['msi'],
      ['certificate'],
      ['certificateScript'],
    ]);
  });
  // triste
  it('offers no download when no LTS has been promoted', () => {
    render(AgentDownloadView, { data: { release: null }, state, actions: actions() });
    expect(screen.getByText('Nenhuma versão LTS disponível')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Baixar instalador' })).not.toBeInTheDocument();
  });
  it('announces storage errors and allows retry', async () => {
    const callbacks = actions();
    render(AgentDownloadView, {
      data: { release: null },
      state: { ...state, error: 'Não consegui consultar a versão.' },
      actions: callbacks,
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Não consegui consultar a versão.');
    await fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(callbacks.onRetry).toHaveBeenCalledOnce();
  });
  it('disables other files while preparing one download', () => {
    render(AgentDownloadView, {
      data,
      state: { ...state, downloading: 'msi' },
      actions: actions(),
    });
    expect(screen.getByRole('button', { name: 'Baixar certificado' })).toBeDisabled();
  });
});
