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

describe('a rota infra/computers', () => {
  // feliz
  it('monta a tela e dá título à aba', async () => {
    visiting({});

    const { container } = renderPage(Page as never);

    expect(container).toBeTruthy();
    await vi.waitFor(() => expect(document.title).toContain('Inventário'), { timeout: 4_000 });
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

describe('a rota infra/computers com o cadastro', () => {
  // feliz
  it('abre o cadastro de computador e o fecha', async () => {
    vi.mocked(apiRequest).mockImplementation(async (path: string) => {
      if (path === '/computers') return { items: [], total: 0, page: 1, pageSize: 25 };
      if (path === '/departments') return { rh: ['Contábil'], local: [], isRhAvailable: true };
      return [];
    });
    visiting({});
    renderPage(Page as never);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    await user.click((await screen.findAllByRole('button', { name: 'Cadastrar computador' }))[0]!);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Cadastrar computador');
    await user.click(within(dialog).getByRole('button', { name: 'Fechar diálogo' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
