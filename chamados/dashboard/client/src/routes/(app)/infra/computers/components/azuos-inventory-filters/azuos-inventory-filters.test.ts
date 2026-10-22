import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InventoryFilters, {
  activeFilterChips,
  hasAnyFilter,
  type InventoryFilter,
} from './azuos-inventory-filters.svelte';

const emptyFilter: InventoryFilter = {
  search: '',
  department: '',
  healthStatus: '',
  kind: '',
  onlyOnline: false,
  onlyOffline: false,
  alert: '',
  preventive: '',
  includeArchived: false,
};

const actions = {
  onSearchChange: vi.fn(),
  onDepartmentChange: vi.fn(),
  onHealthStatusChange: vi.fn(),
  onKindChange: vi.fn(),
  onOnlineChange: vi.fn(),
  onOfflineChange: vi.fn(),
  onAlertChange: vi.fn(),
  onPreventiveChange: vi.fn(),
  onArchivedChange: vi.fn(),
  onClearFilters: vi.fn(),
};

function renderWith(filter: Partial<InventoryFilter> = {}) {
  return render(InventoryFilters, {
    props: { data: { filter: { ...emptyFilter, ...filter }, departmentOptions: [] }, actions },
  });
}

beforeEach(() => vi.clearAllMocks());

describe('AzuosInventoryFilters', () => {
  // feliz
  it('opens the panel on demand and filters the machines that need maintenance', async () => {
    renderWith();
    const toggle = screen.getByRole('button', { name: /Filtros/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Precisa de manutenção' }));
    expect(actions.onPreventiveChange).toHaveBeenLastCalledWith('needed');
  });

  it('filters the preventive by its situation: overdue, never done or up to date', async () => {
    renderWith();
    await userEvent.click(screen.getByRole('button', { name: /Filtros/ }));

    await userEvent.click(screen.getByRole('button', { name: 'Vencida' }));
    expect(actions.onPreventiveChange).toHaveBeenLastCalledWith('due');
    await userEvent.click(screen.getByRole('button', { name: 'Nunca feita' }));
    expect(actions.onPreventiveChange).toHaveBeenLastCalledWith('never');
    await userEvent.click(screen.getByRole('button', { name: 'Em dia' }));
    expect(actions.onPreventiveChange).toHaveBeenLastCalledWith('ok');
  });

  it('turns each active filter into a chip that switches it off', async () => {
    renderWith({ onlyOffline: true, preventive: 'needed' });

    await userEvent.click(screen.getByRole('button', { name: 'Tirar o filtro Offline' }));
    expect(actions.onOfflineChange).toHaveBeenLastCalledWith(false);

    await userEvent.click(
      screen.getByRole('button', { name: 'Tirar o filtro Preventiva: Precisa de manutenção' }),
    );
    expect(actions.onPreventiveChange).toHaveBeenLastCalledWith('');
  });

  /* Chegou filtrada lá dentro: o painel nasce aberto e o botão conta. */
  it('arrives open and counted when a grouped filter is already on', () => {
    renderWith({ kind: 'notebook' });

    expect(screen.getByRole('button', { name: /Filtros/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('1 ativo')).toBeInTheDocument();
  });

  // triste
  it('shows no chip and no clear button while nothing is filtered', () => {
    renderWith();

    expect(screen.queryByRole('list', { name: 'Filtros ligados' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull();
  });

  it('leaves the clear button to the empty list when the filter hid everything', () => {
    render(InventoryFilters, {
      props: {
        data: { filter: { ...emptyFilter, kind: 'notebook' }, departmentOptions: [] },
        state: { isFilteredOut: true },
        actions,
      },
    });

    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Tirar o filtro Notebook' })).toBeInTheDocument();
  });

  it('offers to clear a search even though it does not become a chip', async () => {
    renderWith({ search: 'recepção' });

    expect(screen.queryByRole('list', { name: 'Filtros ligados' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(actions.onClearFilters).toHaveBeenCalled();
  });
});

describe('activeFilterChips', () => {
  // feliz
  it('lists the grouped filters in the panel order, online and offline as one', () => {
    const chips = activeFilterChips(
      {
        ...emptyFilter,
        includeArchived: true,
        onlyOnline: true,
        healthStatus: 'critical',
        preventive: 'due',
      },
      actions,
    );

    expect(chips.map((chip) => chip.label)).toEqual([
      'Online agora',
      'Saúde: Crítica',
      'Preventiva: Vencida',
      'Com arquivadas',
    ]);
  });

  // triste
  it('leaves search and department out, which stay in sight', () => {
    const filter = { ...emptyFilter, search: 'rh', department: 'TI' };
    const chips = activeFilterChips(filter, actions);

    expect(chips).toEqual([]);
    expect(hasAnyFilter(filter, chips)).toBe(true);
    expect(hasAnyFilter(emptyFilter, [])).toBe(false);
  });
});
