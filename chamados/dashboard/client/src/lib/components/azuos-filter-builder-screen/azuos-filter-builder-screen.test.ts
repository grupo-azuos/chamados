import { type SavedFilter } from '@template/shared/schemas/dashboard-board.schema';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import FilterBuilderScreen, { problemsOf } from './azuos-filter-builder-screen.svelte';

const FILTER: SavedFilter = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Urgentes',
  description: null,
  source: 'infraTickets',
  scope: 'shared',
  tree: { combinator: 'and', rules: [{ id: 'r1', field: 'priority', operator: '=', value: 'high' }] },
  ownerId: 'u-ana',
  ownerName: 'Ana Lima',
  canEdit: true,
  archive: null,
  updatedAt: '2026-11-20T12:00:00.000Z',
};

function renderDialog(editing: SavedFilter | 'new' | null = null) {
  const actions = {
    onClose: vi.fn(),
    onNew: vi.fn(),
    onEdit: vi.fn(),
    onCancelEdit: vi.fn(),
    onSave: vi.fn(),
    onArchive: vi.fn(),
    onRestore: vi.fn(),
  };
  render(FilterBuilderScreen, {
    props: { data: { module: 'infra', filters: [FILTER], archived: [], editing }, state: { isOpen: true }, actions },
  });

  return actions;
}

describe('AzuosFilterBuilderScreen', () => {
  // feliz
  it('lists the saved filters of the module on the side, and archives one', async () => {
    const actions = renderDialog();

    expect(screen.getByRole('complementary', { name: 'Filtros salvos' })).toHaveTextContent('Urgentes');
    await fireEvent.click(screen.getByRole('button', { name: 'Arquivar Urgentes' }));

    expect(actions.onArchive).toHaveBeenCalledWith(FILTER.id);
  });

  // feliz
  it('saves an edited filter by its id', async () => {
    const actions = renderDialog(FILTER);

    expect(screen.getByRole('dialog', { name: 'Editar filtro' })).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Salvar filtro' }));

    expect(actions.onSave).toHaveBeenCalledWith(FILTER.id, expect.objectContaining({ name: 'Urgentes', source: 'infraTickets' }));
  });

  // triste
  it('opens straight on a new filter and says, as a reminder, what is missing to save', () => {
    const actions = renderDialog(null);

    expect(screen.getByRole('dialog', { name: 'Montar filtro' })).toBeInTheDocument();
    expect(screen.getByText('Para salvar:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar filtro' })).toBeDisabled();
    expect(actions.onSave).not.toHaveBeenCalled();
    expect(problemsOf({})).not.toEqual([]);
  });
});
