import { EMPTY_BOARD_FILTER_VALUES, ME_VALUE } from '@template/shared/schemas/dashboard-board.schema';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import BoardFilterBar from './azuos-board-filter-bar.svelte';

const PERSON = { id: 'person', kind: 'person' as const, label: 'Pessoa', display: 'chips' as const };
const STATUS = { id: 'ticketStatus', kind: 'ticketStatus' as const, label: 'Situação', display: 'cards' as const };
const COUNTS = {
  person: { total: 9, isLoading: false, series: [{ key: 'Ana Lima', label: 'Ana Lima', value: 5 }] },
  ticketStatus: { total: 9, isLoading: false, series: [{ key: 'open', label: 'Aberto', value: 6 }] },
};

function renderBar(options: { isEditing?: boolean; values?: typeof EMPTY_BOARD_FILTER_VALUES; isOpen?: boolean; filters?: (typeof PERSON | typeof STATUS)[] } = {}) {
  const actions = {
    onChange: vi.fn(),
    onClear: vi.fn(),
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    onDisplayChange: vi.fn(),
    onPlaceChange: vi.fn(),
  };
  render(BoardFilterBar, {
    props: {
      data: { filters: options.filters ?? [PERSON, STATUS], values: options.values ?? EMPTY_BOARD_FILTER_VALUES, counts: COUNTS },
      ui: { isInitiallyOpen: options.isOpen ?? true },
      state: { isEditing: options.isEditing ?? false },
      actions,
    },
  });

  return actions;
}

describe('AzuosBoardFilterBar', () => {
  // feliz
  it('chooses "me" or a person with one click on the chips', async () => {
    const actions = renderBar();

    await fireEvent.click(screen.getByRole('radio', { name: 'Eu' }));
    expect(actions.onChange).toHaveBeenCalledWith({ person: ME_VALUE });
  });

  // feliz
  it('filters the whole board by a card, and lets go of it with a second click', async () => {
    const actions = renderBar({ values: { ...EMPTY_BOARD_FILTER_VALUES, ticketStatus: 'open' } });

    await fireEvent.click(screen.getByRole('button', { name: /^Aberto: 6/ }));
    expect(actions.onChange).toHaveBeenCalledWith({ ticketStatus: null });
  });

  // feliz
  it('collapsed, says in one line what is filtering the board, and offers to clear it', async () => {
    const actions = renderBar({ isOpen: false, values: { ...EMPTY_BOARD_FILTER_VALUES, person: ME_VALUE } });

    expect(screen.getByRole('button', { name: /Filtros/ })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('list', { name: 'Filtros escolhidos' })).toHaveTextContent('Pessoa: Eu');
    await fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(actions.onClear).toHaveBeenCalled();
  });

  // feliz
  it('while building, drags, re-draws and takes off each filter, and offers the missing ones', async () => {
    const actions = renderBar({ isEditing: true, filters: [PERSON] });

    expect(screen.getByRole('button', { name: 'Arrastar o filtro Pessoa' })).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Tirar o filtro Pessoa' }));
    expect(actions.onRemove).toHaveBeenCalledWith('person');
    await fireEvent.click(screen.getByRole('button', { name: 'Período' }));
    expect(actions.onAdd).toHaveBeenCalledWith('period');
  });

  // triste
  it('says nothing is chosen when collapsed without a value, and hides the clear button', () => {
    renderBar({ isOpen: false });

    expect(screen.getByText('Nenhum filtro escolhido')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull();
  });

  // triste
  it('does not show the bar to whoever only views a board without filters', () => {
    renderBar({ filters: [] });

    expect(screen.queryByRole('region', { name: 'Filtros do painel' })).toBeNull();
  });
});
