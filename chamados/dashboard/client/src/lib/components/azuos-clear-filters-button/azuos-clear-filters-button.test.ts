import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import ClearFiltersButton from './azuos-clear-filters-button.svelte';

describe('AzuosClearFiltersButton', () => {
  // feliz
  it('clears the filters when some filter is on', async () => {
    const onClear = vi.fn();
    render(ClearFiltersButton, { props: { state: { hasFilter: true }, actions: { onClear } } });

    await fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(onClear).toHaveBeenCalled();
  });

  // triste
  it('does not show up when there is nothing to clear', () => {
    render(ClearFiltersButton, { props: { state: { hasFilter: false }, actions: { onClear: vi.fn() } } });

    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull();
  });
});
