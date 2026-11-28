import { type InventoryItem } from '@template/shared/schemas/inventory-item.schema';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';

import InventoryListView, {
  type InventoryListFilterValues,
} from './azuos-inventory-list-view.svelte';

function item(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 1,
    name: 'Cadeira giratória',
    category: 'furniture',
    unit: 'unit',
    location: 'Sala da contabilidade',
    department: null,
    userId: null,
    userName: null,
    code: 'PAT-0101',
    note: null,
    photoUrl: 'https://r2.exemplo/foto.webp',
    balance: 3,
    createdAt: '2026-09-01T12:00:00.000Z',
    createdBy: 'manutencao@azuos.local',
    updatedAt: null,
    updatedBy: null,
    archive: null,
    ...overrides,
  };
}

const emptyFilter: InventoryListFilterValues = {
  search: '',
  category: '',
  withoutPhotoOnly: false,
};

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
  onWithoutPhotoOnlyChange: vi.fn(),
  onClearFilters: vi.fn(),
  onRetry: vi.fn(),
  onRegister: vi.fn(),
  onEdit: vi.fn(),
  onAskDelete: vi.fn(),
  onCancelDelete: vi.fn(),
  onConfirmDelete: vi.fn(),
};

function setup(props: Record<string, unknown> = {}) {
  return render(InventoryListView, {
    props: {
      data: { items: [item()], total: 1, filter: emptyFilter, deleting: null },
      state: settled,
      actions,
      ...props,
    },
  });
}

describe('AzuosInventoryListView', () => {
  // feliz
  it('shows the product with its category, place and measure', () => {
    const { container } = setup();
    const cards = within(container.querySelector('[data-slot="inventory-cards"]') as HTMLElement);

    expect(cards.getByRole('heading', { name: 'Cadeira giratória' })).toBeInTheDocument();
    expect(cards.getByText('Mobiliário')).toBeInTheDocument();
    expect(cards.getByText('Sala da contabilidade · Unidade')).toBeInTheDocument();
    expect(cards.getByText('PAT-0101')).toBeInTheDocument();
  });

  /* A tabela é o outro modo da mesma lista (padrão do grupo): mesmas linhas, ações no menu. */
  it('lists the same products in the table, with the person and the menu', async () => {
    const onAskDelete = vi.fn();
    const { container } = setup({
      data: {
        items: [item({ userId: 'u-1', userName: 'Marta Lima', department: 'Contabilidade' })],
        total: 1,
        filter: emptyFilter,
        deleting: null,
      },
      actions: { ...actions, onAskDelete },
    });
    const table = within(container.querySelector('[data-slot="inventory-table"]') as HTMLElement);

    expect(table.getByText('Cadeira giratória')).toBeInTheDocument();
    expect(table.getByText('Contabilidade · Sala da contabilidade')).toBeInTheDocument();
    expect(table.getByText('Marta Lima')).toBeInTheDocument();
    expect(table.queryByText('Sem foto')).toBeNull();

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.click(table.getByRole('button', { name: 'Ações de Cadeira giratória' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Excluir' }));

    expect(onAskDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  /* A foto é o que faz reconhecer o produto antes de ler o nome. */
  it('shows the photo of the product', () => {
    setup();

    expect(screen.getByRole('img', { name: 'Foto de Cadeira giratória' })).toHaveAttribute(
      'src',
      'https://r2.exemplo/foto.webp',
    );
  });

  it('asks to register a new product', async () => {
    const onRegister = vi.fn();
    setup({ actions: { ...actions, onRegister } });

    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar produto' }));

    expect(onRegister).toHaveBeenCalledOnce();
  });

  it('asks to correct and to delete the product that was clicked', async () => {
    const onEdit = vi.fn();
    const onAskDelete = vi.fn();
    const { container } = setup({ actions: { ...actions, onEdit, onAskDelete } });
    const cards = within(container.querySelector('[data-slot="inventory-cards"]') as HTMLElement);

    /* Editar e excluir moram no menu de três pontinhos do cartão, nunca em ícone solto. */
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.click(cards.getByRole('button', { name: 'Ações de Cadeira giratória' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Editar' }));
    await user.click(cards.getByRole('button', { name: 'Ações de Cadeira giratória' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Excluir' }));

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(onAskDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it('opens edit when clicking anywhere on the item card', async () => {
    const onEdit = vi.fn();
    setup({ actions: { ...actions, onEdit } });

    await userEvent.click(screen.getByRole('button', { name: 'Editar Cadeira giratória' }));

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  /* Excluir é irreversível: a pergunta traz o nome do produto, não um "tem certeza?" solto. */
  it('names the product in the deletion question', () => {
    setup({ data: { items: [item()], total: 1, filter: emptyFilter, deleting: item() } });

    expect(screen.getByText(/"Cadeira giratória" sai do inventário/)).toBeInTheDocument();
  });

  // triste
  it('does not claim the inventory is empty while it is still loading', () => {
    setup({
      data: { items: [], total: 0, filter: emptyFilter, deleting: null },
      state: { ...settled, isLoading: true },
    });

    expect(screen.getByRole('status', { name: 'Carregando o inventário' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.queryByText('Nenhum produto cadastrado ainda')).toBeNull();
  });

  it('says nothing exists yet without blaming a filter', () => {
    setup({
      data: { items: [], total: 0, filter: emptyFilter, deleting: null },
      state: { ...settled, isEmpty: true },
    });

    expect(screen.getByText('Nenhum produto cadastrado ainda')).toBeInTheDocument();
  });

  /* Vazio de verdade e vazio por filtro são frases diferentes, com saídas diferentes. */
  it('offers to clear the filters when they hid everything', async () => {
    const onClearFilters = vi.fn();
    setup({
      data: {
        items: [],
        total: 0,
        filter: { ...emptyFilter, category: 'utility' },
        deleting: null,
      },
      state: { ...settled, isFilteredOut: true },
      actions: { ...actions, onClearFilters },
    });

    expect(screen.getByText('Nenhum produto com esse filtro')).toBeInTheDocument();

    const [clearButton] = screen.getAllByRole('button', { name: 'Limpar filtros' });
    await userEvent.click(clearButton as HTMLElement);
    expect(onClearFilters).toHaveBeenCalled();
  });

  it('shows the failure with a way to try again', async () => {
    const onRetry = vi.fn();
    setup({
      data: { items: [], total: 0, filter: emptyFilter, deleting: null },
      state: { ...settled, error: 'Não consegui falar com o servidor.' },
      actions: { ...actions, onRetry },
    });

    expect(screen.getByText('Não consegui falar com o servidor.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Tentar de novo/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  /* Produto sem foto, sem lugar e sem código continua legível: é metade do cadastro real. */
  it('draws a product with nothing but a name (edge case)', () => {
    setup({
      data: {
        items: [item({ photoUrl: null, location: null, code: null, name: 'Extintor' })],
        total: 1,
        filter: emptyFilter,
        deleting: null,
      },
    });

    expect(screen.getByRole('heading', { name: 'Extintor' })).toBeInTheDocument();
    /* Sem foto, o ícone da categoria (enfeite) e o aviso "Sem foto" na faixa. */
    expect(screen.queryByRole('img')).toBeNull();
    const strip = document.querySelector('[data-slot="inventory-card-strip"]')!;
    expect(strip).toHaveTextContent('Sem foto');
    expect(screen.getByText('Unidade')).toBeInTheDocument();
  });

  /* Lista truncada nunca é truncada calada (CONTRIBUTING §15). */
  it('says when the list does not show everything', () => {
    setup({ state: { ...settled, isTruncated: true } });

    expect(screen.getByText(/primeiros produtos/)).toBeInTheDocument();
  });
});

describe('AzuosInventoryListView — the filters and the note of a product', () => {
  // feliz
  it('searches, filters by category and by missing photo, and shows the note', async () => {
    vi.mocked(actions.onCategoryChange).mockClear();
    setup({
      data: {
        items: [item({ note: 'Pé quebrado.' })],
        total: 2,
        filter: emptyFilter,
        deleting: null,
      },
    });

    expect(screen.getByText('Pé quebrado.')).toBeInTheDocument();
    expect(screen.getByText(/2\s*produtos/)).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: 'Buscar' }), 'c');
    expect(actions.onSearchChange).toHaveBeenCalledWith('c');

    /* A foto mora atrás do "Filtros", no cartão de filtros do grupo. */
    await userEvent.click(screen.getByRole('button', { name: 'Filtros' }));
    const photo = screen.getByRole('group', { name: 'Filtrar por foto' });
    await userEvent.click(within(photo).getByRole('button', { name: 'Sem foto' }));
    expect(actions.onWithoutPhotoOnlyChange).toHaveBeenCalledWith(true);

    const category = screen.queryByRole('group', { name: 'Filtrar por categoria' });
    if (category) await userEvent.click(within(category).getAllByRole('button')[1]!);
    else {
      await userEvent.click(screen.getByRole('button', { name: 'Filtrar por categoria' }));
      const popup = [...document.querySelectorAll('[data-slot="popover-content"]')].at(
        -1,
      ) as HTMLElement;
      await userEvent.click(within(popup).getAllByRole('button', { hidden: true })[1]!);
    }
    expect(actions.onCategoryChange).toHaveBeenCalled();
  });
});

describe('AzuosInventoryListView — pages of cards', () => {
  // feliz
  it('shows twelve cards per page and walks to the next one', async () => {
    const many = Array.from({ length: 14 }, (_, index) =>
      item({ id: index + 1, name: `Produto ${index + 1}` }),
    );
    /* Nos cards (a preferência "ver sempre em cards"), a barra da lista mostra as páginas. */
    const tableView = useTableViewModel();
    tableView.actions.onToggle();
    onTestFinished(() => tableView.actions.onToggle());
    setup({ data: { items: many, total: 14, filter: emptyFilter, deleting: null } });

    expect(screen.getAllByRole('heading', { name: /^Produto / })).toHaveLength(12);
    await userEvent.click(screen.getAllByRole('button', { name: /próxima/i })[0]!);
    expect(screen.getAllByRole('heading', { name: /^Produto / })).toHaveLength(2);
  });

  // triste
  it('shows no page bar while everything fits on one page', () => {
    setup();

    expect(screen.queryByRole('button', { name: /próxima/i })).toBeNull();
  });
});
