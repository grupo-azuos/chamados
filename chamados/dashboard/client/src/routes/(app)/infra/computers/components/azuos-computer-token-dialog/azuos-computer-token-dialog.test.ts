import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ComputerTokenDialog from './azuos-computer-token-dialog.svelte';

const TOKEN = 'agt_3f9a6c1e8b4d47a2b0c5e7f1a9d2b6c4';

describe('AzuosComputerTokenDialog', () => {
  // feliz
  it('shows the token in full, so it can be copied by hand', () => {
    render(ComputerTokenDialog, {
      props: {
        data: { computerName: 'RECEPCAO-01', token: TOKEN },
        actions: { onClose: vi.fn() },
      },
    });

    expect(screen.getByTestId('agent-token')).toHaveTextContent(TOKEN);
  });

  /* O texto precisa dizer que não dá para ver de novo: sem isso a pessoa fecha a janela
     achando que o código fica guardado em algum lugar. */
  it('warns that the code cannot be shown again', () => {
    render(ComputerTokenDialog, {
      props: {
        data: { computerName: 'RECEPCAO-01', token: TOKEN },
        actions: { onClose: vi.fn() },
      },
    });

    expect(screen.getByText(/não pode ser mostrado de novo/)).toBeInTheDocument();
  });

  it('closes when the person says they have kept it', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(ComputerTokenDialog, {
      props: { data: { computerName: 'RECEPCAO-01', token: TOKEN }, actions: { onClose } },
    });

    await user.click(screen.getByRole('button', { name: 'Já guardei' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('copies the quick PowerShell command to clipboard', async () => {
    const user = userEvent.setup();
    const writeSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

    render(ComputerTokenDialog, {
      props: {
        data: { computerName: 'RECEPCAO-01', token: TOKEN },
        actions: { onClose: vi.fn() },
      },
    });

    expect(screen.getByText(`.\\install-agent.ps1 -Token '${TOKEN}'`)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Copiar comando' }));

    expect(writeSpy).toHaveBeenCalledWith(`.\\install-agent.ps1 -Token '${TOKEN}'`);
    writeSpy.mockRestore();
  });

  it('asks for the install package with this token when the zip button is clicked', async () => {
    const onDownloadBundle = vi.fn();
    const user = userEvent.setup();

    render(ComputerTokenDialog, {
      props: {
        data: { computerName: 'RECEPCAO-01', token: TOKEN },
        actions: { onClose: vi.fn(), onDownloadBundle },
      },
    });

    await user.click(screen.getByRole('button', { name: 'Baixar pacote de instalação (.zip)' }));
    expect(onDownloadBundle).toHaveBeenCalledOnce();
  });

  // triste
  it('shows why the package failed, keeping the token on screen', () => {
    render(ComputerTokenDialog, {
      props: {
        data: { computerName: 'RECEPCAO-01', token: TOKEN },
        state: { bundleError: 'Este token não é desta máquina.' },
        actions: { onClose: vi.fn(), onDownloadBundle: vi.fn() },
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Este token não é desta máquina.');
    expect(screen.getByTestId('agent-token')).toHaveTextContent(TOKEN);
  });

  // triste
  it('hides the package button when the screen cannot build one', () => {
    render(ComputerTokenDialog, {
      props: { data: { computerName: 'RECEPCAO-01', token: TOKEN }, actions: { onClose: vi.fn() } },
    });

    expect(screen.queryByRole('button', { name: /pacote de instalação/ })).not.toBeInTheDocument();
  });

  // triste
  /* Navegador sem área de transferência não pode quebrar a tela: o token continua escrito
     na frente da pessoa, que copia à mão. */
  it('survives a browser that refuses to copy', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));

    render(ComputerTokenDialog, {
      props: {
        data: { computerName: 'RECEPCAO-01', token: TOKEN },
        actions: { onClose: vi.fn() },
      },
    });

    await user.click(screen.getByRole('button', { name: 'Copiar código' }));

    expect(screen.getByTestId('agent-token')).toHaveTextContent(TOKEN);
    expect(screen.queryByRole('button', { name: 'Copiado' })).not.toBeInTheDocument();
  });
});
