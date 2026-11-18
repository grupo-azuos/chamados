import { describe, expect, it, vi } from 'vitest';

import Page from './+page.svelte';
import { ADMIN, renderPage, visiting } from '../../route-page.test-support';

/* Só o `apiRequest` é fingido: `ApiError` e `readError` continuam reais. */
vi.mock('$lib/api/http-client', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  const ApiError = original.ApiError as new (status: number, message: string) => Error;
  const outage = () => Promise.reject(new ApiError(503, 'Serviço fora do ar.'));

  return { ...original, apiRequest: vi.fn(outage), apiDownload: vi.fn(outage), uploadFile: vi.fn(outage) };
});

describe('a rota support/profile', () => {
  // feliz
  it('monta a tela e dá título à aba', async () => {
    visiting({});

    const { container } = renderPage(Page as never);

    expect(container).toBeTruthy();
    await vi.waitFor(() => expect(document.title).toContain('Meu perfil — Central de Chamados TI'), { timeout: 4_000 });
  });

  // triste
  /* A ficha vem da sessão, não da API: mesmo com o servidor fora, a pessoa se vê. */
  it('mostra a ficha de quem está logado mesmo com a API fora', async () => {
    visiting({});

    renderPage(Page as never);

    await vi.waitFor(() => expect(document.body.textContent).toContain(ADMIN.name), { timeout: 4_000 });
  });
});
