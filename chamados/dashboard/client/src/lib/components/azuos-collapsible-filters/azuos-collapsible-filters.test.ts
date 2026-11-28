import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { filtersLabelOf } from './azuos-collapsible-filters.svelte';
import Harness from './azuos-collapsible-filters-harness.test.svelte';

describe('AzuosCollapsibleFilters', () => {
  // feliz
  it('opens and closes the hidden filters from the button', async () => {
    const user = userEvent.setup();
    const { container } = render(Harness);

    const more = () => container.querySelector('[data-state]');
    expect(more()).toHaveAttribute('data-state', 'closed');
    await user.click(screen.getByRole('button', { name: 'Filtros' }));

    expect(more()).toHaveAttribute('data-state', 'open');
    expect(screen.getByRole('region', { name: 'Filtros das peças' })).toBeInTheDocument();
  });

  // feliz
  /* Filtro escondido valendo e fora de vista é lista "faltando coisa": nasce aberto. */
  it('starts open with the count when a hidden filter is on, and clears from the top line', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    const { container } = render(Harness, { props: { activeCount: 2, hasFilter: true, onClear } });

    expect(container.querySelector('[data-state]')).toHaveAttribute('data-state', 'open');
    expect(screen.getByRole('button', { name: 'Filtros · 2' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    expect(onClear).toHaveBeenCalledOnce();
  });

  // triste
  it('has no "Filtros" button when there is nothing to hide, nor clearing without a filter', () => {
    render(Harness, { props: { hasMore: false } });

    expect(screen.queryByRole('button', { name: 'Filtros' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull();
    expect(filtersLabelOf(0)).toBe('Filtros');
  });
});
