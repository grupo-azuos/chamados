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

describe('a rota system/schedule', () => {
  // feliz
  it('monta a tela e dá título à aba', async () => {
    visiting({});

    const { container } = renderPage(Page as never);

    expect(container).toBeTruthy();
    await vi.waitFor(() => expect(document.title).toContain('Cronograma de Sistemas'), { timeout: 4_000 });
  });

  // triste
  it('mostra o que o servidor respondeu quando a API está fora', async () => {
    visiting({});

    renderPage(Page as never);

    await expectOutageShown();
  });
});

const { apiRequest } = await import('$lib/api/http-client');
const { screen, waitFor } = await import('@testing-library/svelte');
const { default: userEvent } = await import('@testing-library/user-event');
const { ADMIN } = await import('../../../route-page.test-support');

const today = new Date().toLocaleDateString('sv-SE');
const appointment = {
  id: 1,
  kind: 'appointment',
  title: 'Deploy do portal',
  note: null,
  projectId: null,
  projectName: null,
  date: today,
  startTime: '09:00',
  endTime: '10:00',
  color: 'green',
  category: 'deploy',
  createdAt: '2026-10-01T00:00:00Z',
  createdById: ADMIN.id,
  createdByEmail: ADMIN.email,
  createdByName: ADMIN.name,
};
const pullRequest = {
  id: 5,
  projectId: 1,
  projectName: 'Portal',
  type: 'pr',
  externalId: '#5',
  title: 'Ajusta o cabeçalho',
  description: null,
  url: null,
  author: 'ana',
  status: 'merged',
  eventDate: `${today}T15:00:00.000Z`,
  createdAt: `${today}T15:00:00.000Z`,
};

/** A API respondendo de verdade: um agendamento de hoje e um PR mergeado hoje. */
function serveSchedule() {
  vi.mocked(apiRequest).mockImplementation(async (path: string, options?: { method?: string }) => {
    if (options?.method === 'DELETE') return undefined;
    if (path === '/software-schedule') return [appointment];
    if (path === '/software-timeline') return { items: [pullRequest], total: 1, page: 1, pageSize: 200 };
    return { items: [], total: 0, page: 1, pageSize: 100 };
  });
}

describe('a rota system/schedule com dados', () => {
  // feliz
  it('abre o formulário de novo agendamento pelo botão e pelo dia clicado', async () => {
    serveSchedule();
    visiting({});
    renderPage(Page as never);
    await screen.findByRole('button', { name: /Deploy do portal/ });

    await userEvent.click(screen.getByRole('button', { name: 'Novo agendamento' }));
    expect(await screen.findByText('Novo Compromisso')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByText('Novo Compromisso')).not.toBeInTheDocument());

    const day = today.split('-').reverse().join('/');
    await userEvent.click(screen.getByRole('button', { name: `Novo agendamento em ${day}` }));
    expect(await screen.findByText('Novo Compromisso')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Início' })).toHaveTextContent('09:00');
  });

  // feliz
  it('abre o agendamento de quem marcou e o exclui', async () => {
    serveSchedule();
    visiting({});
    renderPage(Page as never);

    await userEvent.click(await screen.findByRole('button', { name: /Deploy do portal/ }));
    expect(await screen.findByText('Editar Compromisso')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Excluir compromisso' }));
    await waitFor(() => expect(screen.queryByText('Editar Compromisso')).not.toBeInTheDocument());
    expect(apiRequest).toHaveBeenCalledWith('/software-schedule/1', expect.objectContaining({ method: 'DELETE' }));
  });

  // feliz
  it('abre e fecha a janela dos PRs do dia', async () => {
    serveSchedule();
    visiting({});
    renderPage(Page as never);

    const day = today.split('-').reverse().join('/');
    await userEvent.click(await screen.findByRole('button', { name: `Ver 1 PR do dia ${day}` }));
    expect(await screen.findByText(`PRs do dia ${day}`)).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByText(`PRs do dia ${day}`)).not.toBeInTheDocument());
  });

  // triste
  it('não abre formulário para quem só consulta o sistema', async () => {
    serveSchedule();
    const viewer = { ...ADMIN, id: 'u-bia', role: 'user' as const, roles: { ...ADMIN.roles, sistema: 'user' as const } };
    visiting({}, viewer as never);
    renderPage(Page as never, { data: { user: viewer } });

    await userEvent.click(await screen.findByRole('button', { name: /Deploy do portal/ }));
    expect(screen.queryByText('Editar Compromisso')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Novo agendamento em/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Novo agendamento' }));
    expect(screen.queryByText('Novo Compromisso')).not.toBeInTheDocument();
  });
});
