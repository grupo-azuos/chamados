import { describe, expect, it, vi } from 'vitest';

import Page from './+page.svelte';
import { expectOutageShown, renderPage, visiting } from '../../../../route-page.test-support';

/* Só o `apiRequest` é fingido: `ApiError` e `readError` continuam reais. */
vi.mock('$lib/api/http-client', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  const ApiError = original.ApiError as new (status: number, message: string) => Error;
  const outage = () => Promise.reject(new ApiError(503, 'Serviço fora do ar.'));

  return { ...original, apiRequest: vi.fn(outage), apiDownload: vi.fn(outage), uploadFile: vi.fn(outage) };
});

describe('a rota infra/computers/detalhe', () => {
  // feliz
  it('monta a tela e dá título à aba', async () => {
    visiting({ id: '3' });

    const { container } = renderPage(Page as never);

    expect(container).toBeTruthy();
    await vi.waitFor(() => expect(document.title).toContain('Computador'), { timeout: 4_000 });
  });

  // triste
  it('mostra o que o servidor respondeu quando a API está fora', async () => {
    visiting({ id: '3' });

    renderPage(Page as never);

    await expectOutageShown();
  });
});

const { apiRequest } = await import('$lib/api/http-client');
const { screen, waitFor, within } = await import('@testing-library/svelte');
const { default: userEvent } = await import('@testing-library/user-event');
const { goto } = await import('$app/navigation');

const GB = 1024 ** 3;
const machine = {
  id: 3,
  name: 'CONTABIL-03',
  displayName: 'Contábil — mesa do fechamento',
  responsibleName: 'Daniela Prado',
  department: 'contabil',
  kind: 'desktop',
  hardware: {
    os: 'Microsoft Windows 11 Pro',
    platform: 'windows',
    platformVersion: '10.0.26100',
    kernelVersion: '10.0.26100',
    arch: 'amd64',
    cpuModel: 'AMD Ryzen 5 5600G',
    logicalCpus: 12,
    physicalCpus: 6,
    totalMemoryBytes: 8 * GB,
    macAddress: '00:00:5E:00:53:03',
    localIp: '198.51.100.13',
    totalDiskBytes: 500 * GB,
    freeDiskBytes: 14 * GB,
    uptimeSeconds: 3600,
    bootTime: '2026-09-23T09:00:00.000Z',
  },
  healthScore: 100,
  healthStatus: 'good',
  warnings: [],
  isOnline: true,
  lastSeenAt: '2026-09-23T11:59:00.000Z',
  agentVersion: '1.0.0',
  isArchived: false,
  isBlocked: false,
  blockReason: null,
  disposedAt: null,
  disposalType: null,
  disposalReason: null,
  createdAt: '2026-05-01T12:00:00.000Z',
  createdBy: 'suporte@azuos.local',
  updatedAt: null,
  updatedBy: null,
};

const PAGED = ['/computers', '/computers/3/alerts', '/maintenances', '/parts/movements', '/tickets'];

/** A API respondendo de verdade: a máquina existe e todas as listas estão vazias. */
function serveMachine() {
  vi.mocked(apiRequest).mockImplementation(async (path: string, options?: { method?: string }) => {
    if (path === '/computers/3/token' && options?.method === 'POST') return { computer: machine, token: 'agt_novo' };
    if (path === '/computers/3') return machine;
    if (path === '/computers/3/live') return { live: null };
    if (path === '/departments') return { rh: ['Contábil'], local: [], isRhAvailable: true };
    if (PAGED.includes(path)) return { items: [], total: 0, page: 1, pageSize: 25 };
    return [];
  });
}

describe('a rota infra/computers/detalhe com a máquina carregada', () => {
  // feliz
  it('abre cada formulário da ficha e volta ao inventário', async () => {
    serveMachine();
    visiting({ id: '3' });
    renderPage(Page as never);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    await screen.findByRole('heading', { name: 'Contábil — mesa do fechamento' });
    await vi.waitFor(() => expect(document.title).toContain('Contábil — mesa do fechamento'));

    const openAndClose = async (button: string, title: string) => {
      await user.click(screen.getByRole('button', { name: button }));
      expect(await screen.findByRole('dialog')).toHaveTextContent(title);
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Fechar diálogo' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    };
    await openAndClose('Editar identificação', 'Identificação da máquina');
    await openAndClose('Transferir', 'Transferir de departamento');
    await openAndClose('Agendar manutenção', 'Agendar manutenção');
    await user.click(screen.getAllByRole('button', { name: 'Registrar manutenção' })[0]!);
    expect(await screen.findByRole('dialog')).toHaveTextContent('Registrar manutenção');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Fechar diálogo' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Voltar para o inventário/ }));
    expect(goto).toHaveBeenCalledWith('/infra/computers');
  });

  // feliz
  it('mostra o token novo uma vez e tenta montar o pacote de instalação', async () => {
    serveMachine();
    visiting({ id: '3' });
    renderPage(Page as never);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    await screen.findByRole('heading', { name: 'Contábil — mesa do fechamento' });
    await user.click(screen.getByRole('button', { name: 'Mais ações' }));
    await user.click(screen.getByRole('menuitem', { name: 'Gerar token novo' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Gerar token novo' }));
    expect(await screen.findByText('Token de CONTABIL-03')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Baixar pacote de instalação (.zip)' }));
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent(/Não consegui/));
    await user.click(screen.getByRole('button', { name: 'Já guardei' }));
    await waitFor(() => expect(screen.queryByText('Token de CONTABIL-03')).not.toBeInTheDocument());
  });

  // triste
  it('avisa quando o instalador não pôde ser montado', async () => {
    serveMachine();
    visiting({ id: '3' });
    renderPage(Page as never);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    await screen.findByRole('heading', { name: 'Contábil — mesa do fechamento' });
    await user.click(screen.getByRole('button', { name: 'Mais ações' }));
    await user.click(screen.getByRole('menuitem', { name: 'Baixar instalador (.zip)' }));
    expect(await screen.findByText('Não consegui montar o instalador')).toBeInTheDocument();
  });

  // triste
  it('explica quando a máquina saiu do inventário', async () => {
    const { ApiError } = await import('$lib/api/http-client');
    vi.mocked(apiRequest).mockImplementation(async (path: string) => {
      if (path === '/computers/3') throw new ApiError(404, 'Computador não encontrado.');
      if (PAGED.includes(path)) return { items: [], total: 0, page: 1, pageSize: 25 };
      return [];
    });
    visiting({ id: '3' });
    renderPage(Page as never);

    expect(await screen.findByText('Este computador não está mais no inventário')).toBeInTheDocument();
  });
});
