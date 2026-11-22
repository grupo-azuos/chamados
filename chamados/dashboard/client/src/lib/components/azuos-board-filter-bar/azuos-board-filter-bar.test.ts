import { EMPTY_BOARD_FILTER_VALUES, ME_VALUE } from '@template/shared/schemas/dashboard-board.schema';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import BoardFilterBar from './azuos-board-filter-bar.svelte';

const PERSON = { id: 'person', kind: 'person' as const, label: 'Pessoa', display: 'search' as const, place: { x: 0, y: 0, w: 1, h: 1 } };
const STATUS = { id: 'ticketStatus', kind: 'ticketStatus' as const, label: 'Situação', display: 'select' as const, place: { x: 1, y: 0, w: 1, h: 1 } };
const PERIOD = { id: 'period', kind: 'period' as const, label: 'Período', place: { x: 2, y: 0, w: 1, h: 1 } };
const COUNTS = {
  person: { total: 9, isLoading: false, series: [{ key: 'Ana Lima', label: 'Ana Lima', value: 5 }] },
  ticketStatus: { total: 9, isLoading: false, series: [{ key: 'open', label: 'Aberto', value: 6 }] },
};

type AnyFilter = Omit<typeof PERSON | typeof STATUS | typeof PERIOD, 'display'> & { display?: 'select' | 'search' | 'cards'; width?: 'auto' | 'full' };

function renderBar(options: { isEditing?: boolean; values?: typeof EMPTY_BOARD_FILTER_VALUES; filters?: AnyFilter[] } = {}) {
  const actions = {
    onChange: vi.fn(),
    onClear: vi.fn(),
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    onDisplayChange: vi.fn(),
    onWidthChange: vi.fn(),
    onPlaceChange: vi.fn(),
  };
  render(BoardFilterBar, {
    props: {
      data: { filters: options.filters ?? [PERSON, STATUS, PERIOD], values: options.values ?? EMPTY_BOARD_FILTER_VALUES, counts: COUNTS },
      state: { isEditing: options.isEditing ?? false },
      actions,
    },
  });

  return actions;
}

/* Montando, a lista dos filtros nasce fechada: abre pelo título. */
async function openList() {
  await fireEvent.click(screen.getByRole('button', { name: /Ajustar os filtros/ }));
}

describe('AzuosBoardFilterBar', () => {
  // feliz
  it('shows every filter as one compact piece, with its name next to its value', () => {
    renderBar();

    const bar = screen.getByRole('region', { name: 'Filtros do painel' });
    expect(within(bar).getByRole('group', { name: 'Pessoa' })).toBeInTheDocument();
    expect(within(bar).getByRole('group', { name: 'Situação' })).toBeInTheDocument();
    expect(within(bar).getByRole('group', { name: 'Período' })).toBeInTheDocument();
  });

  // feliz
  it('chooses "me" with one click on the cards', async () => {
    const actions = renderBar({ filters: [{ ...PERSON, display: 'cards' }] });

    await fireEvent.click(screen.getByRole('radio', { name: 'Eu' }));
    expect(actions.onChange).toHaveBeenCalledWith({ person: ME_VALUE });
  });

  // feliz
  it('offers to clear the filters once one is chosen', async () => {
    const actions = renderBar({ values: { ...EMPTY_BOARD_FILTER_VALUES, person: ME_VALUE } });

    await fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(actions.onClear).toHaveBeenCalled();
  });

  // triste
  it('hides the clear button while nothing is chosen', () => {
    renderBar();

    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull();
  });

  // feliz
  it('while building, lists the filters in toolbar order to reorder, re-draw and take off', async () => {
    const actions = renderBar({ isEditing: true, filters: [PERSON, STATUS] });
    await openList();

    await fireEvent.click(screen.getByRole('button', { name: 'Descer o filtro Pessoa' }));
    expect(actions.onPlaceChange).toHaveBeenCalledWith([
      { id: 'ticketStatus', place: { x: 0, y: 0, w: 1, h: 1 } },
      { id: 'person', place: { x: 1, y: 0, w: 1, h: 1 } },
    ]);
    await fireEvent.click(screen.getByRole('button', { name: 'Tirar o filtro Pessoa' }));
    expect(actions.onRemove).toHaveBeenCalledWith('person');
    await fireEvent.click(screen.getByRole('button', { name: 'Período' }));
    expect(actions.onAdd).toHaveBeenCalledWith('period');
  });

  // triste
  it('does not move the first filter further up', async () => {
    renderBar({ isEditing: true, filters: [PERSON, STATUS] });
    await openList();

    expect(screen.getByRole('button', { name: 'Subir o filtro Pessoa' })).toBeDisabled();
  });

  // triste
  it('does not show the bar to whoever only views a board without filters', () => {
    renderBar({ filters: [] });

    expect(screen.queryByRole('region', { name: 'Filtros do painel' })).toBeNull();
  });

  // feliz
  it('puts a filter on the whole line when it is set so', () => {
    renderBar({ filters: [PERSON, { ...STATUS, width: 'full' }] });

    expect(screen.getByRole('group', { name: 'Situação' }).parentElement?.parentElement).toHaveClass('col-span-full');
    expect(screen.getByRole('group', { name: 'Pessoa' }).parentElement?.parentElement).not.toHaveClass('col-span-full');
  });

  // feliz
  it('while building, chooses the width of each filter', async () => {
    const actions = renderBar({ isEditing: true, filters: [PERSON, STATUS] });
    await openList();

    expect(screen.getByRole('combobox', { name: 'Largura de Pessoa' })).toHaveTextContent('Normal');
    expect(actions.onWidthChange).not.toHaveBeenCalled();
  });

  // feliz
  it('keeps the order chosen in the list, period included', () => {
    renderBar({ filters: [{ ...PERIOD, place: { x: 0, y: 0, w: 1, h: 1 } }, { ...PERSON, place: { x: 1, y: 0, w: 1, h: 1 } }] });

    const names = screen.getAllByRole('group').map((group) => group.getAttribute('aria-label'));
    expect(names.indexOf('Período')).toBeLessThan(names.indexOf('Pessoa'));
  });

  // triste
  it('while building, keeps the filter list closed until it is asked for', () => {
    renderBar({ isEditing: true, filters: [PERSON, STATUS] });

    expect(screen.getByRole('button', { name: 'Ajustar os filtros (2)' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Descer o filtro Pessoa' })).toBeNull();
  });

  // triste
  it('keeps the cards with many options in the carousel, instead of turning them into a search', () => {
    const names = ['Contábil', 'Fiscal', 'Paralegal', 'Tecnologia', 'Recursos Humanos', 'ANALYZE', 'CERTIFICADO', 'RECEPÇÃO'];
    render(BoardFilterBar, {
      props: {
        data: {
          filters: [{ id: 'dep', kind: 'department' as const, label: 'Departamento', display: 'cards' as const, place: { x: 0, y: 0, w: 1, h: 1 } }],
          values: EMPTY_BOARD_FILTER_VALUES,
          counts: { dep: { total: 0, isLoading: false, series: names.map((name) => ({ key: name, label: name, value: 0 })) } },
        },
        actions: { onChange: vi.fn() },
      },
    });

    expect(screen.getByRole('radiogroup', { name: 'Departamento' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /RECEPÇÃO/ })).toBeInTheDocument();
  });

  // feliz
  it('shows the cards as a strip, each option with its count, and chooses one with a click', async () => {
    const actions = renderBar({ filters: [{ ...STATUS, display: 'cards' as const }] });

    const open = screen.getByRole('radio', { name: /Aberto/ });
    expect(open).toHaveTextContent('6');
    expect(screen.getByRole('radio', { name: /Todos/ })).toHaveTextContent('9');
    expect(screen.getByRole('radio', { name: /Resolvido/ })).toHaveTextContent('0');
    expect(screen.getByRole('radiogroup', { name: 'Situação' }).parentElement?.parentElement).toHaveClass('col-span-full');
    await fireEvent.click(open);
    expect(actions.onChange).toHaveBeenCalledWith({ ticketStatus: 'open' });
  });

  // triste
  it('while building, offers only the filters of the module', async () => {
    render(BoardFilterBar, {
      props: {
        data: { filters: [PERSON], values: EMPTY_BOARD_FILTER_VALUES, counts: COUNTS, kinds: ['person', 'period', 'computerHealth'] },
        state: { isEditing: true },
        actions: { onChange: vi.fn(), onAdd: vi.fn() },
      },
    });
    await openList();

    expect(screen.getByRole('button', { name: 'Saúde da máquina' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sistema' })).toBeNull();
  });

  // triste
  it('shows a board saved with chips as a dropdown', () => {
    renderBar({ filters: [{ ...STATUS, display: 'chips' as never }] });

    expect(screen.queryByRole('radiogroup', { name: 'Situação' })).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Situação' })).toBeInTheDocument();
  });

  // feliz
  it('draws only the period as the time picker, and only the other filters in the strip', () => {
    const counts = COUNTS;
    const { unmount } = render(BoardFilterBar, {
      props: { data: { filters: [PERSON, PERIOD], values: EMPTY_BOARD_FILTER_VALUES, counts }, ui: { part: 'period' }, actions: { onChange: vi.fn() } },
    });

    expect(screen.getByRole('group', { name: 'Período do painel' })).toContainElement(screen.getByRole('group', { name: 'Período' }));
    expect(screen.queryByRole('group', { name: 'Pessoa' })).toBeNull();
    unmount();

    render(BoardFilterBar, {
      props: { data: { filters: [PERSON, PERIOD], values: EMPTY_BOARD_FILTER_VALUES, counts }, ui: { part: 'fields' }, actions: { onChange: vi.fn() } },
    });
    expect(screen.getByRole('group', { name: 'Pessoa' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Período' })).toBeNull();
  });

  // triste
  it('draws nothing in the time picker when the board has no period', () => {
    render(BoardFilterBar, {
      props: { data: { filters: [PERSON], values: EMPTY_BOARD_FILTER_VALUES, counts: COUNTS }, ui: { part: 'period' }, actions: { onChange: vi.fn() } },
    });

    expect(screen.queryByRole('group', { name: 'Período do painel' })).toBeNull();
  });
});

