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

describe('a rota system/projects/detalhe', () => {
  // feliz
  it('monta a tela e dá título à aba', async () => {
    visiting({ id: '2' });

    const { container } = renderPage(Page as never);

    expect(container).toBeTruthy();
    await vi.waitFor(() => expect(document.title).toContain('Sistema'), { timeout: 4_000 });
  });

  // triste
  it('mostra o que o servidor respondeu quando a API está fora', async () => {
    visiting({ id: '2' });

    renderPage(Page as never);

    await expectOutageShown();
  });
});

const { apiRequest } = await import('$lib/api/http-client');
const { screen } = await import('@testing-library/svelte');
const { default: userEvent } = await import('@testing-library/user-event');

const { goto } = await import('$app/navigation');

const project = {
  id: 1,
  name: 'Portal do Cliente',
  description: 'Autoatendimento.',
  repositoryUrl: 'grupo-azuos/portal-cliente',
  githubRepoOwner: 'grupo-azuos',
  githubRepoName: 'portal-cliente',
  responsibleId: null,
  responsibleName: null,
  status: 'active',
  color: 'blue',
  openTicketsCount: 1,
  pullRequestsCount: 0,
  createdAt: '2026-01-10T08:00:00.000Z',
  updatedAt: null,
};
const ticket = {
  id: 9,
  protocol: 'CH-0009',
  status: 'open',
  priority: 'high',
  requesterName: 'Marta',
  area: 'sistema',
  department: 'fiscal',
  problemType: 'bug',
  participantAreas: [],
  computerId: null,
  computerName: null,
  anydeskId: null,
  contactPhone: null,
  notifyWhatsapp: false,
  description: 'Erro ao salvar.',
  screenshotUrl: null,
  assignee: null,
  solution: null,
  createdAt: '2026-09-23T12:00:00.000Z',
  startedAt: null,
  resolvedAt: null,
  updatedAt: null,
  updatedBy: null,
};

describe('a rota system/projects/detalhe com o sistema carregado', () => {
  // feliz
  it('mostra o sistema, abre um chamado dele e volta à lista', async () => {
    vi.mocked(apiRequest).mockImplementation(async (path: string) => {
      if (path === '/software-projects/1') return project;
      if (path === '/tickets') return { items: [ticket], total: 1, page: 1, pageSize: 200 };
      return { items: [], total: 0, page: 1, pageSize: 200 };
    });
    visiting({ id: '1' });
    renderPage(Page as never);

    await screen.findByRole('heading', { name: 'Portal do Cliente' });
    await vi.waitFor(() => expect(document.title).toContain('Portal do Cliente'));
    await userEvent.click(await screen.findByRole('button', { name: /Marta/ }));
    expect(goto).toHaveBeenCalledWith('/system/tickets/9');
    await userEvent.click(screen.getByRole('button', { name: /Voltar para os projetos/ }));
    expect(goto).toHaveBeenCalledWith('/system/projects');
  });

  // triste
  it('explica quando o sistema não existe mais', async () => {
    const { ApiError } = await import('$lib/api/http-client');
    vi.mocked(apiRequest).mockImplementation(async (path: string) => {
      if (path === '/software-projects/1') throw new ApiError(404, 'Sistema não encontrado.');
      return { items: [], total: 0, page: 1, pageSize: 200 };
    });
    visiting({ id: '1' });
    renderPage(Page as never);

    expect(await screen.findByText('Sistema não encontrado')).toBeInTheDocument();
  });
});
