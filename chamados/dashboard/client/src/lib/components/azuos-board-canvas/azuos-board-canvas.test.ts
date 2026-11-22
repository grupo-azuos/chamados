import { type Widget } from '@template/shared/schemas/dashboard-board.schema';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import BoardCanvas, { KIND_DRAG_TYPE, kindDragTypeOf, kindOf } from './azuos-board-canvas.svelte';

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

function renderCanvas(isEditing: boolean, widgets: Widget[] = [WIDGET]) {
  const actions = {
    onLayoutChange: vi.fn(),
    onEditWidget: vi.fn(),
    onRemoveWidget: vi.fn(),
    onChangeKind: vi.fn(),
    onDropKind: vi.fn(),
  };
  const { container } = render(BoardCanvas, {
    props: {
      data: {
        widgets,
        layout: widgets.map((widget) => ({ i: widget.id, x: 0, y: 0, w: 2, h: 2 })),
        results: {},
        filterNames: {},
      },
      state: { isEditing, canDrop: true },
      actions,
    },
  });

  return { actions, container };
}

/** Um `dataTransfer` de mentira: o jsdom não tem o do navegador. */
function transferOf(kind: Widget['kind'] | null) {
  const types = kind ? [KIND_DRAG_TYPE, kindDragTypeOf(kind)] : ['Files'];

  return { types, getData: (type: string) => (kind && type === KIND_DRAG_TYPE ? kind : ''), dropEffect: 'none' };
}

describe('kindOf', () => {
  // feliz
  it('reads the dragged block kind from the data, or from the format name while passing over', () => {
    expect(kindOf({ dataTransfer: transferOf('donut') as unknown as DataTransfer })).toBe('donut');
    const passing = { types: [kindDragTypeOf('list')], getData: () => '' };
    expect(kindOf({ dataTransfer: passing as unknown as DataTransfer })).toBe('list');
  });

  // triste
  it('ignores a file or a text dragged over the board', () => {
    expect(kindOf({ dataTransfer: transferOf(null) as unknown as DataTransfer })).toBeNull();
    expect(kindOf({ dataTransfer: null })).toBeNull();
  });
});

describe('AzuosBoardCanvas', () => {
  // feliz
  it('shows the slots of the grid and the eight handles of each block while building', () => {
    const { container } = renderCanvas(true);

    expect(screen.getByTestId('board-slots')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-resize-handle]')).toHaveLength(8);
  });

  // feliz
  it('moves a block one cell with the arrows of its drag handle', async () => {
    const { actions } = renderCanvas(true);

    await fireEvent.keyDown(screen.getByRole('button', { name: 'Arrastar Chamados por situação' }), {
      key: 'ArrowRight',
    });
    expect(actions.onLayoutChange).toHaveBeenCalledWith([{ i: 'a', x: 1, y: 0, w: 2, h: 2 }]);
  });

  // feliz
  it('creates the block where a kind from the side panel is dropped', async () => {
    const { actions } = renderCanvas(true);
    const canvas = screen.getByTestId('board-canvas');

    await fireEvent.dragOver(canvas, { dataTransfer: transferOf('list'), clientX: 5, clientY: 5 });
    expect(screen.getByTestId('board-placeholder')).toBeInTheDocument();
    await fireEvent.drop(canvas, { dataTransfer: transferOf('list'), clientX: 5, clientY: 5 });
    expect(actions.onDropKind).toHaveBeenCalledWith('list', expect.objectContaining({ w: 1, h: 2 }));
  });

  // triste
  it('does not move anything, nor show slots, for whoever only views', () => {
    const { container } = renderCanvas(false);

    expect(screen.queryByTestId('board-slots')).toBeNull();
    expect(container.querySelectorAll('[data-resize-handle]')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /^Arrastar/ })).toBeNull();
  });

  // triste
  it('says the board has no blocks yet when there is nothing to show', () => {
    renderCanvas(false, []);

    expect(screen.getByText('Este painel ainda não tem blocos.')).toBeInTheDocument();
  });

  // triste
  it('keeps each block in its place when the board is swapped for another one (Equipe → Gestor)', async () => {
    const other = { ...WIDGET, id: 'b', title: 'Chamados por departamento' };
    const props = (widgets: Widget[], x: number) => ({
      data: { widgets, layout: widgets.map((widget) => ({ i: widget.id, x, y: 1, w: 2, h: 2 })), results: {}, filterNames: {} },
      state: { isEditing: false },
      actions: { onLayoutChange: vi.fn(), onEditWidget: vi.fn(), onRemoveWidget: vi.fn() },
    });
    const { container, rerender } = render(BoardCanvas, { props: props([WIDGET], 0) });

    await rerender(props([other], 2));
    await new Promise((resolve) => setTimeout(resolve, 500));

    const block = container.querySelector<HTMLElement>('[data-widget-id="b"]');
    expect(block?.style.left).not.toBe('');
    expect(block?.style.top).not.toBe('');
  });
});

