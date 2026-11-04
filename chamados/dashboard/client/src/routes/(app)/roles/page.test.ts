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

describe('a rota roles', () => {
  // feliz
  it('monta a tela e dá título à aba', async () => {
    visiting({});

    const { container } = renderPage(Page as never);

    expect(container).toBeTruthy();
    await vi.waitFor(() => expect(document.title).toContain('Acessos por módulo'), { timeout: 4_000 });
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

const role = {
  id: 1,
  userId: 'usr_1',
  userEmail: 'bia@empresa.com.br',
  context: 'infra',
  createdAt: '2026-10-01T12:00:00.000Z',
  createdBy: 'ana@empresa.com.br',
  updatedAt: null,
  updatedBy: null,
};

describe('a rota roles com acessos carregados', () => {
  // feliz
  it('abre o formulário de liberar módulo e a pergunta de tirar módulo', async () => {
    vi.mocked(apiRequest).mockImplementation(async (path: string) => (path === '/roles' ? [role] : []));
    visiting({});
    renderPage(Page as never);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    await screen.findAllByText('bia@empresa.com.br');
    await user.click(screen.getByRole('button', { name: 'Liberar módulo' }));
    const form = await screen.findByRole('dialog');
    expect(form).toHaveTextContent('Liberar módulos');
    await user.click(within(form).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: /^Tirar o módulo / })[0]!);
    const question = await screen.findByRole('dialog');
    expect(question).toHaveTextContent('Tirar este módulo?');
    expect(question).toHaveTextContent('bia@empresa.com.br');
    await user.click(within(question).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
