<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { EMPTY_BOARD_FILTER_VALUES, MAX_BOARD_WEIGHT, type Widget } from '@template/shared/schemas/dashboard-board.schema';

  import BoardStudio from './azuos-board-studio.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosBoardStudio',
    component: BoardStudio,
    parameters: { layout: 'fullscreen' },
  });

  const widgets: Widget[] = [
    { id: 'a', kind: 'stats', title: 'Chamados', source: 'infraTickets', groupBy: 'open', splitBy: null, filterId: null, onlyMine: false, period: 'all', window: null },
    { id: 'b', kind: 'column', title: 'Chamados por situação', source: 'infraTickets', groupBy: 'status', splitBy: null, filterId: null, onlyMine: false, period: 'all', window: null },
  ];
  const series = [
    { key: 'open', label: 'Aberto', value: 8 },
    { key: 'done', label: 'Resolvido', value: 5 },
  ];
  const results = Object.fromEntries(widgets.map((widget) => [widget.id, { data: { total: 13, grandTotal: 20, series, cells: [] }, isLoading: false, error: null }]));
  const data = {
    scopeLabel: 'Equipe',
    widgets,
    layout: [
      { i: 'a', x: 0, y: 0, w: 4, h: 1 },
      { i: 'b', x: 0, y: 1, w: 2, h: 2 },
    ],
    results,
    filterNames: {},
    boardFilters: [{ id: 'person', kind: 'person' as const, label: 'Pessoa' }],
    filterValues: EMPTY_BOARD_FILTER_VALUES,
    filterCounts: {},
    weight: 5,
  };
  const noop = () => {};
  const actions = {
    onFilterValueChange: noop,
    onAddBoardFilter: noop,
    onRemoveBoardFilter: noop,
    onBoardFilterDisplayChange: noop,
    onBoardFilterWidthChange: noop,
    onBoardFilterPlaceChange: noop,
    onClearFilterValues: noop,
    onLayoutChange: noop,
    onNewWidget: noop,
    onEditWidget: noop,
    onRemoveWidget: noop,
    onChangeKind: noop,
    onOpenFilters: noop,
    onCancel: noop,
    onSave: noop,
  };
</script>

<Story name="Default" args={{ data, state: { isOpen: true, isSaving: false, canAdd: true, error: null }, actions }} />

<Story name="Guardando" args={{ data, state: { isOpen: true, isSaving: true, canAdd: true, error: null }, actions }} />

<Story name="Erro ao guardar" args={{ data, state: { isOpen: true, isSaving: false, canAdd: true, error: 'Não consegui guardar o painel.' }, actions }} />

<!-- Caso limite: a cota inteira usada — a paleta fica toda desligada. -->
<Story name="Cota cheia" args={{ data: { ...data, weight: MAX_BOARD_WEIGHT }, state: { isOpen: true, isSaving: false, canAdd: false, error: null }, actions }} />
