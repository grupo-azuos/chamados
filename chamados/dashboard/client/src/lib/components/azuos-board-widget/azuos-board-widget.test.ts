import { type Widget } from '@template/shared/schemas/dashboard-board.schema';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import BoardWidget from './azuos-board-widget.svelte';

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
    { key: 'Em aberto', label: 'Em aberto', value: 6 },
    { key: 'Resolvido', label: 'Resolvido', value: 3 },
  ],
  cells: [],
};

function renderWidget(widget: Widget, result: Parameters<typeof BoardWidget>[1]['data']['result']) {
  render(BoardWidget, { props: { data: { widget, result, noun: 'chamados', hint: 'Últimos 30 dias' } } });
}

describe('AzuosBoardWidget', () => {
  // feliz
  it('shows the title, the hint and one card per group', () => {
    renderWidget(WIDGET, { data: DATA, isLoading: false, error: null });

    expect(screen.getByText('Chamados')).toBeInTheDocument();
    expect(screen.getByText('Últimos 30 dias')).toBeInTheDocument();
    expect(screen.getByText('Em aberto')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  // feliz
  it('shows the total when the cards do not group', () => {
    renderWidget({ ...WIDGET, groupBy: null }, { data: DATA, isLoading: false, error: null });

    expect(screen.getByText('9')).toBeInTheDocument();
  });

  // triste
  it('says it is counting while the numbers have not come', () => {
    renderWidget({ ...WIDGET, kind: 'column', groupBy: 'status' }, { data: null, isLoading: true, error: null });

    expect(screen.getByText('Contando…')).toBeInTheDocument();
  });

  // triste
  it('shows the refusal in red, with the reason', () => {
    renderWidget({ ...WIDGET, kind: 'donut', groupBy: 'status' }, { data: null, isLoading: false, error: 'O filtro está arquivado.' });

    expect(screen.getByRole('alert')).toHaveTextContent('O filtro está arquivado.');
  });

  // triste
  it('says there is nothing to count only after the count came back empty', () => {
    renderWidget(
      { ...WIDGET, kind: 'list', groupBy: 'status' },
      { data: { total: 0, grandTotal: 0, series: [], cells: [] }, isLoading: false, error: null },
    );

    expect(screen.getByText('Nada para contar aqui')).toBeInTheDocument();
  });
});
