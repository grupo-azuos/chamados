import { fireEvent, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InventoryFilters, {
  ALERT_FILTER_LABELS,
  activeFilterChips,
  hasAnyFilter,
  responsibleChip,
  upgradeChip,
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
  responsibleId: '',
  upgrade: '',
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
  onResponsibleChange: vi.fn(),
  onUpgradeChange: vi.fn(),
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

const people = [
  { id: 'p-ana', name: 'Ana Lima', photo: '/ana.png' },
  { id: 'p-bia', name: 'Bia Costa', photo: null },
];

describe('AzuosInventoryFilters — responsible', () => {
  // feliz
  it('filters by a person picked with the photo, keeping her id', async () => {
    render(InventoryFilters, {
      props: { data: { filter: emptyFilter, departmentOptions: [], responsibleOptions: people }, actions },
    });
    await userEvent.click(screen.getByRole('button', { name: /Filtros/ }));

    await fireEvent.click(screen.getByRole('combobox', { name: 'Filtrar por responsável' }));
    await fireEvent.click(await screen.findByRole('option', { name: /Bia Costa/ }));

    expect(actions.onResponsibleChange).toHaveBeenLastCalledWith('p-bia');
  });

  // feliz
  it('offers "(Sem responsável)" before the people', async () => {
    render(InventoryFilters, {
      props: { data: { filter: emptyFilter, departmentOptions: [], responsibleOptions: people }, actions },
    });
    await userEvent.click(screen.getByRole('button', { name: /Filtros/ }));

    await fireEvent.click(screen.getByRole('combobox', { name: 'Filtrar por responsável' }));
    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent?.trim())).toEqual([
      'Todos os responsáveis',
      '(Sem responsável)',
      expect.stringContaining('Ana Lima'),
      expect.stringContaining('Bia Costa'),
    ]);
    await fireEvent.click(options[1]!);
    expect(actions.onResponsibleChange).toHaveBeenLastCalledWith('none');
  });

  // feliz
  it('shows the chosen person on a chip that switches the filter off', async () => {
    render(InventoryFilters, {
      props: {
        data: { filter: { ...emptyFilter, responsibleId: 'p-ana' }, departmentOptions: [], responsibleOptions: people },
        actions,
      },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Tirar o filtro Responsável: Ana Lima' }));
    expect(actions.onResponsibleChange).toHaveBeenLastCalledWith('');
  });

  // triste
  it('keeps a generic chip for a person who no longer answers for any machine', () => {
    const chip = responsibleChip({ ...emptyFilter, responsibleId: 'p-gone' }, actions, people);

    expect(chip?.label).toBe('Responsável');
    expect(responsibleChip({ ...emptyFilter, responsibleId: 'none' }, actions, people)?.label).toBe('(Sem responsável)');
    expect(responsibleChip(emptyFilter, actions, people)).toBeNull();
  });
});

describe('AzuosInventoryFilters — upgrade', () => {
  // feliz
  it('filters by any upgrade reason or by one, from the panel', async () => {
    renderWith();
    await userEvent.click(screen.getByRole('button', { name: /Filtros/ }));

    await choose('Filtrar por upgrade', 'Precisa de upgrade');
    expect(actions.onUpgradeChange).toHaveBeenLastCalledWith('any');
    await choose('Filtrar por upgrade', 'Processador antigo');
    expect(actions.onUpgradeChange).toHaveBeenLastCalledWith('cpu');
  });

  // feliz
  it('shows the reason on a chip that switches the filter off', async () => {
    renderWith({ upgrade: 'memory' });

    await userEvent.click(screen.getByRole('button', { name: 'Tirar o filtro Upgrade: Pouca memória' }));
    expect(actions.onUpgradeChange).toHaveBeenLastCalledWith('');
  });

  // triste
  it('has no chip while the upgrade filter is off, and a plain one for any reason', () => {
    expect(upgradeChip(emptyFilter, actions)).toBeNull();
    expect(upgradeChip({ ...emptyFilter, upgrade: 'any' }, actions)?.label).toBe('Precisa de upgrade');
  });
});

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

describe('ALERT_FILTER_LABELS', () => {
  // feliz
  it('names each alert filter in proper Portuguese, the disk included', () => {
    expect(ALERT_FILTER_LABELS).toEqual({
      any: 'Com alerta ativo',
      cpu: 'CPU elevada',
      memory: 'Memória elevada',
      disk: 'Disco quase cheio',
    });
  });

  // triste
  /* Montado como "<peça> elevada", o chip do disco saía "Disco elevada". */
  it('never shows the misgendered disk chip', () => {
    const chips = activeFilterChips({ ...emptyFilter, alert: 'disk' }, actions);

    expect(chips.map((chip) => chip.label)).toEqual(['Disco quase cheio']);
  });
});

