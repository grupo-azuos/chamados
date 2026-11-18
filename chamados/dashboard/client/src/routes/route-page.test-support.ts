import { render, waitFor } from '@testing-library/svelte';
import { type Component } from 'svelte';
import { expect } from 'vitest';

import { page } from '$app/state';
import Harness from './route-harness.test.svelte';

/**
 * O APOIO das páginas: a API inteira responde "serviço fora" e a sessão é a de quem o teste
 * disser. O que se prova numa rota é a composição — ela monta, dá título à aba e mostra o
 * estado que o model devolveu —, não a regra, que mora nos hooks e nas views.
 */
export const OUTAGE = 'Serviço fora do ar.';

export const ADMIN = {
  id: 'u-ana',
  email: 'ana@empresa.com.br',
  name: 'Ana',
  role: 'superadmin' as const,
  roles: { infra: 'admin' as const, sistema: 'admin' as const, manutencao: 'admin' as const },
  image: null,
};

/** A sessão e os parâmetros da rota, como o SvelteKit os entregaria. */
export function visiting(params: Record<string, string> = {}, user: typeof ADMIN | undefined = ADMIN) {
  const route = page as unknown as { params: Record<string, string>; data: Record<string, unknown> };
  route.params = params;
  route.data = { user };
}

export function renderPage(component: Component<never>, props: Record<string, unknown> = {}) {
  return render(Harness, { props: { component, props: { data: { user: ADMIN }, ...props } } });
}

export async function expectOutageShown(): Promise<void> {
  await waitFor(() => expect(document.body.textContent).toContain(OUTAGE), { timeout: 4_000 });
}
