<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { EMPTY_BOARD_FILTER_VALUES, type Widget } from '@template/shared/schemas/dashboard-board.schema';

  import BoardView from './azuos-board-view.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosBoardView',
    component: BoardView,
    parameters: { layout: 'padded' },
  });

  const widgets: Widget[] = [
    { id: 'a', kind: 'stats', title: 'Chamados', source: 'infraTickets', groupBy: 'open', splitBy: null, filterId: null, onlyMine: false, period: 'all', window: null },
    { id: 'b', kind: 'column', title: 'Chamados por situação', source: 'infraTickets', groupBy: 'status', splitBy: null, filterId: null, onlyMine: false, period: '30d', window: null },
  ];
  const layout = [
    { i: 'a', x: 0, y: 0, w: 4, h: 1 },
    { i: 'b', x: 0, y: 1, w: 2, h: 2 },
  ];
  const series = [
    { key: 'open', label: 'Em aberto', value: 7 },
    { key: 'done', label: 'Resolvido', value: 4 },
  ];
  const results = Object.fromEntries(widgets.map((widget) => [widget.id, { data: { total: 11, grandTotal: 20, series, cells: [] }, isLoading: false, error: null }]));
  const data = {
    module: 'infra' as const,
    scope: 'team' as const,
    scopes: [
      { value: 'team' as const, label: 'Equipe' },
      { value: 'manager' as const, label: 'Gestor' },
      { value: 'personal' as const, label: 'Pessoal' },
    ],
    widgets,
    layout,
    results,
    editing: null,
    preview: null,
    updatedAt: '2026-11-20T12:00:00.000Z',
    boardFilters: [{ id: 'pessoa', kind: 'person' as const, label: 'Pessoa' }],
    filterValues: EMPTY_BOARD_FILTER_VALUES,
    filterCounts: {},
    weight: 4,
    savedFilters: [],
    archivedFilters: [],
    editingFilter: null,
  };
  const state = {
    isLoading: false,
    isEditing: false,
    isSaving: false,
    isRefreshing: false,
    canEdit: true,
    canAdd: true,
    error: null,
    isFilterDialogOpen: false,
  };
  const noop = () => {};
  const actions = new Proxy({}, { get: () => noop }) as never;
</script>

<Story name="Default" args={{ data, state, actions }} />

<Story name="Editing" args={{ data, state: { ...state, isEditing: true }, actions }} />

<Story name="ReadOnly" args={{ data, state: { ...state, canEdit: false }, actions }} />

<Story name="Loading" args={{ data, state: { ...state, isLoading: true }, actions }} />

<Story name="Empty" args={{ data: { ...data, widgets: [], layout: [] }, state, actions }} />

<Story name="SaveError" args={{ data, state: { ...state, isEditing: true, error: 'Não salvei o painel. "Chamados": Escolha como agrupar.' }, actions }} />
