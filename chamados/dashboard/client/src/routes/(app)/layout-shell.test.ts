import { flushSync } from 'svelte';
import { createRawSnippet } from 'svelte';
import { render, screen, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAreaContextModel } from '$lib/hooks/use-area-context/use-area-context.svelte';
import Harness from '../route-harness.test.svelte';
import { ADMIN } from '../route-page.test-support';
import Layout from './+layout.svelte';
import { navigateTo } from './reactive-page.test-support.svelte';

/* O endereço reativo: é ele que muda a cada clique no menu. */
vi.mock('$app/state', async () => await import('./reactive-page.test-support.svelte'));

/* A API inteira fora: a casca não depende dela para desenhar o menu. */
vi.mock('$lib/api/http-client', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  const ApiError = original.ApiError as new (status: number, message: string) => Error;
  const outage = () => Promise.reject(new ApiError(503, 'Serviço fora do ar.'));

  return { ...original, apiRequest: vi.fn(outage) };
});

vi.mock('$lib/api/account-profile.api', () => ({
  accountOrigin: (configured: string | null) => configured ?? 'http://localhost:5000',
  accountProfileApi: { me: vi.fn().mockRejectedValue(new Error('offline')) },
}));

const content = createRawSnippet(() => ({ render: () => '<p>Conteúdo da tela</p>' }));

function renderLayout() {
  return render(Harness, {
    props: {
      component: Layout as never,
      props: { data: { user: ADMIN, sidebarOpen: true }, children: content },
    },
  });
}

function sidebar(): Element | null {
  return document.querySelector('[data-slot="sidebar"]');
}

function menuLinks(): string[] {
  const menu = screen.getByRole('navigation', { name: 'Menu principal' });

  return within(menu)
    .getAllByRole('link')
    .map((link) => link.getAttribute('href') ?? '');
}

describe('the internal panel shell', () => {
  beforeEach(() => {
    useAreaContextModel().actions.onContextChange('infra');
    navigateTo('/infra/tickets');
  });

  // feliz
  it('keeps the same shell mounted when the person changes module, and swaps only the menu', () => {
    renderLayout();
    const mounted = sidebar();

    expect(mounted).not.toBeNull();
    expect(menuLinks()).toContain('/infra/computers');

    navigateTo('/maintenance/inventory');
    flushSync();

    expect(sidebar()).toBe(mounted);
    expect(mounted?.isConnected).toBe(true);
    expect(menuLinks()).toContain('/maintenance/inventory');
    expect(menuLinks()).not.toContain('/infra/computers');
    expect(screen.getByText('Conteúdo da tela')).toBeInTheDocument();
  });

  // triste
  it('keeps the shell on a screen of no module, with the last module menu and nothing mixed in', () => {
    renderLayout();
    const mounted = sidebar();

    navigateTo('/maintenance/tickets');
    flushSync();
    navigateTo('/profile');
    flushSync();

    expect(sidebar()).toBe(mounted);
    expect(menuLinks()).toContain('/maintenance/stock');
    expect(menuLinks().some((href) => href.startsWith('/infra/'))).toBe(false);
    expect(menuLinks().some((href) => href.startsWith('/system/'))).toBe(false);
  });
});
