import { fireEvent, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FilterPanel, { type FilterPanelField } from './azuos-filter-panel.svelte';

const fields: FilterPanelField[] = [
  {
    key: 'priority',
    label: 'Urgência',
    control: 'pills',
    ariaLabel: 'Filtrar por urgência',
    allLabel: 'Qualquer',
    value: '',
    options: [
      { value: 'low', label: 'Baixa' },
      { value: 'high', label: 'Alta' },
    ],
  },
  {
    key: 'status',
    label: 'Situação',
    control: 'select',
    ariaLabel: 'Filtrar por situação',
    allLabel: 'Todas',
    value: '',
    options: [
      { value: 'open', label: 'Aberto' },
      { value: 'resolved', label: 'Resolvido' },
    ],
  },
];

const actions = {
  onSearchChange: vi.fn(),
  onFieldChange: vi.fn(),
  onRemoveChip: vi.fn(),
  onClearFilters: vi.fn(),
};

function renderWith(over: { chips?: { key: string; label: string }[]; canClear?: boolean; isFilteredOut?: boolean } = {}) {
  return render(FilterPanel, {
    props: {
      data: {
        search: { value: '', placeholder: 'Buscar…' },
        fields,
        chips: over.chips ?? [],
        canClear: over.canClear ?? false,
      },
      state: { isFilteredOut: over.isFilteredOut },
      actions,
    },
  });
}

beforeEach(() => vi.clearAllMocks());

describe('AzuosFilterPanel', () => {
  // feliz
  it('opens on demand and reports a pill and a dropdown choice by key', async () => {
    renderWith();
    const toggle = screen.getByRole('button', { name: /^Filtros/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);

    await userEvent.click(screen.getByRole('button', { name: 'Alta' }));
    expect(actions.onFieldChange).toHaveBeenLastCalledWith('priority', 'high');

    await userEvent.click(screen.getByRole('button', { name: 'Filtrar por situação' }));
    const popup = (await screen.findAllByPlaceholderText('Buscar…'))
      .at(-1)
      ?.closest('[data-slot="popover-content"]') as HTMLElement;
    await fireEvent.click(within(popup).getByText('Resolvido'));
    expect(actions.onFieldChange).toHaveBeenLastCalledWith('status', 'resolved');
  });

  it('arrives open and counted when a filter is on, and each chip switches it off', async () => {
    renderWith({ chips: [{ key: 'priority', label: 'Urgência: Alta' }], canClear: true });

    expect(screen.getByRole('button', { name: /^Filtros/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('1 ativo')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tirar o filtro Urgência: Alta' }));
    expect(actions.onRemoveChip).toHaveBeenCalledWith('priority');
  });

  // triste
  it('offers nothing to clear while no filter is on', () => {
    renderWith();

    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull();
  });

  it('leaves the clear button to the empty list when the filter hid everything', () => {
    renderWith({ canClear: true, isFilteredOut: true });

    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull();
  });
});
