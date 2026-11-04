import { type Computer } from '@template/shared/schemas/computer.schema';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DisposalListView, {
  machineLabelOf,
  type DisposalFilter,
  type DisposalSummary,
} from './azuos-disposal-list-view.svelte';
import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';

const GB = 1024 ** 3;

function computer(over: Partial<Computer> = {}): Computer {
  return {
    id: 9,
    name: 'RECEPCAO-09',
    displayName: 'Recepção — micro antigo do balcão',
    responsibleName: 'Bia Costa',
    department: 'recepcao',
    kind: 'desktop',
    hardware: {
      os: 'Microsoft Windows 10 Pro',
      platform: 'windows',
      platformVersion: null,
      kernelVersion: null,
      arch: 'amd64',
      cpuModel: 'Intel Core i3-3220',
      logicalCpus: 4,
      physicalCpus: 2,
      totalMemoryBytes: 4 * GB,
      macAddress: null,
      localIp: null,
      totalDiskBytes: 120 * GB,
      freeDiskBytes: 30 * GB,
      uptimeSeconds: null,
      bootTime: null,
    },
    healthScore: 88,
    healthStatus: 'attention',
    warnings: [],
    isOnline: false,
    lastSeenAt: '2026-03-01T12:00:00.000Z',
    agentVersion: '0.9.0',
    isArchived: false,
    isBlocked: false,
    blockReason: null,
    disposedAt: '2026-08-09T12:00:00.000Z',
    disposalType: 'defect',
    disposalReason: 'Fonte queimada duas vezes no mesmo semestre.',
    createdAt: '2026-05-01T12:00:00.000Z',
    createdBy: 'suporte@azuos.local',
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

const summary: DisposalSummary = { total: 2, defect: 1, scrap: 1 };

const emptyFilter: DisposalFilter = { search: '', type: '' };

const actions = {
  onSearchChange: vi.fn(),
  onTypeChange: vi.fn(),
  onClearFilters: vi.fn(),
  onRetry: vi.fn(),
  onOpenMachine: vi.fn(),
  onAskRestore: vi.fn(),
  onCancelRestore: vi.fn(),
  onConfirmRestore: vi.fn(),
};

const settled: {
  isLoading: boolean;
  isEmpty: boolean;
  isFilteredOut: boolean;
  error: string | null;
} = { isLoading: false, isEmpty: false, isFilteredOut: false, error: null };

function renderView(
  over: {
    computers?: Computer[];
    restoring?: Computer | null;
    state?: Partial<typeof settled> & { actionError?: string | null; isRestoring?: boolean };
  } = {},
) {
  return render(DisposalListView, {
    props: {
      data: {
        computers: over.computers ?? [computer()],
        total: over.computers?.length ?? 1,
        summary,
        filter: emptyFilter,
        restoring: over.restoring ?? null,
      },
      state: { ...settled, ...over.state },
      actions,
    },
  });
}

/* Em "só cards" a tabela some de vez, em qualquer largura: nem a classe `xl:block` fica. */
function hasCardsOnlyTable(): boolean {
  return Array.from(document.querySelectorAll('.overflow-x-auto')).some(
    (element) => element.classList.contains('hidden') && !element.classList.contains('xl:block'),
  );
}

describe('machineLabelOf', () => {
  // feliz
  it('prefers the nickname the IT team gave', () => {
    expect(machineLabelOf(computer())).toBe('Recepção — micro antigo do balcão');
  });

  // triste
  it('falls back to the machine name when there is no nickname', () => {
    expect(machineLabelOf(computer({ displayName: null }))).toBe('RECEPCAO-09');
  });
});

describe('AzuosDisposalListView — stat card shortcuts and filter bar', () => {
  function renderWithFilter(filter: Partial<DisposalFilter> = {}) {
    return render(DisposalListView, {
      props: {
        data: {
          computers: [computer()],
          total: 1,
          summary,
          filter: { ...emptyFilter, ...filter },
          restoring: null,
        },
        state: settled,
        actions,
      },
    });
  }

  // feliz
  it('turns the defect and scrap cards into shortcuts for the type filter', async () => {
    renderWithFilter();

    await userEvent.click(
      screen.getByRole('button', { name: /^Com defeito .+: filtrar a lista$/ }),
    );
    expect(actions.onTypeChange).toHaveBeenLastCalledWith('defect');

    await userEvent.click(screen.getByRole('button', { name: /^Lixo .+: filtrar a lista$/ }));
    expect(actions.onTypeChange).toHaveBeenLastCalledWith('scrap');
  });

  it('marks the card while its filter is on, and clears it on a second click', async () => {
    renderWithFilter({ type: 'scrap' });

    const card = screen.getByRole('button', { name: /^Lixo .+: tirar o filtro$/ });
    expect(card).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(card);
    expect(actions.onTypeChange).toHaveBeenLastCalledWith('');
  });

  it('names the filter and offers to clear it once it is on', () => {
    renderWithFilter({ type: 'defect' });

    expect(screen.getByText('Tipo de descarte')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument();
  });

  // triste
  it('does not turn the total card into a shortcut, and hides the clear button with no filter', () => {
    renderWithFilter();

    expect(screen.queryByRole('button', { name: /Máquinas fora de uso/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull();
  });
});

describe('AzuosDisposalListView', () => {
  // feliz
  /* A tela existe para responder "o que saiu, e por quê" — o motivo é a coluna principal. */
  it('shows why each machine left, and when', () => {
    renderView();

    /* Dentro da TABELA: "Com defeito" também é o rótulo de um dos cartões do topo, e o que
       este teste precisa provar é a linha da máquina. */
    const list = within(screen.getByRole('table'));

    expect(list.getByText('Fonte queimada duas vezes no mesmo semestre.')).toBeInTheDocument();
    expect(list.getByText('Com defeito')).toBeInTheDocument();
    expect(list.getByText('09/08/2026')).toBeInTheDocument();
  });

  it('asks before putting a machine back, saying what changes', async () => {
    const user = userEvent.setup();
    renderView({ restoring: computer() });

    const dialog = screen.getByRole('dialog');

    expect(within(dialog).getByText(/o motivo do descarte é apagado/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Voltar ao inventário' }));

    expect(actions.onConfirmRestore).toHaveBeenCalled();
  });

  // triste
  /* Nada descartado é boa notícia, e o texto diz ONDE a ação acontece — descartar é na
     ficha da máquina, não aqui. */
  it('explains where disposal happens when the list is empty', () => {
    renderView({ computers: [], state: { isEmpty: true } });

    expect(screen.getByText('Nenhuma máquina descartada')).toBeInTheDocument();
    expect(screen.getByText(/pela ficha dele, no Inventário/)).toBeInTheDocument();
  });

  it('offers to clear the filters when they hid everything', () => {
    renderView({ computers: [], state: { isFilteredOut: true } });

    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument();
  });

  it('shows the reason the list did not load', () => {
    renderView({ computers: [], state: { error: 'Não consegui falar com o servidor.' } });

    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('Não consegui falar com o servidor.');
  });

  it('keeps the failure of a restore on screen, with the reason', () => {
    renderView({ state: { actionError: 'Você não tem permissão para alterar o cadastro.' } });

    expect(screen.getAllByRole('alert')[0]).toHaveTextContent(
      'Você não tem permissão para alterar o cadastro.',
    );
  });

  it('does not announce an empty list while it is still loading', () => {
    renderView({ computers: [], state: { isLoading: true } });

    expect(screen.getByText('Carregando o que saiu de uso…')).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma máquina descartada')).not.toBeInTheDocument();
  });
});

describe('AzuosDisposalListView — search, type filter, rows and the restore dialog', () => {
  // feliz
  it('searches and filters by the type of disposal', async () => {
    const user = userEvent.setup();
    renderView();
    await user.type(screen.getByRole('textbox', { name: 'Buscar' }), 'r');
    expect(actions.onSearchChange).toHaveBeenCalledWith('r');
    const group = screen.getByRole('group', { name: 'Filtrar por tipo de descarte' });
    await user.click(within(group).getAllByRole('button')[1]!);
    expect(actions.onTypeChange).toHaveBeenCalled();
  });

  // feliz
  it('opens the record and asks to restore from the cards and from the table', async () => {
    const user = userEvent.setup();
    vi.mocked(actions.onOpenMachine).mockClear();
    vi.mocked(actions.onAskRestore).mockClear();
    renderView({
      computers: [
        computer({ department: null, disposalType: null, disposalReason: null, displayName: null }),
      ],
    });

    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    const opens = screen.getAllByRole('button', { name: 'Ver ficha' });
    const restores = screen.getAllByRole('button', { name: 'Voltar ao inventário' });
    for (const button of opens) await user.click(button);
    for (const button of restores) await user.click(button);
    expect(actions.onOpenMachine).toHaveBeenCalledTimes(opens.length);
    expect(actions.onAskRestore).toHaveBeenCalledTimes(restores.length);
  });

  // triste
  it('cancels the restore from the dialog', async () => {
    const user = userEvent.setup();
    renderView({ restoring: computer() });
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(actions.onCancelRestore).toHaveBeenCalled();
  });
});

describe('disposal-list-view — cards only', () => {
  // feliz
  it('hides the table completely when the person asked for cards only', () => {
    const tableView = useTableViewModel();
    tableView.actions.onToggle();
    try {
      renderView();

      expect(hasCardsOnlyTable()).toBe(true);
    } finally {
      tableView.actions.onToggle();
    }
  });
});

/* Quem pediu menos movimento ao sistema recebe a rolagem seca, sem deslizar. */
function stubReducedMotion() {
  const original = window.matchMedia;
  /* Só a consulta de movimento muda: as de largura seguem como estão, para a tela não virar celular. */
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;

  return () => {
    window.matchMedia = original;
  };
}

describe('AzuosDisposalListView — reduced motion', () => {
  // feliz
  it('scrolls to the filters without animation when the person prefers less motion', async () => {
    const restore = stubReducedMotion();
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    try {
      renderView();

      await userEvent.click(
        screen.getByRole('button', { name: /^Com defeito .+: filtrar a lista$/ }),
      );

      expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }));
    } finally {
      restore();
    }
  });
});
