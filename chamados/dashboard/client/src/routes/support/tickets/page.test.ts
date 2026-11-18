import { describe, expect, it, vi } from 'vitest';

import Page from './+page.svelte';
import { expectOutageShown, renderPage, visiting } from '../../route-page.test-support';

/* Só o `apiRequest` é fingido: `ApiError` e `readError` continuam reais. */
vi.mock('$lib/api/http-client', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  const ApiError = original.ApiError as new (status: number, message: string) => Error;
  const outage = () => Promise.reject(new ApiError(503, 'Serviço fora do ar.'));

  return { ...original, apiRequest: vi.fn(outage), apiDownload: vi.fn(outage), uploadFile: vi.fn(outage) };
});

describe('a rota support/tickets', () => {
  // feliz
  it('monta a tela e dá título à aba', async () => {
    visiting({});

    const { container } = renderPage(Page as never);

    expect(container).toBeTruthy();
    await vi.waitFor(() => expect(document.title).toContain('Consultar chamado'), { timeout: 4_000 });
  });

  // triste
  it('mostra o que o servidor respondeu quando a API está fora', async () => {
    visiting({});

    renderPage(Page as never);

    await expectOutageShown();
  });
});

const { apiRequest } = await import('$lib/api/http-client');
const { screen } = await import('@testing-library/svelte');

const { page } = await import('$app/state');

const publicTicket = {
  id: 7,
  protocol: 'CH-0007',
  status: 'waiting_requester',
  priority: 'high',
  requesterName: 'Bia Costa',
  area: 'infra',
  department: 'financeiro',
  problemType: 'printer',
  anydeskId: null,
  description: 'A impressora não puxa papel.',
  screenshotUrl: null,
  attachments: [],
  histories: [],
  watchers: [],
  notifiable: [],
  canReply: true,
  createdAt: '2026-09-15T12:10:00.000Z',
};

describe('a rota support/tickets com o link de acesso', () => {
  // feliz
  it('abre o chamado do link e oferece a resposta', async () => {
    vi.mocked(apiRequest).mockImplementation(async (path: string) => {
      if (path.startsWith('/tickets/access/')) return publicTicket;
      if (path === '/tickets/mine') return [];
      return [];
    });
    page.url = new URL('http://localhost:5173/support/tickets?ticket=abc.123');
    try {
      visiting({});
      renderPage(Page as never);

      expect(await screen.findByText('CH-0007')).toBeInTheDocument();
      expect(await screen.findByRole('textbox', { name: /Mensagem|Por que reabrir/ })).toBeInTheDocument();
      expect(apiRequest).toHaveBeenCalledWith('/tickets/access/abc.123');
    } finally {
      page.url = new URL('http://localhost:5173/');
    }
  });
});
