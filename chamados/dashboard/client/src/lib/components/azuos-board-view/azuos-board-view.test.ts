import { EMPTY_BOARD_FILTER_VALUES, type Widget } from '@template/shared/schemas/dashboard-board.schema';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import BoardView, { type AzuosBoardViewProps, updatedLabel } from './azuos-board-view.svelte';

const WIDGET: Widget = {
  id: 'a',
  kind: 'column',
  title: 'Chamados por situação',
  source: 'infraTickets',
  groupBy: 'status',
  splitBy: null,
  filterId: null,
  onlyMine: false,
  period: 'all',
  window: null,
};

function props(overrides: { data?: Partial<AzuosBoardViewProps['data']>; state?: Partial<AzuosBoardViewProps['state']> } = {}) {
  const actions = new Proxy({} as AzuosBoardViewProps['actions'], {
    get: (target, key: string) => (target[key as keyof typeof target] ??= vi.fn() as never),
  });

  return {
    data: {
      module: 'infra' as const,
      scope: 'team' as const,
      scopes: [
        { value: 'team' as const, label: 'Equipe' },
        { value: 'personal' as const, label: 'Pessoal' },
      ],
      widgets: [WIDGET],
      layout: [{ i: 'a', x: 0, y: 0, w: 2, h: 2 }],
      results: {},
      editing: null,
      preview: null,
      updatedAt: null,
      boardFilters: [],
      filterValues: EMPTY_BOARD_FILTER_VALUES,
      filterCounts: {},
      weight: 2,
      savedFilters: [],
      archivedFilters: [],
      editingFilter: null,
      ...overrides.data,
    },
    state: {
      isLoading: false,
      isEditing: false,
      isSaving: false,
      isRefreshing: false,
      canEdit: true,
      canAdd: true,
      error: null,
      isFilterDialogOpen: false,
      ...overrides.state,
    },
    actions,
  };
}

describe('updatedLabel', () => {
  // feliz
  it('says when the board was built', () => {
    expect(updatedLabel('2026-11-20T15:00:00.000Z')).toContain('20/11/2026');
  });

  // triste
  it('says it is the default board while nobody saved one', () => {
    expect(updatedLabel(null)).toContain('painel padrão');
  });
});

describe('AzuosBoardView', () => {
  // feliz
  it('shows the tabs and the blocks, and opens the building for who can build', async () => {
    const view = props();
    render(BoardView, { props: view });

    expect(screen.getByRole('button', { name: 'Equipe' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Chamados por situação')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Editar painel' }));

    expect(view.actions.onStartEdit).toHaveBeenCalled();
  });

  // feliz
  it('opens the building in full screen, with the points counted, and saves with "Guardar"', async () => {
    const view = props({ state: { isEditing: true } });
    render(BoardView, { props: view });

    expect(screen.getByRole('dialog', { name: 'Montar o painel Equipe' })).toBeInTheDocument();
    expect(screen.getByText('2 de 24 pontos')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(view.actions.onSave).toHaveBeenCalled();
  });

  // triste
  it('does not offer to build to who only looks, and says the board has no blocks', () => {
    render(BoardView, { props: props({ data: { widgets: [], layout: [] }, state: { canEdit: false } }) });

    expect(screen.queryByRole('button', { name: 'Editar painel' })).not.toBeInTheDocument();
    expect(screen.getByText('Este painel ainda não tem blocos.')).toBeInTheDocument();
  });

  // triste
  it('shows the refusal of the save in red, inside the building screen', () => {
    render(BoardView, { props: props({ state: { isEditing: true, error: 'Não salvei o painel: passa da cota.' } }) });

    expect(screen.getByRole('alert')).toHaveTextContent('Não salvei o painel: passa da cota.');
  });
});
