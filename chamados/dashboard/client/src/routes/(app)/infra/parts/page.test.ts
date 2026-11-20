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

describe('a rota infra/parts', () => {
  // feliz
  it('mounts the screen and titles the tab', async () => {
    visiting({});

    const { container } = renderPage(Page as never);

    expect(container).toBeTruthy();
    await vi.waitFor(() => expect(document.title).toContain('Depósito'), { timeout: 4_000 });
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

const part = {
  id: 1,
  name: 'SSD 240 GB Kingston',
  category: 'ssd',
  condition: 'new',
  balance: 3,
  createdAt: '2026-09-01T12:00:00.000Z',
  createdBy: 'suporte@azuos.local',
  updatedAt: null,
  updatedBy: null,
};

function serveParts() {
  vi.mocked(apiRequest).mockImplementation(async (path: string) => {
    if (path === '/parts') return { items: [part], total: 1, page: 1, pageSize: 25 };
    if (path === '/parts/summary') return { kinds: 1, items: 3, outOfStock: 0 };
    if (path.startsWith('/parts/movements') || path === '/computers') return { items: [], total: 0, page: 1, pageSize: 25 };
    return [];
  });
}

describe('the infra/parts route with parts', () => {
  // feliz
  it('opens the registration, the fix and the movement of a part', async () => {
    serveParts();
    visiting({});
    renderPage(Page as never);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    await screen.findAllByText('SSD 240 GB Kingston');
    const closeDialog = async () => {
      await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Fechar diálogo' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    };

    await user.click(screen.getAllByRole('button', { name: 'Cadastrar peça' })[0]!);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await closeDialog();

    await user.click(screen.getAllByRole('button', { name: 'Corrigir' })[0]!);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await closeDialog();

    await user.click(screen.getAllByRole('button', { name: 'Entrada' })[0]!);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await closeDialog();

    await user.click(screen.getAllByRole('button', { name: 'Saída' })[0]!);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
