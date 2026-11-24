import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import View from './azuos-support-systems-view.svelte';

const paralegal = {
  id: 1,
  name: 'Paralegal',
  description: 'Alvarás e contratos',
  status: 'active' as const,
  openTickets: 3,
  openIssues: 5,
  lastActivityAt: '2026-11-23T10:00:00.000Z',
};

function setup(
  over: Partial<{ systems: (typeof paralegal)[]; total: number; error: string | null }> = {},
) {
  const actions = { onSearch: vi.fn(), onOpen: vi.fn(), onRetry: vi.fn() };
  render(View, {
    props: {
      data: { systems: over.systems ?? [paralegal], search: '', total: over.total ?? 1 },
      state: { error: over.error ?? null },
      actions,
    },
  });
  return actions;
}

describe('AzuosSupportSystemsView', () => {
  // feliz
  it('shows how each system is going and opens its map', async () => {
    const actions = setup();

    expect(screen.getByText('Paralegal')).toBeInTheDocument();
    expect(screen.getByText('Chamados abertos')).toBeInTheDocument();
    expect(screen.getByText(/Último movimento em/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ver o andamento de Paralegal' }));
    expect(actions.onOpen).toHaveBeenCalledWith(1);
    await userEvent.type(screen.getByLabelText('Buscar'), 'p');
    expect(actions.onSearch).toHaveBeenCalledWith('p');
  });

  // triste
  it('says when nothing matches the search, and shows a failure with a retry', () => {
    setup({ systems: [] });
    expect(screen.getByText('Nenhum sistema com esse nome')).toBeInTheDocument();
    document.body.innerHTML = '';
    setup({ error: 'Sem conexão' });
    expect(screen.getByText('Sem conexão')).toBeInTheDocument();
  });
});
