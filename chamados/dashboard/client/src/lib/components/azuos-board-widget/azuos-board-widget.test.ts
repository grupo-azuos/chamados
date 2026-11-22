import { type Widget } from '@template/shared/schemas/dashboard-board.schema';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import BoardWidget, { measureOf, scopeChipsOf } from './azuos-board-widget.svelte';

const WIDGET: Widget = {
  id: 'w1',
  kind: 'stats',
  title: 'Chamados',
  source: 'infraTickets',
  groupBy: 'open',
  splitBy: null,
  filterId: null,
  onlyMine: false,
  period: 'all',
  window: null,
};

const DATA = {
  total: 9,
  grandTotal: 12,
  series: [
    { key: 'open', label: 'Em aberto', value: 6 },
    { key: 'done', label: 'Resolvido', value: 3 },
  ],
  cells: [],
};

type Result = { data: typeof DATA | null; isLoading: boolean; error: string | null };

function renderWidget(
  widget: Widget,
  result: Result,
  options: { isEditing?: boolean; filterName?: string | null } = {},
) {
  const actions = { onEdit: vi.fn(), onRemove: vi.fn(), onChangeKind: vi.fn(), onOpenItem: vi.fn() };
  render(BoardWidget, {
    props: {
      data: { widget, result, filterName: options.filterName ?? null },
      state: { isEditing: options.isEditing ?? false },
      actions,
    },
  });

  return actions;
}

describe('AzuosBoardWidget', () => {
  // feliz
  it('shows one card per group, and a click on a card opens the list of that group', async () => {
    const actions = renderWidget(WIDGET, { data: DATA, isLoading: false, error: null });

    expect(screen.getByText('Em aberto')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: /^Em aberto 6/ }));
    expect(actions.onOpenItem).toHaveBeenCalledWith(WIDGET, { key: 'open', label: 'Em aberto' });
  });

  // feliz
  it('shows the total under the block title when the cards do not group', () => {
    renderWidget({ ...WIDGET, groupBy: null }, { data: DATA, isLoading: false, error: null });

    expect(screen.getByText('9')).toBeInTheDocument();
  });

  // feliz
  it('heads a chart with what it counts and the cut in chips', () => {
    renderWidget(
      { ...WIDGET, kind: 'column', groupBy: 'status', period: '30d', onlyMine: true, filterId: 'f1' },
      { data: DATA, isLoading: false, error: null },
      { filterName: 'Só os urgentes' },
    );

    expect(screen.getByRole('heading', { name: 'Chamados' })).toBeInTheDocument();
    expect(screen.getByText(/^Contagem de chamados por /)).toBeInTheDocument();
    expect(screen.getByText('9 chamados')).toBeInTheDocument();
    expect(screen.getByText('Só os meus')).toBeInTheDocument();
    expect(screen.getByText('Só os urgentes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu de Chamados' })).toBeInTheDocument();
  });

  // feliz
  it('gets the drag handle, the weight and the tools while the board is being built', async () => {
    const actions = renderWidget(
      { ...WIDGET, kind: 'column', groupBy: 'status' },
      { data: DATA, isLoading: false, error: null },
      { isEditing: true },
    );

    expect(screen.getByRole('button', { name: 'Arrastar Chamados' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Peso:/)).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Configurar Chamados' }));
    expect(actions.onEdit).toHaveBeenCalledWith('w1');
    expect(screen.queryByRole('button', { name: 'Menu de Chamados' })).toBeNull();
    /* O bloco aparece como no painel: a barra flutua acima, fora do cabeçalho. */
    expect(screen.getByRole('heading', { name: 'Chamados' }).closest('header')).not.toContainElement(
      screen.getByRole('button', { name: 'Configurar Chamados' }),
    );
  });

  // triste
  it('asks before removing a block: the first click only arms the trash can', async () => {
    const actions = renderWidget(
      { ...WIDGET, kind: 'column', groupBy: 'status' },
      { data: DATA, isLoading: false, error: null },
      { isEditing: true },
    );

    await fireEvent.click(screen.getByRole('button', { name: 'Remover Chamados' }));
    expect(actions.onRemove).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('button', { name: 'Remover?' }));
    expect(actions.onRemove).toHaveBeenCalledWith('w1');
  });

  // triste
  it('shows the refusal in red, with the reason', () => {
    renderWidget(
      { ...WIDGET, kind: 'donut', groupBy: 'status' },
      { data: null, isLoading: false, error: 'O filtro está arquivado.' },
    );

    expect(screen.getByRole('alert')).toHaveTextContent('O filtro está arquivado.');
  });

  // triste
  it('says there is no data when grouped cards have no group at all', () => {
    renderWidget(WIDGET, {
      data: { total: 0, grandTotal: 0, series: [], cells: [] },
      isLoading: false,
      error: null,
    });

    expect(screen.getByRole('status')).toHaveTextContent('Sem dados para mostrar neste recorte.');
  });

  // triste
  it('describes a block without groups and without any cut in a single phrase', () => {
    expect(measureOf({ ...WIDGET, groupBy: null })).toBe('Contagem de chamados');
    expect(
      scopeChipsOf({
        widget: { ...WIDGET, groupBy: null },
        result: { data: null, isLoading: true, error: null },
        filterName: null,
      }),
    ).toEqual([]);
  });
});
