import { type HistoryEntry } from '@template/shared/schemas/history.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { EMPTY_HISTORY_FILTER } from '$lib/hooks/use-history/use-history.svelte';
import HistoryView, {
  changeLineOf,
  entryTitleOf,
  formatHistoryDateTime,
  hasHistoryFilter,
  targetOptionsOf,
  type AzuosHistoryViewProps,
} from './azuos-history-view.svelte';

function entry(over: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: '1',
    action: 'maintenances.update',
    kind: 'updated',
    target: { type: 'maintenances', id: '12', label: null },
    changes: [{ field: 'performedByIds', from: null, to: 'u-caio' }],
    actor: { id: 'u-caio', name: 'Caio Reis' },
    occurredAt: '2026-11-20T13:00:00.000Z',
    ...over,
  };
}

function renderView(over: Partial<AzuosHistoryViewProps> = {}) {
  const actions = {
    onFilterChange: vi.fn(),
    onClearFilters: vi.fn(),
    onPageChange: vi.fn(),
    onRetry: vi.fn(),
  };
  render(HistoryView, {
    props: {
      data: { module: 'infra', entries: [entry()], filter: EMPTY_HISTORY_FILTER, page: 1, pageSize: 50, total: 1 },
      state: { isLoading: false, isFetching: false, error: null },
      actions,
      ...over,
    },
  });

  return actions;
}

describe('AzuosHistoryView', () => {
  // feliz
  it('shows each change with who did it, when and what changed', () => {
    renderView();

    expect(screen.getByRole('heading', { name: 'Histórico' })).toBeInTheDocument();
    expect(screen.getByText('Alterou · Manutenção nº 12')).toBeInTheDocument();
    expect(screen.getByText('Caio Reis')).toBeInTheDocument();
    expect(screen.getByText('performedByIds: — → u-caio')).toBeInTheDocument();
  });

  // feliz
  it('narrows to what the person did', async () => {
    const actions = renderView();

    await userEvent.click(screen.getByRole('button', { name: 'O que eu fiz' }));

    expect(actions.onFilterChange).toHaveBeenCalledWith({ who: 'mine' });
  });

  // triste
  it('tells it is empty, and offers to clear the filter that hid everything', async () => {
    const actions = renderView({
      data: {
        module: 'infra',
        entries: [],
        filter: { ...EMPTY_HISTORY_FILTER, who: 'mine' },
        page: 1,
        pageSize: 50,
        total: 0,
      },
    });

    expect(screen.getByText('Nada no histórico com estes filtros')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Limpar filtros/ }));
    expect(actions.onClearFilters).toHaveBeenCalledOnce();
  });

  // triste
  it('says why it did not load and tries again', async () => {
    const actions = renderView({ state: { isLoading: false, isFetching: false, error: 'Serviço fora do ar.' } });

    expect(screen.getByText('Serviço fora do ar.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }));
    expect(actions.onRetry).toHaveBeenCalledOnce();
  });

  // triste
  it('shows the skeleton while it loads, and the machine as "Sistema"', () => {
    renderView({ state: { isLoading: true, isFetching: true, error: null } });

    expect(screen.getByLabelText('Carregando o histórico')).toHaveAttribute('aria-busy', 'true');
  });
});

describe('the history helpers', () => {
  // feliz
  it('names the action with the target the person saw', () => {
    expect(entryTitleOf(entry({ kind: 'created', target: { type: 'tickets', id: '7', label: 'CH-7' } }))).toBe(
      'Cadastrou · Chamado CH-7',
    );
    expect(changeLineOf({ field: 'Situação', from: 'Aberto', to: 'Resolvido' })).toBe('Situação: Aberto → Resolvido');
    expect(formatHistoryDateTime('2026-11-20T13:00:00.000Z')).toMatch(/^20\/11\/2026 às /);
  });

  // triste
  it('falls back when the target has no name, the date is broken or nothing is filtered', () => {
    expect(entryTitleOf(entry({ target: { type: null, id: null, label: null } }))).toBe('Alterou · Registro');
    expect(formatHistoryDateTime('ontem')).toBe('—');
    expect(hasHistoryFilter(EMPTY_HISTORY_FILTER)).toBe(false);
  });

  // feliz
  it('offers only the types of the module, with "all" first', () => {
    const options = targetOptionsOf('manutencao').map((option) => option.value);

    expect(options[0]).toBe('');
    expect(options).toContain('inventory-items');
    expect(options).not.toContain('computers');
  });
});
