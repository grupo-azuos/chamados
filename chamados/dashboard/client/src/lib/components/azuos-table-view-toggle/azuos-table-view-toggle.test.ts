import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';

import TableViewToggle, { chosenView } from './azuos-table-view-toggle.svelte';

const STORAGE_KEY = 'azuos-table-view';

const tableButton = () => screen.getByRole('button', { name: 'Ver em tabela' });
const cardsButton = () => screen.getByRole('button', { name: 'Ver em cards' });

/* A preferência mora num `$state` de escopo de módulo, compartilhado entre os testes: cada um
   começa com ela de volta no padrão (tabela) e sem nada salvo. */
beforeEach(() => {
  const tableView = useTableViewModel();
  if (tableView.forceCards) tableView.actions.onToggle();
  window.localStorage.clear();
});

describe('AzuosTableViewToggle', () => {
  // feliz
  it('shows both formats and marks the table as the one in use by default', () => {
    render(TableViewToggle);

    expect(screen.getByRole('group', { name: 'Formato da lista' })).toBeInTheDocument();
    expect(tableButton()).toHaveAttribute('aria-pressed', 'true');
    expect(cardsButton()).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches to cards and back, moving the mark and saving the choice', async () => {
    render(TableViewToggle);

    await userEvent.click(cardsButton());
    expect(cardsButton()).toHaveAttribute('aria-pressed', 'true');
    expect(tableButton()).toHaveAttribute('aria-pressed', 'false');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('cards');

    await userEvent.click(tableButton());
    expect(tableButton()).toHaveAttribute('aria-pressed', 'true');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('auto');
  });

  it('is born on cards when that is already the preference', () => {
    useTableViewModel().actions.onToggle();
    render(TableViewToggle);

    expect(cardsButton()).toHaveAttribute('aria-pressed', 'true');
    expect(tableButton()).toHaveAttribute('aria-pressed', 'false');
  });

  // triste
  /* Clicar no formato que JÁ está valendo não pode desligá-lo: são duas escolhas, não um
     liga/desliga. */
  it('keeps the format when the one already in use is clicked again', async () => {
    render(TableViewToggle);

    await userEvent.click(tableButton());
    await userEvent.click(tableButton());

    expect(tableButton()).toHaveAttribute('aria-pressed', 'true');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('survives repeated fast clicks on cards without getting stuck', async () => {
    render(TableViewToggle);

    await userEvent.click(cardsButton());
    await userEvent.click(cardsButton());
    await userEvent.click(cardsButton());

    expect(cardsButton()).toHaveAttribute('aria-pressed', 'true');
  });
});

const kanbanButton = () => screen.getByRole('button', { name: 'Ver em quadro' });

function renderWithKanban(isKanban = false) {
  const onKanbanChange = vi.fn();
  render(TableViewToggle, {
    props: { ui: { hasKanban: true }, state: { isKanban }, actions: { onKanbanChange } },
  });

  return onKanbanChange;
}

describe('AzuosTableViewToggle with the board', () => {
  // feliz
  it('offers the board as a third option, and only where the screen asks for it', () => {
    renderWithKanban();

    expect(tableButton()).toHaveAttribute('aria-pressed', 'true');
    expect(kanbanButton()).toHaveAttribute('aria-pressed', 'false');
  });

  it('asks the screen for the board, without touching the list preference', async () => {
    const onKanbanChange = renderWithKanban();

    await userEvent.click(kanbanButton());

    expect(onKanbanChange).toHaveBeenCalledWith(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('marks only the board while the screen is on it, and leaves it for the cards', async () => {
    const onKanbanChange = renderWithKanban(true);

    expect(kanbanButton()).toHaveAttribute('aria-pressed', 'true');
    expect(tableButton()).toHaveAttribute('aria-pressed', 'false');
    expect(cardsButton()).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(cardsButton());

    expect(onKanbanChange).toHaveBeenCalledWith(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('cards');
  });

  it('goes back from the board to the table already in use without flipping it', async () => {
    const onKanbanChange = renderWithKanban(true);

    await userEvent.click(tableButton());

    expect(onKanbanChange).toHaveBeenCalledWith(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  // triste
  it('does nothing when the board already in use is clicked again', async () => {
    const onKanbanChange = renderWithKanban(true);

    await userEvent.click(kanbanButton());

    expect(onKanbanChange).not.toHaveBeenCalled();
  });

  it('keeps the two options of always when the screen does not offer the board', () => {
    render(TableViewToggle, { props: { state: { isKanban: true } } });

    expect(screen.queryByRole('button', { name: 'Ver em quadro' })).not.toBeInTheDocument();
    expect(tableButton()).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('chosenView', () => {
  // feliz
  it('marks the board over any list preference', () => {
    expect(chosenView({ isKanban: true, forceCards: true, isNarrow: false })).toBe('kanban');
    expect(chosenView({ isKanban: false, forceCards: false, isNarrow: false })).toBe('table');
  });

  // triste
  /* Abaixo de `xl` não há tabela: marcar "Tabela" ali seria mentira. */
  it('marks the cards on a narrow screen, where there is no table', () => {
    expect(chosenView({ isKanban: false, forceCards: false, isNarrow: true })).toBe('cards');
  });
});
