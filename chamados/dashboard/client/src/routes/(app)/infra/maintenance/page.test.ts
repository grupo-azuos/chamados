import { describe, expect, it, vi } from 'vitest';

import Page from './+page.svelte';
import { expectOutageShown, renderPage, visiting } from '../../../route-page.test-support';

/* Só o `apiRequest` é fingido: `ApiError` e `readError` continuam reais. */
vi.mock('$lib/api/http-client', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  const ApiError = original.ApiError as new (status: number, message: string) => Error;
  const outage = () => Promise.reject(new ApiError(503, 'Serviço fora do ar.'));

  return { ...original, apiRequest: vi.fn(outage), apiDownload: vi.fn(outage), uploadFile: vi.fn(outage) };
});

describe('a rota infra/maintenance', () => {
  // feliz
  it('monta a tela e dá título à aba', async () => {
    visiting({});

    const { container } = renderPage(Page as never);

    expect(container).toBeTruthy();
    await vi.waitFor(() => expect(document.title).toContain('Manutenção'), { timeout: 4_000 });
  });

  // triste
  it('mostra o que o servidor respondeu quando a API está fora', async () => {
    visiting({});

    renderPage(Page as never);

    await expectOutageShown();
  });
});

const { apiRequest } = await import('$lib/api/http-client');
const { screen, waitFor, within } = await import('@testing-library/svelte');
const { default: userEvent } = await import('@testing-library/user-event');

const maintenance = {
  id: 1,
  computerId: 3,
  computerName: 'CONTABIL-03',
  computerDisplayName: 'Contábil — mesa do fechamento',
  computerDepartment: 'contabil',
  otherMachine: null,
  type: 'corrective',
  description: 'Cooler do processador substituído.',
  performedBy: 'Suporte TI',
  performedAt: '2026-09-20T12:00:00.000Z',
  createdAt: '2026-09-20T13:00:00.000Z',
  createdBy: 'suporte@azuos.local',
  updatedAt: null,
  updatedBy: null,
};

describe('a rota infra/maintenance com histórico', () => {
  // feliz
  it('abre o formulário para registrar e para corrigir uma manutenção', async () => {
    vi.mocked(apiRequest).mockImplementation(async (path: string) => {
      if (path === '/maintenances') return { items: [maintenance], total: 1, page: 1, pageSize: 25 };
      if (path === '/computers') return { items: [], total: 0, page: 1, pageSize: 100 };
      return [];
    });
    visiting({});
    renderPage(Page as never);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    await screen.findAllByText('Cooler do processador substituído.');
    await user.click(screen.getAllByRole('button', { name: 'Registrar manutenção' })[0]!);
    let dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Registrar manutenção');
    await user.click(within(dialog).getByRole('button', { name: 'Fechar diálogo' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: 'Corrigir' })[0]!);
    dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Corrigir manutenção');
  });
});
