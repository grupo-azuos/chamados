<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type Widget, type WidgetData } from '@template/shared/schemas/dashboard-board.schema';

  import BoardWidget from './azuos-board-widget.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosBoardWidget',
    component: BoardWidget,
    parameters: { layout: 'padded' },
  });

  const base: Widget = {
    id: 'w1',
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

  const categories: WidgetData = {
    total: 31,
    grandTotal: 40,
    series: [
      { key: 'open', label: 'Aberto', value: 12 },
      { key: 'in_progress', label: 'Em atendimento', value: 9 },
      { key: 'waiting_requester', label: 'Aguardando quem pediu', value: 6 },
      { key: 'done', label: 'Resolvido', value: 4 },
    ],
    cells: [],
  };

  const days: WidgetData = {
    total: 18,
    grandTotal: 18,
    series: ['2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18'].map((key, index) => ({ key, label: key, value: index + 2 })),
    cells: [],
  };

  const cells: WidgetData = {
    total: 10,
    grandTotal: 10,
    series: [],
    cells: [
      { row: 'Ana Lima', rowLabel: 'Ana Lima', column: 'Em aberto', columnLabel: 'Em aberto', value: 4 },
      { row: 'Ana Lima', rowLabel: 'Ana Lima', column: 'Resolvido', columnLabel: 'Resolvido', value: 2 },
      { row: 'Caio Reis', rowLabel: 'Caio Reis', column: 'Em aberto', columnLabel: 'Em aberto', value: 4 },
    ],
  };

  const ok = (data: WidgetData) => ({ data, isLoading: false, error: null });
  const actions = { onEdit: () => {}, onRemove: () => {}, onChangeKind: () => {}, onOpenItem: () => {} };
  const view = (widget: Widget, data: WidgetData) => ({
    data: { widget, result: ok(data), filterName: null },
    state: { isEditing: false },
    actions,
  });
</script>

<Story name="Default" args={view(base, categories)}>
  {#snippet template(args)}<div class="h-80"><BoardWidget {...args} /></div>{/snippet}
</Story>

<Story name="Stats" args={view({ ...base, kind: 'stats', title: 'Chamados' }, categories)}>
  {#snippet template(args)}<div class="h-80"><BoardWidget {...args} /></div>{/snippet}
</Story>

<Story name="Donut" args={view({ ...base, kind: 'donut' }, categories)}>
  {#snippet template(args)}<div class="h-80"><BoardWidget {...args} /></div>{/snippet}
</Story>

<Story name="AreaInTime" args={view({ ...base, kind: 'area', groupBy: 'createdDay', title: 'Abertos por dia' }, days)}>
  {#snippet template(args)}<div class="h-80"><BoardWidget {...args} /></div>{/snippet}
</Story>

<Story name="Empty" args={view({ ...base, kind: 'list' }, { total: 0, grandTotal: 0, series: [], cells: [] })}>
  {#snippet template(args)}<div class="h-80"><BoardWidget {...args} /></div>{/snippet}
</Story>

<Story name="Stacked" args={view({ ...base, kind: 'stacked', groupBy: 'assignee', splitBy: 'open', title: 'Por responsável' }, cells)}>
  {#snippet template(args)}<div class="h-80"><BoardWidget {...args} /></div>{/snippet}
</Story>

<Story name="Radial" args={view({ ...base, kind: 'radial', groupBy: null, title: 'Em aberto' }, categories)}>
  {#snippet template(args)}<div class="h-80"><BoardWidget {...args} /></div>{/snippet}
</Story>

<Story name="LongTitleNarrow" args={view({ ...base, title: 'Chamados da Infraestrutura abertos pelo financeiro nos últimos trinta dias' }, categories)}>
  {#snippet template(args)}<div class="h-80 max-w-[280px]"><BoardWidget {...args} /></div>{/snippet}
</Story>

<Story name="Montando" args={{ ...view(base, categories), state: { isEditing: true } }}>
  {#snippet template(args)}<div class="h-80"><BoardWidget {...args} /></div>{/snippet}
</Story>

<Story name="Carregando" args={{ data: { widget: base, result: { data: null, isLoading: true, error: null }, filterName: null }, state: { isEditing: false }, actions }}>
  {#snippet template(args)}<div class="h-80"><BoardWidget {...args} /></div>{/snippet}
</Story>

<Story name="Erro" args={{ data: { widget: base, result: { data: null, isLoading: false, error: 'O filtro salvo está arquivado.' }, filterName: 'Só os urgentes' }, state: { isEditing: false }, actions }}>
  {#snippet template(args)}<div class="h-80"><BoardWidget {...args} /></div>{/snippet}
</Story>
