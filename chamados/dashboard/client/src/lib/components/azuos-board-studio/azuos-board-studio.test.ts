import { EMPTY_BOARD_FILTER_VALUES, MAX_BOARD_WEIGHT } from '@template/shared/schemas/dashboard-board.schema';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import BoardStudio, { attachDragGhost, paletteHint } from './azuos-board-studio.svelte';

function renderStudio(options: { weight?: number; canAdd?: boolean } = {}) {
  const actions = new Proxy({} as Record<string, ReturnType<typeof vi.fn>>, {
    get: (target, key: string) => (target[key] ??= vi.fn()),
  });
  render(BoardStudio, {
    props: {
      data: {
        scopeLabel: 'Equipe',
        widgets: [],
        layout: [],
        results: {},
        filterNames: {},
        boardFilters: [],
        filterValues: EMPTY_BOARD_FILTER_VALUES,
        filterCounts: {},
        weight: options.weight ?? 0,
      },
      state: { isOpen: true, isSaving: false, canAdd: options.canAdd ?? true, error: null },
      actions: actions as never,
    },
  });

  return actions;
}

describe('AzuosBoardStudio', () => {
  // feliz
  it('opens over everything, and a click on a kind puts the block at the end of the board', async () => {
    const actions = renderStudio();

    expect(screen.getByRole('dialog', { name: 'Montar o painel Equipe' })).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Pôr bloco Colunas' }));
    expect(actions.onNewWidget).toHaveBeenCalledWith('column', { x: 0, y: 0, w: 2, h: 2 });
  });

  // feliz
  it('saves with "Guardar" and gives up with "Restaurar"', async () => {
    const actions = renderStudio();

    await fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(actions.onSave).toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('button', { name: 'Restaurar' }));
    expect(actions.onCancel).toHaveBeenCalled();
  });

  // triste
  it('turns off every kind when the quota is used up', () => {
    renderStudio({ weight: MAX_BOARD_WEIGHT, canAdd: false });

    expect(screen.getByRole('button', { name: 'Pôr bloco Colunas' })).toBeDisabled();
    expect(screen.getByText(/usou a cota toda/)).toBeInTheDocument();
  });

  // triste
  it('says how much a board past the quota has to give back', () => {
    expect(paletteHint(-2)).toContain('passou 2');
    expect(paletteHint(5)).toContain('Sobram');
  });

  // feliz
  it('drags a ghost in the shape of the block, and not a photo of the button', () => {
    const setDragImage = vi.fn();
    const ghost = attachDragGhost({ setDragImage }, 'Colunas', { w: 2, h: 2 });

    expect(ghost.textContent).toBe('Colunas · 2 × 2');
    expect(setDragImage).toHaveBeenCalledWith(ghost, 16, 16);
  });
});
