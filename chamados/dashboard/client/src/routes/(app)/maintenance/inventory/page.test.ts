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

describe('a rota maintenance/inventory', () => {
  // feliz
  it('mounts the screen and titles the tab', async () => {
    visiting({});

    const { container } = renderPage(Page as never);

    expect(container).toBeTruthy();
    await vi.waitFor(() => expect(document.title).toContain('Inventário'), { timeout: 4_000 });
  });

  // triste
  it('shows what the server answered when the API is down', async () => {
    visiting({});

    renderPage(Page as never);

    await expectOutageShown();
  });
});

const { apiRequest } = await import('$lib/api/http-client');
const { screen, waitFor, within } = await import('@testing-library/svelte');
const { default: userEvent } = await import('@testing-library/user-event');

const item = {
  id: 1,
  name: 'Cadeira giratória',
  category: 'furniture',
  unit: 'unit',
  location: 'Copa',
  code: 'PAT-0101',
  note: null,
  photoUrl: null,
  balance: 2,
  createdAt: '2026-09-01T12:00:00.000Z',
  createdBy: 'suporte@azuos.local',
  updatedAt: null,
  updatedBy: null,
};

describe('the maintenance/inventory route with products', () => {
  // feliz
  it('opens the registration and the fix of a product', async () => {
    vi.mocked(apiRequest).mockImplementation(async (path: string) => {
      if (path === '/inventory-items') return { items: [item], total: 1, page: 1, pageSize: 25 };
      return { items: [], total: 0, page: 1, pageSize: 25 };
    });
    visiting({});
    renderPage(Page as never);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    await screen.findAllByText('Cadeira giratória');
    await user.click(screen.getAllByRole('button', { name: 'Cadastrar produto' })[0]!);
    let dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Cadastrar produto');
    await user.click(within(dialog).getByRole('button', { name: 'Fechar diálogo' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(screen.getAllByRole('button', { name: 'Editar Cadeira giratória' })[0]!);
    dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
  });
});
