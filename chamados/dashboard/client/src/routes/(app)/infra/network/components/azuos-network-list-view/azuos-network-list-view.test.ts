import {
  type NetworkEvent,
  type NetworkSummary,
} from '@template/shared/schemas/network-event.schema';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import NetworkListView, {
  durationLabelOf,
  measuresOf,
  type NetworkFilter,
} from './azuos-network-list-view.svelte';
import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';

function event(over: Partial<NetworkEvent> = {}): NetworkEvent {
  return {
    id: 1,
    occurredAt: '2026-09-23T12:00:00.000Z',
    type: 'wan_down',
    severity: 'critical',
    title: 'WAN Offline',
    message: 'O link principal parou de responder.',
    linkName: 'WAN1',
    provider: 'Link principal',
    latencyMs: null,
    packetLossPercent: null,
    source: 'UniFi',
    resolvedAt: null,
    resolvedBy: null,
    createdAt: '2026-09-23T12:00:05.000Z',
    ...over,
  };
}

const summary: NetworkSummary = {
  days: 30,
  open: 2,
  outages: 3,
  totalOutageSeconds: 5400,
  worstLatencyMs: 320,
  worstPacketLossPercent: 8.1,
};

const emptyFilter: NetworkFilter = { type: '', severity: '', onlyOpen: false, days: 30 };

const actions = {
  onTypeChange: vi.fn(),
  onSeverityChange: vi.fn(),
  onOnlyOpenChange: vi.fn(),
  onPeriodChange: vi.fn(),
  onClearFilters: vi.fn(),
  onRetry: vi.fn(),
  onResolveChange: vi.fn(),
};

const settled: {
  isLoading: boolean;
  isEmpty: boolean;
  isFilteredOut: boolean;
  isTruncated: boolean;
  error: string | null;
} = { isLoading: false, isEmpty: false, isFilteredOut: false, isTruncated: false, error: null };

function renderView(
  over: {
    events?: NetworkEvent[];
    state?: Partial<typeof settled> & { actionError?: string | null };
  } = {},
) {
  return render(NetworkListView, {
    props: {
      data: {
        events: over.events ?? [event()],
        total: over.events?.length ?? 1,
        summary,
        filter: emptyFilter,
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

describe('durationLabelOf', () => {
  // feliz
  it('says how long the internet was out', () => {
    expect(durationLabelOf(event({ resolvedAt: '2026-09-23T12:42:00.000Z' }))).toBe('42 min');
  });

  // triste
  /* Sem fim, o problema está ACONTECENDO — e "0 min" diria que já passou. */
  it('says a problem with no end is still open', () => {
    expect(durationLabelOf(event())).toBe('Em aberto');
  });
});

describe('measuresOf', () => {
  // feliz
  it('reads the numbers that came with the alert', () => {
    expect(measuresOf(event({ latencyMs: 320.4, packetLossPercent: 8.14 }))).toBe(
      '320 ms · 8,1% de perda',
    );
  });

  // triste
  /* Nem todo aviso traz número: uma queda é uma queda, sem latência para medir. */
  it('is empty when the alert brought no number', () => {
    expect(measuresOf(event())).toBe('');
  });
});

describe('AzuosNetworkListView — stat card shortcuts and filter bar', () => {
  function renderWithFilter(filter: Partial<NetworkFilter> = {}) {
    return render(NetworkListView, {
      props: {
        data: { events: [event()], total: 1, summary, filter: { ...emptyFilter, ...filter } },
        state: settled,
        actions,
      },
    });
  }

  // feliz
  it('turns "open now" into a shortcut for the only-open filter', async () => {
    renderWithFilter();

    await userEvent.click(
      screen.getByRole('button', { name: /^Em aberto agora .+: filtrar a lista$/ }),
    );

    expect(actions.onOnlyOpenChange).toHaveBeenLastCalledWith(true);
  });

  it('turns "outages" into a shortcut for the outage type, and clears it on a second click', async () => {
    renderWithFilter({ type: 'wan_down' });

    const card = screen.getByRole('button', { name: /^Quedas no período .+: tirar o filtro$/ });
    expect(card).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(card);
    expect(actions.onTypeChange).toHaveBeenLastCalledWith('');
  });

  it('offers the only-open choice as a named filter, not a loose checkbox', async () => {
    renderWithFilter();

    expect(screen.getByText('Andamento')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Só em aberto' }));
    expect(actions.onOnlyOpenChange).toHaveBeenLastCalledWith(true);
  });

  // triste
  it('hides the clear button while no filter is on, and shows it once one is', () => {
    const view = renderWithFilter();
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull();
    view.unmount();

    renderWithFilter({ onlyOpen: true });
    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument();
  });

  it('does not turn the measurement cards into shortcuts', () => {
    renderWithFilter();

    expect(screen.queryByRole('button', { name: /Tempo fora do ar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Pior latência/ })).toBeNull();
  });
});

describe('AzuosNetworkListView', () => {
  // feliz
  it('shows what happened, on which link and how bad it was', () => {
    renderView();

    const list = within(screen.getByRole('table'));

    expect(list.getByText('Internet caiu')).toBeInTheDocument();
    expect(list.getByText('WAN1')).toBeInTheDocument();
    expect(list.getByText('Grave')).toBeInTheDocument();
  });

  it('marks an open event as resolved', async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getAllByRole('button', { name: 'Marcar como resolvido' })[0]!);

    expect(actions.onResolveChange).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), true);
  });

  /* Resolver não apaga: o evento continua no histórico e pode ser reaberto. */
  it('offers to reopen an event that was already resolved', () => {
    renderView({ events: [event({ resolvedAt: '2026-09-23T12:42:00.000Z' })] });

    expect(screen.getAllByRole('button', { name: 'Reabrir' })[0]).toBeInTheDocument();
  });

  // triste
  /* O silêncio não é notícia boa: o texto diz DE ONDE os eventos vêm. */
  it('explains where events come from when there is none', () => {
    renderView({ events: [], state: { isEmpty: true } });

    expect(screen.getByText('Nenhum evento no período')).toBeInTheDocument();
    expect(screen.getByText(/chegam do UniFi/)).toBeInTheDocument();
  });

  it('offers to clear the filters when they hid everything', () => {
    renderView({ events: [], state: { isFilteredOut: true } });

    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument();
  });

  it('shows the reason the list did not load', () => {
    renderView({ events: [], state: { error: 'Não consegui falar com o servidor.' } });

    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('Não consegui falar com o servidor.');
  });

  it('does not announce an empty period while it is still loading', () => {
    renderView({ events: [], state: { isLoading: true } });

    expect(screen.getByText('Carregando os eventos…')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum evento no período')).not.toBeInTheDocument();
  });
});

describe('AzuosNetworkListView — period, filters, rows and the cut list', () => {
  async function chooseSecond(user: ReturnType<typeof userEvent.setup>, label: string) {
    const group = screen.queryByRole('group', { name: label });
    if (group) {
      await user.click(within(group).getAllByRole('button')[1]!);
      return;
    }
    await user.click(screen.getByRole('button', { name: label }));
    const popup = [...document.querySelectorAll('[data-slot="popover-content"]')].at(
      -1,
    ) as HTMLElement;
    await user.click(within(popup).getAllByRole('button', { hidden: true })[1]!);
  }

  // feliz
  it('changes the period, the type and the severity', async () => {
    const user = userEvent.setup();
    renderView();
    await chooseSecond(user, 'Período');
    expect(actions.onPeriodChange).toHaveBeenCalledWith(expect.any(Number));
    await chooseSecond(user, 'Filtrar por tipo de aviso');
    expect(actions.onTypeChange).toHaveBeenCalled();
    await chooseSecond(user, 'Filtrar por gravidade');
    expect(actions.onSeverityChange).toHaveBeenCalled();
  });

  // feliz
  it('reopens from the table and shows an event without link, message or measures', async () => {
    const user = userEvent.setup();
    vi.mocked(actions.onResolveChange).mockClear();
    renderView({
      events: [event({ resolvedAt: '2026-09-23T12:42:00.000Z', linkName: null, message: null })],
      state: { isTruncated: true, actionError: 'Sem permissão.' },
    });
    expect(screen.getAllByText('—').length).toBeGreaterThan(1);
    expect(screen.getByText(/Mostrando 1 de 1 eventos/)).toBeInTheDocument();
    expect(screen.getByText('Sem permissão.')).toBeInTheDocument();
    const reopen = screen.getAllByRole('button', { name: 'Reabrir' });
    for (const button of reopen) await user.click(button);
    expect(actions.onResolveChange).toHaveBeenCalledTimes(reopen.length);
    expect(actions.onResolveChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 1 }),
      false,
    );
  });

  // triste
  it('shows dashes while the summary has no numbers', () => {
    render(NetworkListView, {
      props: {
        data: { events: [event()], total: 1, summary: null, filter: emptyFilter },
        state: { ...settled, isSummaryLoading: true } as never,
        actions,
      },
    });
    expect(screen.getByText('Pior latência')).toBeInTheDocument();
  });
});

describe('AzuosNetworkListView — the outage shortcut switched off and the table button', () => {
  // feliz
  it('turns the outage filter off on a second click, scrolling without motion, and resolves from the table', async () => {
    const matchMedia = window.matchMedia;
    window.matchMedia = ((query: string) =>
      ({
        matches: true,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList) as typeof window.matchMedia;
    try {
      vi.mocked(actions.onTypeChange).mockClear();
      vi.mocked(actions.onResolveChange).mockClear();
      render(NetworkListView, {
        props: {
          data: {
            events: [event()],
            total: 1,
            summary,
            filter: { ...emptyFilter, type: 'wan_down' },
          },
          state: settled,
          actions,
        },
      });

      await userEvent.click(screen.getByRole('button', { name: /Quedas no período/ }));
      expect(actions.onTypeChange).toHaveBeenCalledWith('');
      const resolves = screen.getAllByRole('button', { name: 'Marcar como resolvido' });
      for (const button of resolves) await userEvent.click(button);
      expect(actions.onResolveChange).toHaveBeenCalledTimes(resolves.length);
    } finally {
      window.matchMedia = matchMedia;
    }
  });
});

describe('network-list-view — cards only', () => {
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
