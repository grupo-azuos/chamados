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

describe('a rota infra/tickets/detalhe', () => {
  // feliz
  it('monta a tela e dá título à aba', async () => {
    visiting({ id: '7' });

    const { container } = renderPage(Page as never);

    expect(container).toBeTruthy();
    await vi.waitFor(() => expect(document.title).toContain('Chamado'), { timeout: 4_000 });
  });

  // triste
  it('mostra o que o servidor respondeu quando a API está fora', async () => {
    visiting({ id: '7' });

    renderPage(Page as never);

    await expectOutageShown();
  });
});

const { apiRequest } = await import('$lib/api/http-client');
const { screen, waitFor } = await import('@testing-library/svelte');
const { default: userEvent } = await import('@testing-library/user-event');
const { goto } = await import('$app/navigation');

const ticket = {
  id: 22,
  protocol: 'CH-0022',
  status: 'in_progress',
  priority: 'high',
  requesterName: 'Ana Souza',
  area: 'infra',
  department: 'contabil',
  problemType: 'network',
  participantAreas: [],
  computerId: null,
  computerName: null,
  anydeskId: null,
  contactPhone: '62999990022',
  notifyWhatsapp: true,
  description: 'A internet caiu na minha sala.',
  screenshotUrl: null,
  assignee: 'Suporte TI',
  solution: null,
  createdAt: '2026-09-23T12:00:00.000Z',
  startedAt: '2026-09-23T12:30:00.000Z',
  resolvedAt: null,
  updatedAt: null,
  updatedBy: null,
};

/** A API respondendo de verdade: o chamado existe e as listas estão vazias. */
function serveTicket() {
  vi.mocked(apiRequest).mockImplementation(async (path: string) => {
    if (path === '/tickets/22') return ticket;
    if (path === '/computers' || path === '/tickets') return { items: [], total: 0, page: 1, pageSize: 25 };
    return [];
  });
}

describe('a rota infra/tickets/detalhe com o chamado carregado', () => {
  // feliz
  it('mostra a ficha, dá o protocolo à aba e volta à fila', async () => {
    serveTicket();
    visiting({ id: '22' });
    renderPage(Page as never);

    await screen.findByText(/A internet caiu na minha sala/);
    await vi.waitFor(() => expect(document.title).toContain('Chamado CH-0022'));
    await userEvent.click(screen.getByRole('button', { name: /Voltar para os chamados/ }));
    expect(goto).toHaveBeenCalledWith('/infra/tickets');
  });

  // triste
  it('explica quando o chamado não existe e oferece a volta', async () => {
    const { ApiError } = await import('$lib/api/http-client');
    vi.mocked(apiRequest).mockImplementation(async (path: string) => {
      if (path === '/tickets/22') throw new ApiError(404, 'Chamado não encontrado.');
      return [];
    });
    vi.mocked(goto).mockClear();
    visiting({ id: '22' });
    renderPage(Page as never);

    expect(await screen.findByText('Não encontrei este chamado')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Voltar para os chamados/ }));
    await waitFor(() => expect(goto).toHaveBeenCalledWith('/infra/tickets'));
  });
});
