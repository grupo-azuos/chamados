import { describe, expect, it, vi } from 'vitest';

import Page from './+page.svelte';
import { expectOutageShown, renderPage, visiting } from '../../../route-page.test-support';

/* Só o `apiRequest` é fingido: `ApiError` e `readError` continuam reais. */
vi.mock('$lib/api/http-client', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  const ApiError = original.ApiError as new (status: number, message: string) => Error;
  const outage = () => Promise.reject(new ApiError(503, 'Serviço fora do ar.'));

  return {
    ...original,
    apiRequest: vi.fn(outage),
    apiDownload: vi.fn(outage),
    uploadFile: vi.fn(outage),
  };
});

describe('a rota system/projects', () => {
  // feliz
  it('mounts the screen and titles the tab', async () => {
    visiting({});

    const { container } = renderPage(Page as never);

    expect(container).toBeTruthy();
    await vi.waitFor(() => expect(document.title).toContain('Sistemas'), { timeout: 4_000 });
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
const { goto } = await import('$app/navigation');

const project = {
  id: 7,
  name: 'Azuos Ticket',
  description: 'Central de chamados',
  repositoryUrl: 'https://github.com/grupo-azuos/chamados',
  status: 'active',
  color: 'blue',
  githubRepoOwner: 'grupo-azuos',
  githubRepoName: 'chamados',
  responsibleId: null,
  responsibleName: null,
  openTicketsCount: 2,
  pullRequestsCount: 1,
  createdAt: '2026-09-01T12:00:00.000Z',
  updatedAt: null,
};

describe('the system/projects route with systems', () => {
  // feliz
  it('opens the registration and the edit of a system, and leads to the timeline', async () => {
    vi.mocked(apiRequest).mockImplementation(async (path: string) => {
      if (path === '/software-projects')
        return { items: [project], total: 1, page: 1, pageSize: 25 };
      if (path === '/integrations/github/status') return { isLinked: false };
      if (path.includes('assignee-options')) return [];
      return { items: [], total: 0, page: 1, pageSize: 25 };
    });
    visiting({});
    renderPage(Page as never);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    await screen.findAllByText('Azuos Ticket');
    await user.click(screen.getAllByRole('button', { name: 'Novo sistema' })[0]!);
    let dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Novo sistema');
    await user.click(within(dialog).getByRole('button', { name: 'Fechar diálogo' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: 'Ações de Azuos Ticket' })[0]!);
    await user.click(await screen.findByRole('menuitem', { name: 'Editar' }));
    dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Editar sistema');
    await user.click(within(dialog).getByRole('button', { name: 'Fechar diálogo' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: 'Ver sistema Azuos Ticket' })[0]!);
    expect(goto).toHaveBeenCalledWith('/system/projects/7');
  });
});
