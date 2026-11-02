import { describe, expect, it, vi } from 'vitest';

import { load } from './+page';

describe('a tela de abrir chamado (/support)', () => {
  // feliz
  it('leva o link de consulta antigo para a tela de consultar, com o mesmo token', () => {
    const run = () => load({ url: new URL('http://localhost/support?ticket=abc.123') });

    expect(run).toThrow(expect.objectContaining({ status: 307, location: '/support/tickets?ticket=abc.123' }));
  });

  // triste
  it('fica no formulário quando não há link de consulta', () => {
    expect(load({ url: new URL('http://localhost/support?invite=xyz') })).toBeUndefined();
  });
});

/* Só o `apiRequest` é fingido: `ApiError` e `readError` continuam reais. */
vi.mock('$lib/api/http-client', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  const ApiError = original.ApiError as new (status: number, message: string) => Error;
  const outage = () => Promise.reject(new ApiError(503, 'Serviço fora do ar.'));

  return { ...original, apiRequest: vi.fn(outage), apiDownload: vi.fn(outage), uploadFile: vi.fn(outage) };
});

const { default: Page } = await import('./+page.svelte');
const { renderPage, visiting } = await import('../route-page.test-support');
const { screen } = await import('@testing-library/svelte');

describe('a rota /support', () => {
  // feliz
  it('monta o formulário de abrir chamado e dá título à aba', async () => {
    visiting({});

    renderPage(Page as never);

    await vi.waitFor(() => expect(document.title).toContain('Abrir chamado'), { timeout: 4_000 });
    expect(screen.getByRole('link', { name: 'Abrir o painel' })).toHaveAttribute('href', '/');
  });
});
