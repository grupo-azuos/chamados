import { type InventoryItem } from '@template/shared/schemas/inventory-item.schema';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import StockListView, { type StockListFilterValues } from './azuos-stock-list-view.svelte';
import { groupStock } from '$lib/utils/inventory-stock-group.util';

function item(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 1,
    name: 'Café torrado e moído 500 g',
    category: 'pantry',
    unit: 'package',
    location: 'Copa',
    department: null,
    userId: null,
    userName: null,
    code: null,
    note: null,
    photoUrl: null,
    balance: 7,
    createdAt: '2026-09-01T12:00:00.000Z',
    createdBy: 'manutencao@azuos.local',
    updatedAt: null,
    updatedBy: null,
    archive: null,
    ...overrides,
  };
}

const sugar = item({ id: 2, name: 'Açúcar refinado', unit: 'kilogram', balance: 0 });

const emptyFilter: StockListFilterValues = { search: '', category: '', outOfStockOnly: false };

const settled = {
  isLoading: false,
  isEmpty: false,
  isFilteredOut: false,
  isTruncated: false,
  error: null,
};

const actions = {
  onSearchChange: vi.fn(),
  onCategoryChange: vi.fn(),
  onOutOfStockOnlyChange: vi.fn(),
  onClearFilters: vi.fn(),
  onRetry: vi.fn(),
  onEntry: vi.fn(),
  onExit: vi.fn(),
  onOpenInventory: vi.fn(),
};

function setup(props: Record<string, unknown> = {}) {
  return render(StockListView, {
    props: {
      data: { groups: groupStock([item(), sugar]), total: 2, outOfStock: 1, filter: emptyFilter },
      state: settled,
      actions,
      ...props,
    },
  });
}

/** O cartão de um produto, pelo nome dele. */
function cardOf(name: string): HTMLElement {
  return screen
    .getByRole('heading', { name })
    .closest('[data-slot="azuos-card-surface"]') as HTMLElement;
}

describe('AzuosStockListView', () => {
  // feliz
  it('shows how much there is of each product, in its measure', () => {
    setup();

    const coffee = within(cardOf('Café torrado e moído 500 g'));
    expect(coffee.getByText('7')).toBeInTheDocument();
    expect(coffee.getByText('Pacote')).toBeInTheDocument();
    expect(coffee.getByText('Mercadinho · Copa')).toBeInTheDocument();
    expect(screen.getByText(/2\s+produtos/)).toBeInTheDocument();
  });

  it('asks for an entry and for an exit of the product that was clicked', async () => {
    const onEntry = vi.fn();
    const onExit = vi.fn();
    setup({ actions: { ...actions, onEntry, onExit } });
    const coffee = within(cardOf('Café torrado e moído 500 g'));

    await userEvent.click(coffee.getByRole('button', { name: 'Entrada' }));
    await userEvent.click(coffee.getByRole('button', { name: 'Saída' }));

    expect(onEntry).toHaveBeenCalledWith(expect.objectContaining({ name: item().name }));
    expect(onExit).toHaveBeenCalledWith(expect.objectContaining({ name: item().name }));
  });

  /* A tabela é o outro modo da mesma lista: Entrada e Saída no menu de três pontinhos. */
  it('moves the product from the menu of the table row', async () => {
    const onEntry = vi.fn();
    const onExit = vi.fn();
    const { container } = setup({ actions: { ...actions, onEntry, onExit } });
    const table = within(container.querySelector('[data-slot="stock-table"]') as HTMLElement);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    await user.click(table.getByRole('button', { name: 'Movimentar Café torrado e moído 500 g' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Saída' }));
    await user.click(table.getByRole('button', { name: 'Movimentar Café torrado e moído 500 g' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Entrada' }));

    expect(onExit).toHaveBeenCalledWith(expect.objectContaining({ name: item().name }));
    expect(onEntry).toHaveBeenCalledWith(expect.objectContaining({ name: item().name }));
  });

  /* O que zerou fica marcado, e não dá para tirar de onde não há. */
  it('marks what ran out and does not offer to take from it', () => {
    setup();
    const card = within(cardOf('Açúcar refinado'));

    expect(card.getByText('Sem estoque')).toBeInTheDocument();
    expect(card.getByRole('button', { name: 'Saída' })).toBeDisabled();
    expect(card.getByRole('button', { name: 'Entrada' })).toBeEnabled();
  });

  it('offers to clear the filters only when there is one', async () => {
    const onClearFilters = vi.fn();
    const { unmount } = setup();
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull();
    unmount();

    setup({
      data: {
        groups: groupStock([sugar]),
        total: 1,
        outOfStock: 1,
        filter: { ...emptyFilter, outOfStockOnly: true },
      },
      actions: { ...actions, onClearFilters },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  // triste
  it('says it is loading instead of saying there is nothing', () => {
    setup({
      data: { groups: [], total: 0, outOfStock: 0, filter: emptyFilter },
      state: { ...settled, isLoading: true },
    });

    expect(screen.getByRole('status', { name: 'Carregando o depósito' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.queryByText('Nenhum produto para guardar ainda')).toBeNull();
  });

  /* Depósito vazio é inventário vazio: a saída é cadastrar o produto lá. */
  it('points to the inventory when there is no product at all', async () => {
    const onOpenInventory = vi.fn();
    setup({
      data: { groups: [], total: 0, outOfStock: 0, filter: emptyFilter },
      state: { ...settled, isEmpty: true },
      actions: { ...actions, onOpenInventory },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Abrir o inventário' }));

    expect(onOpenInventory).toHaveBeenCalledOnce();
  });

  it('separates the list hidden by a filter from the empty one', () => {
    setup({
      data: {
        groups: [],
        total: 0,
        outOfStock: 0,
        filter: { ...emptyFilter, category: 'utility' },
      },
      state: { ...settled, isFilteredOut: true },
    });

    expect(screen.getByText('Nenhum produto com esse filtro')).toBeInTheDocument();
  });

  it('shows the reason of the failure and the way back', async () => {
    const onRetry = vi.fn();
    setup({
      data: { groups: [], total: 0, outOfStock: 0, filter: emptyFilter },
      state: { ...settled, error: 'Não consegui falar com o servidor.' },
      actions: { ...actions, onRetry },
    });

    expect(screen.getByText('Não consegui falar com o servidor.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /tentar/i }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('says when the list came cut (edge case)', () => {
    setup({ state: { ...settled, isTruncated: true } });

    expect(screen.getByText(/mostra os primeiros produtos/)).toBeInTheDocument();
  });
});

describe('AzuosStockListView by name', () => {
  // feliz
  it('shows CADEIRA, cadeira and Cadeira as one card, with the summed balance and how many are in use', () => {
    setup({
      data: {
        groups: groupStock([
          item({ id: 10, name: 'Cadeira', balance: 2 }),
          item({ id: 11, name: 'CADEIRA', balance: 0 }),
          item({ id: 12, name: 'cadeira', balance: 1 }),
        ]),
        total: 1,
        outOfStock: 0,
        filter: emptyFilter,
      },
    });

    expect(screen.getAllByRole('heading', { name: /cadeira/i })).toHaveLength(1);
    expect(cardOf('Cadeira')).toHaveTextContent('3');
    expect(cardOf('Cadeira')).toHaveTextContent('3 em uso');
  });
});
