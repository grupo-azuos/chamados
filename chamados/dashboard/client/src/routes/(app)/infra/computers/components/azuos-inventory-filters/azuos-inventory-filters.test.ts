import { fireEvent, render, screen, within } from '@testing-library/svelte';
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
  resourceCondition: '',
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
  onResourceConditionChange: vi.fn(),
  onPreventiveChange: vi.fn(),
  onArchivedChange: vi.fn(),
  onClearFilters: vi.fn(),
};

function renderWith(filter: Partial<InventoryFilter> = {}) {
  return render(InventoryFilters, {
    props: { data: { filter: { ...emptyFilter, ...filter }, departmentOptions: [] }, actions },
  });
}

/** Escolhe uma opção numa lista suspensa do painel. No jsdom o balão existe, mas fica oculto. */
async function choose(listName: string, option: string) {
  await userEvent.click(screen.getByRole('button', { name: listName }));
  const popup = (await screen.findAllByPlaceholderText('Buscar…'))
    .at(-1)
    ?.closest('[data-slot="popover-content"]') as HTMLElement;
  await fireEvent.click(within(popup).getByText(option));
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

    await choose('Filtrar pela preventiva', 'Precisa de manutenção');
    expect(actions.onPreventiveChange).toHaveBeenLastCalledWith('needed');
  });

  it('filters the preventive by its situation: overdue, never done or up to date', async () => {
    renderWith();
    await userEvent.click(screen.getByRole('button', { name: /Filtros/ }));

    await choose('Filtrar pela preventiva', 'Vencida');
    expect(actions.onPreventiveChange).toHaveBeenLastCalledWith('due');
    await choose('Filtrar pela preventiva', 'Nunca feita');
    expect(actions.onPreventiveChange).toHaveBeenLastCalledWith('never');
    await choose('Filtrar pela preventiva', 'Em dia');
    expect(actions.onPreventiveChange).toHaveBeenLastCalledWith('ok');
  });

  it('filters by the condition of the resources, from a combobox with search', async () => {
    renderWith();
    await userEvent.click(screen.getByRole('button', { name: /Filtros/ }));

    await userEvent.click(
      screen.getByRole('button', { name: 'Filtrar pela condição dos recursos' }),
    );
    const popup = (await screen.findByPlaceholderText('Buscar condição…')).closest(
      '[data-slot="popover-content"]',
    ) as HTMLElement;
    await fireEvent.click(within(popup).getByText('Pouca memória'));

    expect(actions.onResourceConditionChange).toHaveBeenLastCalledWith('memory-low');
  });

  it('shows the resource condition as a chip that switches it off', async () => {
    renderWith({ resourceCondition: 'disk-critical' });

    await userEvent.click(screen.getByRole('button', { name: /Recursos: Disco quase cheio/ }));

    expect(actions.onResourceConditionChange).toHaveBeenLastCalledWith('');
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

    expect(screen.getByRole('button', { name: /Filtros/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
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

describe('AzuosInventoryFilters — every grouped filter and its chip', () => {
  // feliz
  it('changes the connection, health, kind, alert and archived filters from the panel', async () => {
    renderWith();
    await userEvent.click(screen.getByRole('button', { name: /Filtros/ }));

    /* Conexão, tipo e arquivadas têm poucas opções: viram pastilhas, não listas. */
    await userEvent.click(screen.getByRole('button', { name: 'Online agora' }));
    expect(actions.onOnlineChange).toHaveBeenLastCalledWith(true);
    await userEvent.click(screen.getByRole('button', { name: 'Offline' }));
    expect(actions.onOfflineChange).toHaveBeenLastCalledWith(true);
    await userEvent.click(screen.getByRole('button', { name: 'Todas' }));
    expect(actions.onOnlineChange).toHaveBeenLastCalledWith(false);
    expect(actions.onOfflineChange).toHaveBeenLastCalledWith(false);
    await userEvent.click(screen.getByRole('button', { name: 'Notebook' }));
    expect(actions.onKindChange).toHaveBeenLastCalledWith('notebook');
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar' }));
    expect(actions.onArchivedChange).toHaveBeenLastCalledWith(true);

    await choose('Filtrar por saúde', 'Crítica');
    expect(actions.onHealthStatusChange).toHaveBeenLastCalledWith('critical');
    await choose('Filtrar por alerta', 'Com alerta ativo');
    expect(actions.onAlertChange).toHaveBeenLastCalledWith('any');
  });

  // feliz
  it('switches off health, alert, kind, archived and online through their chips', async () => {
    renderWith({
      onlyOnline: true,
      healthStatus: 'critical',
      alert: 'cpu',
      kind: 'notebook',
      includeArchived: true,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Tirar o filtro Online agora' }));
    expect(actions.onOnlineChange).toHaveBeenLastCalledWith(false);
    await userEvent.click(screen.getByRole('button', { name: 'Tirar o filtro Saúde: Crítica' }));
    expect(actions.onHealthStatusChange).toHaveBeenLastCalledWith('');
    await userEvent.click(screen.getByRole('button', { name: 'Tirar o filtro CPU elevada' }));
    expect(actions.onAlertChange).toHaveBeenLastCalledWith('');
    await userEvent.click(screen.getByRole('button', { name: 'Tirar o filtro Notebook' }));
    expect(actions.onKindChange).toHaveBeenLastCalledWith('');
    await userEvent.click(screen.getByRole('button', { name: 'Tirar o filtro Com arquivadas' }));
    expect(actions.onArchivedChange).toHaveBeenLastCalledWith(false);
  });

  // feliz
  it('filters by department from the always visible selector', async () => {
    render(InventoryFilters, {
      props: {
        data: { filter: emptyFilter, departmentOptions: [{ value: 'fiscal', label: 'Fiscal' }] },
        actions,
      },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Filtrar por departamento' }));
    const search = await screen.findByPlaceholderText('Buscar departamento…');
    const popup = search.closest('[data-slot="popover-content"]') as HTMLElement;
    await fireEvent.click(within(popup).getByText('Fiscal'));
    expect(actions.onDepartmentChange).toHaveBeenLastCalledWith('fiscal');
  });
});
