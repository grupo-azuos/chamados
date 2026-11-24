import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { traceabilityGraphFixture } from '$lib/utils/traceability.fixture.test-support';
import TraceabilityMap from './azuos-traceability-map.svelte';

/* O Svelte Flow mede a área com `ResizeObserver`, que o jsdom não tem. */
beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

function setup(
  over: Partial<{
    id: string;
    graph: ReturnType<typeof traceabilityGraphFixture> | null;
    error: string | null;
  }> = {},
) {
  const actions = { onFocusChange: vi.fn(), onOpenPicker: vi.fn() };
  render(TraceabilityMap, {
    props: {
      data: {
        focus: 'department',
        id: over.id ?? '3',
        choiceLabel: 'Fiscal',
        params: 'focus=department&id=3',
        graph: over.graph === undefined ? traceabilityGraphFixture() : over.graph,
      },
      state: { error: over.error ?? null },
      actions,
    },
  });
  return actions;
}

describe('AzuosTraceabilityMap', () => {
  // feliz
  it('switches the starting point and draws the map', async () => {
    const actions = setup();

    expect(screen.getByRole('region', { name: 'Mapa de rastreabilidade' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Fiscal' }));
    expect(actions.onOpenPicker).toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Chamado: CH-0009' })).toHaveAttribute(
      'href',
      '?focus=department&id=3&ticket=9',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Pessoa' }));
    expect(actions.onFocusChange).toHaveBeenCalledWith('person');
  });

  // triste
  it('asks for a choice, says when nothing is linked and when the map failed', () => {
    setup({ id: '', graph: null });
    expect(screen.getByText('Escolha o ponto de partida')).toBeInTheDocument();
    document.body.innerHTML = '';
    setup({ graph: { focusId: 'department:3', nodes: [], edges: [] } });
    expect(screen.getByText('Nada ligado a esta escolha')).toBeInTheDocument();
    document.body.innerHTML = '';
    setup({ error: 'Sem conexão' });
    expect(screen.getByText('Sem conexão')).toBeInTheDocument();
  });
});
