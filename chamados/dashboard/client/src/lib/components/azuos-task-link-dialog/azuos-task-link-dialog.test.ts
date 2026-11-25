import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TaskLinkDialog from './azuos-task-link-dialog.svelte';

function setup(
  over: {
    selectedIds?: number[];
    options?: { id: number; label: string }[];
    isSearching?: boolean;
    kinds?: readonly ('ticket' | 'computer' | 'part' | 'inventory_item')[];
  } = {},
) {
  const actions = {
    onKindChange: vi.fn(),
    onSearch: vi.fn(),
    onToggle: vi.fn(),
    onConfirm: vi.fn(),
    onClose: vi.fn(),
  };
  render(TaskLinkDialog, {
    props: {
      data: {
        kind: 'computer',
        term: '',
        options: over.options ?? [
          { id: 2, label: 'Computador 02' },
          { id: 3, label: 'Computador 03' },
        ],
        selectedIds: over.selectedIds ?? [],
        kinds: over.kinds,
      },
      state: { isOpen: true, isSearching: over.isSearching },
      actions,
    },
  });
  return actions;
}

describe('AzuosTaskLinkDialog', () => {
  // feliz
  it('switches the kind, searches, marks several and links them', async () => {
    const actions = setup({ selectedIds: [2] });

    await userEvent.click(screen.getByRole('button', { name: 'Chamado' }));
    expect(actions.onKindChange).toHaveBeenCalledWith('ticket');
    await userEvent.type(screen.getByLabelText('Buscar'), 'x');
    expect(actions.onSearch).toHaveBeenCalledWith('x');
    await userEvent.click(screen.getByLabelText('Computador 03'));
    expect(actions.onToggle).toHaveBeenCalledWith(3);
    await userEvent.click(screen.getByRole('button', { name: 'Vincular 1' }));
    expect(actions.onConfirm).toHaveBeenCalled();
  });

  // triste
  it('does not link with nothing marked, and says when the search finds nothing', () => {
    setup({ options: [] });

    expect(screen.getByRole('button', { name: 'Vincular' })).toBeDisabled();
    expect(screen.getByText('Nada com esse nome.')).toBeInTheDocument();
  });

  // triste
  it('in Sistema, offers only tickets: there is no computer, part or inventory there', () => {
    setup({ kinds: ['ticket'] });

    expect(screen.getByRole('button', { name: 'Chamado' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Computador' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Peça' })).not.toBeInTheDocument();
  });
});
