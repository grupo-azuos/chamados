import { type ComputerListItem } from '@template/shared/schemas/computer.schema';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ComputerListView, {
  advancedFilterCount,
  displayNameOf,
  type ComputerListFilter,
  type ComputerSummary,
} from './azuos-computer-list-view.svelte';

function computer(over: Partial<ComputerListItem> = {}): ComputerListItem {
  return {
    id: 1,
    ticketsThisMonth: 0,
    preventiveStatus: 'ok',
    lastPreventiveAt: '2026-10-01T12:00:00.000Z',
    activeAlerts: 0,
    activeAlertMetrics: [],
    name: 'RECEPCAO-01',
    displayName: 'Recepção — balcão',
    responsibleName: 'Bia Costa',
    department: 'recepcao',
    kind: 'desktop',
    hardware: {
      os: 'Microsoft Windows 11 Pro',
      platform: 'windows',
      platformVersion: '10.0.26100',
      kernelVersion: '10.0.26100',
      arch: 'amd64',
      cpuModel: 'Intel Core i5-12400',
      logicalCpus: 12,
      physicalCpus: 6,
      totalMemoryBytes: 16 * 1024 ** 3,
      macAddress: '00:00:5E:00:53:01',
      localIp: '198.51.100.11',
      totalDiskBytes: 480 * 1024 ** 3,
      freeDiskBytes: 210 * 1024 ** 3,
      uptimeSeconds: 3600,
      bootTime: '2026-09-23T09:00:00.000Z',
    },
    healthScore: 100,
    healthStatus: 'good',
    warnings: [],
    isOnline: true,
    lastSeenAt: '2026-09-23T11:58:00.000Z',
    agentVersion: '1.0.0',
    isArchived: false,
    isBlocked: false,
    blockReason: null,
    disposedAt: null,
    disposalType: null,
    disposalReason: null,
    createdAt: '2026-05-01T12:00:00.000Z',
    createdBy: 'suporte@azuos.local',
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

const summary: ComputerSummary = {
  total: 8,
  online: 3,
  offline: 5,
  withAlerts: 2,
  cpuHigh: 1,
  memoryHigh: 2,
  critical: 2,
  attention: 1,
  neverSeen: 1,
};

const emptyFilter: ComputerListFilter = {
  search: '',
  department: '',
  healthStatus: '',
  kind: '',
  includeArchived: false,
  onlyOnline: false,
  onlyOffline: false,
  alert: '',
  needsMaintenance: false,
};

const actions = {
  onSearchChange: vi.fn(),
  onDepartmentChange: vi.fn(),
  onHealthStatusChange: vi.fn(),
  onArchivedChange: vi.fn(),
  onOnlineChange: vi.fn(),
  onOfflineChange: vi.fn(),
  onKindChange: vi.fn(),
  onAlertChange: vi.fn(),
  onNeedsMaintenanceChange: vi.fn(),
  onClearFilters: vi.fn(),
  onRetry: vi.fn(),
  onOpen: vi.fn(),
  onRegister: vi.fn(),
  onExportReport: vi.fn(),
};

const settled = {
  isLoading: false,
  isEmpty: false,
  isFilteredOut: false,
  isTruncated: false,
  error: null,
};

describe('displayNameOf', () => {
  // feliz
  /* Quem procura "o computador da recepção" não sabe que ele se chama RECEPCAO-01. */
  it('prefers the nickname the IT team gave', () => {
    expect(displayNameOf(computer())).toBe('Recepção — balcão');
  });

  // triste
  it('falls back to the machine name when there is no nickname', () => {
    expect(displayNameOf(computer({ displayName: null }))).toBe('RECEPCAO-01');
  });

  it('ignores a nickname made only of spaces', () => {
    expect(displayNameOf(computer({ displayName: '   ' }))).toBe('RECEPCAO-01');
  });
});

describe('AzuosComputerListView — stat card shortcuts and filter bar', () => {
  function renderWithFilter(filter: Partial<ComputerListFilter> = {}) {
    return render(ComputerListView, {
      props: {
        data: { computers: [computer()], total: 1, summary, filter: { ...emptyFilter, ...filter } },
        state: settled,
        actions,
      },
    });
  }

  /* Os filtros além de busca e departamento moram em "Mais filtros", que nasce fechado. */
  async function openMoreFilters() {
    await userEvent.click(screen.getByRole('button', { name: /Mais filtros/ }));
  }

  // feliz
  it('turns the health cards into shortcuts for the health filter', async () => {
    renderWithFilter();

    await userEvent.click(screen.getByRole('button', { name: 'Saúde crítica: filtrar a lista' }));
    expect(actions.onHealthStatusChange).toHaveBeenLastCalledWith('critical');

    await userEvent.click(screen.getByRole('button', { name: 'Em atenção: filtrar a lista' }));
    expect(actions.onHealthStatusChange).toHaveBeenLastCalledWith('attention');
  });

  it('marks the card while its filter is on, and clears it on a second click', async () => {
    renderWithFilter({ healthStatus: 'critical' });

    const card = screen.getByRole('button', { name: 'Saúde crítica: tirar o filtro' });
    expect(card).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(card);
    expect(actions.onHealthStatusChange).toHaveBeenLastCalledWith('');
  });

  it('offers the archived choice as a named filter, not a loose checkbox', async () => {
    renderWithFilter();

    expect(screen.getByText('Arquivadas')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).toBeNull();

    await openMoreFilters();
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar' }));
    expect(actions.onArchivedChange).toHaveBeenLastCalledWith(true);
  });

  // triste
  it('hides the clear button while no filter is on, and shows it once one is', () => {
    const view = renderWithFilter();
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull();
    view.unmount();

    renderWithFilter({ includeArchived: true });
    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument();
  });

  it('does not turn the cards without a matching filter into shortcuts', () => {
    renderWithFilter();

    expect(screen.queryByRole('button', { name: /Máquinas:/ })).toBeNull();
  });

  it('filters by online status from both the card and the connection selector', async () => {
    renderWithFilter();
    await userEvent.click(screen.getByRole('button', { name: 'Online agora: filtrar a lista' }));
    expect(actions.onOnlineChange).toHaveBeenLastCalledWith(true);
    await openMoreFilters();
    await userEvent.click(screen.getByRole('button', { name: 'Online agora' }));
    expect(actions.onOnlineChange).toHaveBeenLastCalledWith(true);
  });

  // feliz
  it('filters the machines that need maintenance from the grouped filters', async () => {
    renderWithFilter();

    expect(screen.getByRole('button', { name: 'Mais filtros' })).toBeInTheDocument();
    await openMoreFilters();
    await userEvent.click(screen.getByRole('button', { name: 'Precisa de manutenção' }));
    expect(actions.onNeedsMaintenanceChange).toHaveBeenLastCalledWith(true);
  });

  // triste
  /* Filtro ligado lá dentro não pode ficar invisível: o título conta, e o bloco nasce aberto. */
  it('announces and opens the grouped filters when the list arrives filtered', () => {
    renderWithFilter({ needsMaintenance: true, onlyOffline: true });

    expect(screen.getByRole('button', { name: 'Mais filtros · 2 ativos' })).toBeInTheDocument();
    /* Aberto sem clique: a pastilha ligada já está à vista. */
    expect(screen.getByRole('button', { name: 'Precisa de manutenção' })).toBeVisible();
  });

  it('marks the online card as selected and lets it clear the filter', async () => {
    renderWithFilter({ onlyOnline: true });
    const card = screen.getByRole('button', { name: 'Online agora: tirar o filtro' });
    expect(card).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(card);
    expect(actions.onOnlineChange).toHaveBeenLastCalledWith(false);
  });

  // feliz
  it('filters offline machines and the alert shortcuts from the cards', async () => {
    renderWithFilter();

    await userEvent.click(screen.getByRole('button', { name: 'Offline: filtrar a lista' }));
    expect(actions.onOfflineChange).toHaveBeenLastCalledWith(true);
    await userEvent.click(screen.getByRole('button', { name: 'CPU elevada: filtrar a lista' }));
    expect(actions.onAlertChange).toHaveBeenLastCalledWith('cpu');
    await userEvent.click(screen.getByRole('button', { name: 'Memória elevada: filtrar a lista' }));
    expect(actions.onAlertChange).toHaveBeenLastCalledWith('memory');
    await userEvent.click(screen.getByRole('button', { name: 'Com alerta ativo: filtrar a lista' }));
    expect(actions.onAlertChange).toHaveBeenLastCalledWith('any');
  });

  // triste
  it('turns the alert filter off when its selected card is clicked again', async () => {
    renderWithFilter({ alert: 'memory' });

    await userEvent.click(screen.getByRole('button', { name: 'Memória elevada: tirar o filtro' }));
    expect(actions.onAlertChange).toHaveBeenLastCalledWith('');
  });
});

describe('AzuosComputerListView', () => {
  // feliz
  it('lists the machines with the nickname and the technical name', () => {
    render(ComputerListView, {
      props: {
        data: { computers: [computer()], total: 1, summary, filter: emptyFilter },
        state: settled,
        actions,
      },
    });

    expect(screen.getAllByText('Recepção — balcão')[0]).toBeInTheDocument();
    expect(screen.getAllByText('RECEPCAO-01')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Online')[0]).toBeInTheDocument();
  });

  it('opens the machine record when asked', async () => {
    const user = userEvent.setup();
    render(ComputerListView, {
      props: {
        data: { computers: [computer()], total: 1, summary, filter: emptyFilter },
        state: settled,
        actions,
      },
    });

    await user.click(screen.getAllByRole('button', { name: 'Ver ficha' })[0]!);

    expect(actions.onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  /* Arquivada e bloqueada vêm antes de online/offline: explicam por que a máquina está
     calada, e sem isso alguém sai procurando defeito onde houve decisão. */
  it('says a machine is blocked instead of just calling it offline', () => {
    render(ComputerListView, {
      props: {
        data: {
          computers: [computer({ isBlocked: true, isOnline: false })],
          total: 1,
          summary,
          filter: emptyFilter,
        },
        state: settled,
        actions,
      },
    });

    /* Só a LINHA da máquina: "Offline" também é o nome do atalho e da opção do filtro. */
    const cards = document.querySelector<HTMLElement>('[data-slot="computer-cards-mobile"]')!;
    expect(within(cards).getAllByText('Bloqueada')[0]).toBeInTheDocument();
    expect(within(cards).queryByText('Offline')).not.toBeInTheDocument();
  });

  // triste
  it('shows the reason when the inventory fails to load', () => {
    render(ComputerListView, {
      props: {
        data: { computers: [], total: 0, summary: null, filter: emptyFilter },
        state: { ...settled, error: 'Não consegui falar com o servidor.' },
        actions,
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Não consegui falar com o servidor.');
  });

  /* Vazio de verdade e filtro sem resultado levam a próximos passos diferentes. */
  it('offers to register the first machine when there is none', () => {
    render(ComputerListView, {
      props: {
        data: { computers: [], total: 0, summary, filter: emptyFilter },
        state: { ...settled, isEmpty: true },
        actions,
      },
    });

    expect(screen.getByText('Nenhum computador cadastrado')).toBeInTheDocument();
  });

  it('offers to clear the filters when they hid everything', () => {
    render(ComputerListView, {
      props: {
        data: { computers: [], total: 0, summary, filter: { ...emptyFilter, search: 'xyz' } },
        state: { ...settled, isFilteredOut: true },
        actions,
      },
    });

    expect(screen.getByText('Nenhum computador com esses filtros')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument();
  });

  /* Truncar calado é mentir sobre o tamanho do parque. */
  it('says the list was cut instead of hiding it', () => {
    render(ComputerListView, {
      props: {
        data: { computers: [computer()], total: 240, summary, filter: emptyFilter },
        state: { ...settled, isTruncated: true },
        actions,
      },
    });

    expect(screen.getByText(/Mostrando 1 de 240 computadores/)).toBeInTheDocument();
  });

  it('does not announce an empty inventory while it is still loading', () => {
    render(ComputerListView, {
      props: {
        data: { computers: [], total: 0, summary: null, filter: emptyFilter },
        state: { ...settled, isLoading: true },
        actions,
      },
    });

    expect(screen.getByText('Carregando os computadores…')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum computador cadastrado')).not.toBeInTheDocument();
  });
});


describe('AzuosComputerListView maintenance parity', () => {
  it('shows preventive and critical signals in both cards and table, even at 100 points', () => {
    const { container } = render(ComputerListView, { props: {
      data: { computers: [computer({ activeAlerts: 2, preventiveStatus: 'due', lastPreventiveAt: '2020-01-01T12:00:00.000Z' })],
        total: 1, summary, filter: emptyFilter }, state: settled, actions,
    } });
    for (const slot of ['computer-cards-mobile', 'computer-table-desktop']) {
      const section = container.querySelector(`[data-slot="${slot}"]`) as HTMLElement;
      expect(within(section).getByText('Preventiva vencida')).toBeInTheDocument();
      expect(within(section).getByText('2 alertas críticos ativos')).toBeInTheDocument();
      expect(within(section).getByText('100/100')).toBeInTheDocument();
    }
  });
});

describe('advancedFilterCount', () => {
  // feliz
  it('counts each grouped filter that is on, online and offline as one', () => {
    expect(
      advancedFilterCount({ ...emptyFilter, onlyOffline: true, needsMaintenance: true, kind: 'notebook' }),
    ).toBe(3);
  });

  // triste
  it('ignores search and department, which stay in sight', () => {
    expect(advancedFilterCount({ ...emptyFilter, search: 'recepção', department: 'RH' })).toBe(0);
  });
});
