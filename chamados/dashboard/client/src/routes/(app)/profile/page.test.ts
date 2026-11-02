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

describe('a rota profile', () => {
  // feliz
  it('monta a tela e dá título à aba', async () => {
    visiting({});

    const { container } = renderPage(Page as never);

    expect(container).toBeTruthy();
    await vi.waitFor(() => expect(document.title).toContain('Meu perfil'), { timeout: 4_000 });
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

const connection = {
  isConfigured: true,
  canLink: true,
  state: 'disconnected',
  qr: null,
  phone: null,
  sentToday: 0,
  dailyLimit: 100,
};

describe('a rota profile de quem administra tudo', () => {
  // feliz
  it('mostra o WhatsApp e a equipe, e abre o formulário de liberar módulo', async () => {
    vi.mocked(apiRequest).mockImplementation(async (path: string) => {
      if (path === '/integrations/whatsapp/status') return connection;
      if (path === '/integrations/whatsapp/templates') return [];
      return [];
    });
    visiting({});
    renderPage(Page as never);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    expect(await screen.findByRole('link', { name: 'WhatsApp' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Equipe' })).toBeInTheDocument();
    await user.click((await screen.findAllByRole('button', { name: /Liberar o primeiro módulo|Liberar módulo/ }))[0]!);
    const form = await screen.findByRole('dialog');
    expect(form).toHaveTextContent('Liberar módulos');
    await user.click(within(form).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    /* Vincular o WhatsApp abre a janela de avisos; os textos do bot, a dos modelos. */
    await user.click(screen.getByRole('button', { name: /Vincular/ }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Textos do bot' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});

const { ADMIN } = await import('../../route-page.test-support');

describe('a rota profile de quem só administra um módulo', () => {
  // triste
  it('não oferece os textos do bot nem a equipe, mas mostra os módulos e o WhatsApp', async () => {
    vi.mocked(apiRequest).mockImplementation(async (path: string) => {
      if (path === '/integrations/whatsapp/status') return { ...connection, state: 'connected', phone: '5562988887777' };
      return [];
    });
    const admin = { ...ADMIN, role: 'admin' as const };
    visiting({}, admin as never);
    renderPage(Page as never, { data: { user: admin } });
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    expect(await screen.findByRole('link', { name: 'WhatsApp' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Equipe' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Textos do bot' })).not.toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'Desvincular' }));
    const question = await screen.findByRole('dialog');
    expect(question).toHaveTextContent('Desvincular seu WhatsApp?');
    await user.click(within(question).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
