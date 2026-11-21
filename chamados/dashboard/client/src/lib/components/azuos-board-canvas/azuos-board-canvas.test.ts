import { type Widget } from '@template/shared/schemas/dashboard-board.schema';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import BoardCanvas, { hintOf } from './azuos-board-canvas.svelte';

const WIDGET: Widget = {
  id: 'a',
  kind: 'column',
  title: 'Chamados por situação',
  source: 'infraTickets',
  groupBy: 'status',
  splitBy: null,
  filterId: null,
  onlyMine: false,
  period: '30d',
  window: null,
};

function renderCanvas(isEditing: boolean) {
  const actions = { onLayoutChange: vi.fn(), onEditWidget: vi.fn(), onRemoveWidget: vi.fn() };
  render(BoardCanvas, {
    props: {
      data: { widgets: [WIDGET], layout: [{ i: 'a', x: 0, y: 0, w: 2, h: 2 }], results: {} },
      state: { isEditing },
      actions,
    },
  });

  return actions;
}

describe('hintOf', () => {
  // feliz
  it('says the period, the saved filter, "only mine" and, while building, the weight', () => {
    expect(hintOf({ ...WIDGET, filterId: 'f1', onlyMine: true }, { f1: 'Urgentes' }, null, true)).toBe(
      'Últimos 30 dias · Urgentes · Só os meus · 2 pontos',
    );
  });

  // triste
  it('says nothing for a block of the whole period, without filter', () => {
    expect(hintOf({ ...WIDGET, period: 'all' })).toBeNull();
  });
});

describe('AzuosBoardCanvas', () => {
  // feliz
  it('lets whoever builds edit, remove and move a block with the keyboard', async () => {
    const actions = renderCanvas(true);

    await fireEvent.click(screen.getByRole('button', { name: 'Editar o bloco Chamados por situação' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Tirar o bloco Chamados por situação' }));
    await fireEvent.keyDown(screen.getByRole('button', { name: /Mover o bloco/ }), { key: 'ArrowRight' });

    expect(actions.onEditWidget).toHaveBeenCalledWith('a');
    expect(actions.onRemoveWidget).toHaveBeenCalledWith('a');
    expect(actions.onLayoutChange).toHaveBeenCalledWith([{ i: 'a', x: 1, y: 0, w: 2, h: 2 }]);
  });

  // triste
  it('only shows the blocks to whoever is just looking', () => {
    renderCanvas(false);

    expect(screen.getByText('Chamados por situação')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar o bloco/ })).not.toBeInTheDocument();
  });
});
