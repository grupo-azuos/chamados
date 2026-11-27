import { type MaintenanceQuote } from '@template/shared/schemas/maintenance-quote.schema';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import QuoteListView, { type QuoteListFilterValues } from './azuos-quote-list-view.svelte';

function quote(overrides: Partial<MaintenanceQuote> = {}): MaintenanceQuote {
  return {
    id: 1,
    supplier: 'Clima Norte Refrigeração',
    description: 'Limpeza e recarga de gás dos aparelhos de ar-condicionado',
    kind: 'service',
    amountCents: 96000,
    quotedOn: '2026-10-02',
    status: 'pending',
    note: 'Inclui a troca do filtro.',
    attachmentUrl: 'https://r2.exemplo/doc?assinatura',
    attachmentName: 'orcamento-clima-norte.pdf',
    createdAt: '2026-10-02T12:00:00.000Z',
    createdBy: 'manutencao@azuos.local',
    updatedAt: null,
    updatedBy: null,
    archive: null,
    ...overrides,
  };
}

const emptyFilter: QuoteListFilterValues = { search: '', status: '', kind: '' };

const settled = {
  isLoading: false,
  isEmpty: false,
  isFilteredOut: false,
  isTruncated: false,
  error: null,
};

const actions = {
  onSearchChange: vi.fn(),
  onStatusChange: vi.fn(),
  onKindChange: vi.fn(),
  onClearFilters: vi.fn(),
  onRetry: vi.fn(),
  onRegister: vi.fn(),
  onEdit: vi.fn(),
  onAskDelete: vi.fn(),
  onCancelDelete: vi.fn(),
  onConfirmDelete: vi.fn(),
};

function setup(props: Record<string, unknown> = {}) {
  return render(QuoteListView, {
    props: {
      data: {
        quotes: [quote()],
        total: 1,
        amountCents: 96000,
        filter: emptyFilter,
        deleting: null,
      },
      state: settled,
      actions,
      ...props,
    },
  });
}

/* A lista desenha os dois modos (o CSS escolhe qual aparece): as checagens do cartão olham só
   a grade de cards. */
function cards(): ReturnType<typeof within> {
  return within(document.querySelector('[data-slot="quote-cards"]') as HTMLElement);
}

function table(): ReturnType<typeof within> {
  return within(document.querySelector('[data-slot="quote-table"]') as HTMLElement);
}

describe('AzuosQuoteListView', () => {
  // feliz
  it('shows the quote with its company, kind, day, amount and status', () => {
    setup();

    expect(screen.getByRole('heading', { name: 'Clima Norte Refrigeração' })).toBeInTheDocument();
    expect(cards().getByText('Serviço · 02/10/2026')).toBeInTheDocument();
    expect(cards().getByText('R$ 960,00')).toBeInTheDocument();
    /* Dentro do CARTÃO: "Aguardando" também é uma opção do filtro, no alto da tela. */
    const card = screen
      .getByRole('heading', { name: 'Clima Norte Refrigeração' })
      .closest('[data-slot="azuos-card-surface"]');
    expect(within(card as HTMLElement).getByText('Aguardando')).toBeInTheDocument();
    expect(cards().getByText('Inclui a troca do filtro.')).toBeInTheDocument();
    expect(screen.getByText('1 orçamento · R$ 960,00')).toBeInTheDocument();
  });

  /* O documento abre em outra aba e baixa, pelo link assinado que veio do servidor. */
  it('links to the document that the company sent', () => {
    setup();

    const link = cards().getByRole('link', { name: 'Abrir orcamento-clima-norte.pdf' });
    expect(link).toHaveAttribute('href', 'https://r2.exemplo/doc?assinatura');
    expect(link).toHaveAttribute('target', '_blank');
    // Arquivo tem as duas ações: abrir e baixar com o nome original.
    expect(cards().getByRole('link', { name: 'Baixar orcamento-clima-norte.pdf' })).toHaveAttribute(
      'download',
      'orcamento-clima-norte.pdf',
    );
  });

  it('asks to keep, to correct and to delete', async () => {
    const onRegister = vi.fn();
    const onEdit = vi.fn();
    const onAskDelete = vi.fn();
    setup({ actions: { ...actions, onRegister, onEdit, onAskDelete } });

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.click(screen.getByRole('button', { name: 'Guardar orçamento' }));
    /* Editar e excluir moram no menu de três pontinhos do cartão. */
    const menu = cards().getByRole('button', {
      name: 'Ações do orçamento de Clima Norte Refrigeração',
    });
    await user.click(menu);
    await user.click(await screen.findByRole('menuitem', { name: 'Editar' }));
    await user.click(menu);
    await user.click(await screen.findByRole('menuitem', { name: 'Excluir' }));

    expect(onRegister).toHaveBeenCalledOnce();
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(onAskDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  /* A tabela é o outro modo da mesma lista: as mesmas ações, no menu da linha. */
  it('edits and deletes from the menu of the table row', async () => {
    const onEdit = vi.fn();
    const onAskDelete = vi.fn();
    setup({ actions: { ...actions, onEdit, onAskDelete } });

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const menu = table().getByRole('button', {
      name: 'Ações do orçamento de Clima Norte Refrigeração',
    });
    await user.click(menu);
    await user.click(await screen.findByRole('menuitem', { name: 'Editar' }));
    await user.click(menu);
    await user.click(await screen.findByRole('menuitem', { name: 'Excluir' }));

    expect(table().getByText('R$ 960,00')).toBeInTheDocument();
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(onAskDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it('asks before deleting, naming the company', () => {
    setup({
      data: {
        quotes: [quote()],
        total: 1,
        amountCents: 96000,
        filter: emptyFilter,
        deleting: quote(),
      },
    });

    expect(
      screen.getByText(/O orçamento de "Clima Norte Refrigeração" sai da lista/),
    ).toBeInTheDocument();
  });

  // triste
  it('says there is no document instead of linking to nothing', () => {
    setup({
      data: {
        quotes: [quote({ attachmentUrl: null, attachmentName: null })],
        total: 1,
        amountCents: 96000,
        filter: emptyFilter,
        deleting: null,
      },
    });

    expect(cards().getByText('Sem documento')).toBeInTheDocument();
    expect(table().getByText('Sem documento')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('says it is loading instead of saying there is nothing', () => {
    setup({
      data: { quotes: [], total: 0, amountCents: 0, filter: emptyFilter, deleting: null },
      state: { ...settled, isLoading: true },
    });

    expect(screen.getByRole('status', { name: 'Carregando os orçamentos' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.queryByText('Nenhum orçamento guardado ainda')).toBeNull();
  });

  it('separates no quote at all from none with that filter', async () => {
    const onClearFilters = vi.fn();
    const { unmount } = setup({
      data: { quotes: [], total: 0, amountCents: 0, filter: emptyFilter, deleting: null },
      state: { ...settled, isEmpty: true },
    });
    expect(screen.getByText('Nenhum orçamento guardado ainda')).toBeInTheDocument();
    unmount();

    setup({
      data: {
        quotes: [],
        total: 0,
        amountCents: 0,
        filter: { ...emptyFilter, status: 'rejected' },
        deleting: null,
      },
      state: { ...settled, isFilteredOut: true },
      actions: { ...actions, onClearFilters },
    });
    expect(screen.getByText('Nenhum orçamento com esse filtro')).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: 'Limpar filtros' })[0]!);

    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  it('shows the reason of the failure and the way back', async () => {
    const onRetry = vi.fn();
    setup({
      data: { quotes: [], total: 0, amountCents: 0, filter: emptyFilter, deleting: null },
      state: { ...settled, error: 'Não consegui falar com o servidor.' },
      actions: { ...actions, onRetry },
    });

    expect(screen.getByText('Não consegui falar com o servidor.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /tentar/i }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  /* Valor zero é valor: a visita sem custo aparece como R$ 0,00, não como traço. */
  it('shows a quote of zero as zero (edge case)', () => {
    setup({
      data: {
        quotes: [quote({ amountCents: 0, note: null })],
        total: 1,
        amountCents: 0,
        filter: emptyFilter,
        deleting: null,
      },
    });

    expect(cards().getByText('R$ 0,00')).toBeInTheDocument();
    expect(table().getByText('R$ 0,00')).toBeInTheDocument();
  });
});

describe('AzuosQuoteListView — filters, a nameless document and the cut list', () => {
  async function chooseSecond(label: string) {
    const group = screen.queryByRole('group', { name: label });
    if (group) {
      await userEvent.click(within(group).getAllByRole('button')[1]!);
      return;
    }
    await userEvent.click(screen.getByRole('button', { name: label }));
    const popup = [...document.querySelectorAll('[data-slot="popover-content"]')].at(
      -1,
    ) as HTMLElement;
    await userEvent.click(within(popup).getAllByRole('button', { hidden: true })[1]!);
  }

  // feliz
  it('searches and filters by status and kind', async () => {
    setup();
    await userEvent.type(screen.getByRole('textbox', { name: 'Buscar' }), 'c');
    expect(actions.onSearchChange).toHaveBeenCalledWith('c');
    await chooseSecond('Filtrar por situação');
    expect(actions.onStatusChange).toHaveBeenCalled();
    await chooseSecond('Filtrar por tipo');
    expect(actions.onKindChange).toHaveBeenCalled();
  });

  // triste
  it('names a nameless document generically and says the list was cut', () => {
    setup({
      data: {
        quotes: [quote({ attachmentName: null }), quote({ id: 2 })],
        total: 2,
        amountCents: 192000,
        filter: emptyFilter,
        deleting: null,
      },
      state: { ...settled, isTruncated: true },
    });
    expect(cards().getByText('Documento do orçamento')).toBeInTheDocument();
    expect(screen.getByText(/2 orçamentos/)).toBeInTheDocument();
    expect(screen.getByText(/A lista mostra os orçamentos mais recentes/)).toBeInTheDocument();
  });
});
