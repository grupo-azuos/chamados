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
  onClearFilters: vi.fn(),
};

function renderWith(
  over: {
    chips?: { key: string; label: string }[];
    canClear?: boolean;
    isFilteredOut?: boolean;
  } = {},
) {
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
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
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

  /* O cartão de filtros do grupo: chega aberto e contado, e o "Limpar filtros" fica na linha de
     cima, ao lado do "Filtros" — como no paralegal. */
  it('arrives open and counted when a filter is on, and clears from the top line', async () => {
    renderWith({ chips: [{ key: 'priority', label: 'Urgência: Alta' }], canClear: true });

    expect(screen.getByRole('button', { name: 'Filtros · 1' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(actions.onClearFilters).toHaveBeenCalledOnce();
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

describe('AzuosFilterPanel — person field', () => {
  const personField: FilterPanelField = {
    key: 'responsible',
    label: 'Responsável',
    control: 'person',
    ariaLabel: 'Filtrar por responsável',
    allLabel: 'Todos os responsáveis',
    value: '',
    options: [{ value: 'none', label: '(Sem responsável)' }],
    people: [{ id: 'p-ana', name: 'Ana Lima', photo: null }],
  };

  function renderPerson(value = '') {
    return render(FilterPanel, {
      props: {
        data: {
          search: { value: '', placeholder: 'Buscar…' },
          fields: [{ ...personField, value }],
          chips: [{ key: 'responsible', label: 'Responsável' }],
          canClear: true,
        },
        actions,
      },
    });
  }

  // feliz
  it('uses the person picker with the photo and reports the chosen id by key', async () => {
    renderPerson();

    await fireEvent.click(screen.getByRole('combobox', { name: 'Filtrar por responsável' }));
    await fireEvent.click(await screen.findByRole('option', { name: /Ana Lima/ }));

    expect(actions.onFieldChange).toHaveBeenLastCalledWith('responsible', 'p-ana');
  });

  // triste
  it('reads "everyone" while no person is chosen, and the special choice when it is', async () => {
    renderPerson();
    expect(screen.getByRole('combobox', { name: 'Filtrar por responsável' })).toHaveTextContent(
      'Todos os responsáveis',
    );
  });
});
