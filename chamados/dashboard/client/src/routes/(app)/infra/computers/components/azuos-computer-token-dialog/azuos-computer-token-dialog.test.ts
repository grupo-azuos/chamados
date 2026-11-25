import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ComputerTokenDialog from './azuos-computer-token-dialog.svelte';

const TOKEN = 'agt_3f9a6c1e8b4d47a2b0c5e7f1a9d2b6c4';
const COMMAND = `.\\install-agent.ps1 -Token '${TOKEN}'`;
const data = { computerName: 'RECEPCAO-01', token: TOKEN };

/* A área de transferência é trocada por um dublê em cada teste: o jsdom não tem uma de verdade. */
function stubClipboard(writeText: ReturnType<typeof vi.fn>): void {
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('AzuosComputerTokenDialog — what it shows', () => {
  // feliz
  it('shows the token and the PowerShell command in full, so they can be copied by hand', () => {
    render(ComputerTokenDialog, { props: { data, actions: { onClose: vi.fn() } } });

    expect(screen.getByTestId('agent-token')).toHaveTextContent(TOKEN);
    expect(screen.getByTestId('agent-command')).toHaveTextContent(COMMAND);
  });

  /* O texto precisa dizer que não dá para ver de novo: sem isso a pessoa fecha a janela
     achando que o código fica guardado em algum lugar. */
  // feliz
  it('warns that the code cannot be shown again', () => {
    render(ComputerTokenDialog, { props: { data, actions: { onClose: vi.fn() } } });

    expect(screen.getByText(/não pode ser mostrado de novo/)).toBeInTheDocument();
  });

  // feliz
  it('offers the three ways out: copy the code, copy the command and download the installer', () => {
    render(ComputerTokenDialog, {
      props: { data, actions: { onClose: vi.fn(), onDownloadBundle: vi.fn() } },
    });

    expect(screen.getByRole('button', { name: 'Copiar código' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar comando' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Baixar instalador (.zip)' })).toBeInTheDocument();
    expect(screen.getByText('instalar.cmd')).toBeInTheDocument();
  });

  // triste
  it('hides the installer button and its hint when the screen cannot build one', () => {
    render(ComputerTokenDialog, { props: { data, actions: { onClose: vi.fn() } } });

    expect(screen.queryByRole('button', { name: /instalador/ })).not.toBeInTheDocument();
    expect(screen.queryByText('instalar.cmd')).not.toBeInTheDocument();
  });
});

describe('AzuosComputerTokenDialog — copying', () => {
  // feliz
  it('copies the code and says "Copiado!" on that button only', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    render(ComputerTokenDialog, { props: { data, actions: { onClose: vi.fn() } } });

    await userEvent.click(screen.getByRole('button', { name: 'Copiar código' }));

    expect(writeText).toHaveBeenCalledWith(TOKEN);
    expect(await screen.findByRole('button', { name: 'Copiado!' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar comando' })).toBeInTheDocument();
  });

  // feliz
  it('copies the PowerShell command and says "Copiado!"', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    render(ComputerTokenDialog, { props: { data, actions: { onClose: vi.fn() } } });

    await userEvent.click(screen.getByRole('button', { name: 'Copiar comando' }));

    expect(writeText).toHaveBeenCalledWith(COMMAND);
    expect(await screen.findByRole('button', { name: 'Copiado!' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar código' })).toBeInTheDocument();
  });

  // feliz
  it('goes back to the usual label a moment after copying', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    stubClipboard(vi.fn().mockResolvedValue(undefined));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(ComputerTokenDialog, { props: { data, actions: { onClose: vi.fn() } } });

    await user.click(screen.getByRole('button', { name: 'Copiar código' }));
    expect(await screen.findByRole('button', { name: 'Copiado!' })).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(2500);

    expect(screen.getByRole('button', { name: 'Copiar código' })).toBeInTheDocument();
  });

  // triste
  /* Navegador sem área de transferência não pode quebrar a tela: o token continua escrito
     na frente da pessoa, que copia à mão. */
  it('survives a browser that refuses to copy, without claiming it copied', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('denied')));
    render(ComputerTokenDialog, { props: { data, actions: { onClose: vi.fn() } } });

    await userEvent.click(screen.getByRole('button', { name: 'Copiar código' }));
    await userEvent.click(screen.getByRole('button', { name: 'Copiar comando' }));

    expect(screen.getByTestId('agent-token')).toHaveTextContent(TOKEN);
    expect(screen.queryByRole('button', { name: 'Copiado!' })).not.toBeInTheDocument();
  });
});

describe('AzuosComputerTokenDialog — installer and closing', () => {
  // feliz
  it('asks for the installer with this token when the zip button is clicked', async () => {
    const onDownloadBundle = vi.fn();
    render(ComputerTokenDialog, {
      props: { data, actions: { onClose: vi.fn(), onDownloadBundle } },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Baixar instalador (.zip)' }));

    expect(onDownloadBundle).toHaveBeenCalledOnce();
  });

  // feliz
  it('locks the zip button while the installer is being built', () => {
    render(ComputerTokenDialog, {
      props: {
        data,
        state: { isDownloadingBundle: true },
        actions: { onClose: vi.fn(), onDownloadBundle: vi.fn() },
      },
    });

    expect(screen.getByRole('button', { name: /Montando o instalador/ })).toBeDisabled();
  });

  // triste
  it('shows why the installer failed, keeping the token on screen', () => {
    render(ComputerTokenDialog, {
      props: {
        data,
        state: { bundleError: 'Este token não é desta máquina.' },
        actions: { onClose: vi.fn(), onDownloadBundle: vi.fn() },
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Este token não é desta máquina.');
    expect(screen.getByTestId('agent-token')).toHaveTextContent(TOKEN);
  });

  // feliz
  it('closes when the person says they have kept it', async () => {
    const onClose = vi.fn();
    render(ComputerTokenDialog, { props: { data, actions: { onClose } } });

    await userEvent.click(screen.getByRole('button', { name: 'Já guardei' }));

    expect(onClose).toHaveBeenCalled();
  });

  // triste
  it('closes with Escape as if the person had kept the token', async () => {
    const onClose = vi.fn();
    render(ComputerTokenDialog, { props: { data, actions: { onClose } } });

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });
});
