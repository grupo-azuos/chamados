<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type LayoutItem, type Widget } from '@template/shared/schemas/dashboard-board.schema';

  import BoardCanvas from './azuos-board-canvas.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosBoardCanvas',
    component: BoardCanvas,
    parameters: { layout: 'padded' },
  });

  const widget = (id: string, kind: Widget['kind'], title: string, groupBy: string | null): Widget => ({
    id,
    kind,
    title,
    source: 'infraTickets',
    groupBy,
    splitBy: null,
    filterId: null,
    onlyMine: false,
    period: 'all',
    window: null,
  });

  const widgets = [
    widget('a', 'stats', 'Chamados', 'open'),
    widget('b', 'column', 'Chamados por situação', 'status'),
    widget('c', 'donut', 'Por prioridade', 'priority'),
  ];
  const layout: LayoutItem[] = [
    { i: 'a', x: 0, y: 0, w: 4, h: 1 },
    { i: 'b', x: 0, y: 1, w: 2, h: 2 },
    { i: 'c', x: 2, y: 1, w: 2, h: 2 },
  ];
  const series = [
    { key: 'open', label: 'Aberto', value: 8 },
    { key: 'done', label: 'Resolvido', value: 5 },
  ];
  const results = Object.fromEntries(
    widgets.map((item) => [item.id, { data: { total: 13, grandTotal: 20, series, cells: [] }, isLoading: false, error: null }]),
  );
  const actions = { onLayoutChange: () => {}, onEditWidget: () => {}, onRemoveWidget: () => {}, onChangeKind: () => {}, onDropKind: () => {} };
</script>

<Story name="Default" args={{ data: { widgets, layout, results, filterNames: {} }, state: { isEditing: false }, actions }} />

<Story name="Editing" args={{ data: { widgets, layout, results, filterNames: {} }, state: { isEditing: true, canDrop: true }, actions }} />

<Story name="Loading" args={{ data: { widgets, layout, results: {}, filterNames: {} }, state: { isEditing: false }, actions }} />

<!-- Caso limite: um bloco só, ocupando a grade inteira. -->
<Story name="SingleBlock" args={{ data: { widgets: [widgets[1]!], layout: [{ i: 'b', x: 0, y: 0, w: 4, h: 3 }], results, filterNames: {} }, state: { isEditing: false }, actions }} />

<!-- Caso limite: montando um painel vazio — só as casas da grade, à espera do primeiro bloco. -->
<Story name="EmptyEditing" args={{ data: { widgets: [], layout: [], results: {}, filterNames: {} }, state: { isEditing: true, canDrop: true }, actions }} />
