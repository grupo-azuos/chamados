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
</script>

<Story name="Default" args={{ data: { widget: base, result: ok(categories), noun: 'chamados' }, ui: { className: 'h-80' } }} />

<Story name="Stats" args={{ data: { widget: { ...base, kind: 'stats', title: 'Chamados' }, result: ok(categories), noun: 'chamados' } }} />

<Story name="Donut" args={{ data: { widget: { ...base, kind: 'donut' }, result: ok(categories), noun: 'chamados' }, ui: { className: 'h-80' } }} />

<Story name="AreaInTime" args={{ data: { widget: { ...base, kind: 'area', groupBy: 'createdDay', title: 'Abertos por dia' }, result: ok(days), noun: 'chamados', hint: 'Últimos 7 dias' }, ui: { className: 'h-80' } }} />

<Story name="Stacked" args={{ data: { widget: { ...base, kind: 'stacked', groupBy: 'assignee', splitBy: 'open', title: 'Por responsável' }, result: ok(cells), noun: 'chamados' }, ui: { className: 'h-80' } }} />

<Story name="Radial" args={{ data: { widget: { ...base, kind: 'radial', groupBy: null, title: 'Em aberto' }, result: ok(categories), noun: 'chamados' }, ui: { className: 'h-80' } }} />

<Story name="Loading" args={{ data: { widget: base, result: { data: null, isLoading: true, error: null }, noun: 'chamados' }, ui: { className: 'h-80' } }} />

<Story name="Error" args={{ data: { widget: base, result: { data: null, isLoading: false, error: 'O filtro "Urgentes" está arquivado.' }, noun: 'chamados' }, ui: { className: 'h-80' } }} />

<Story name="Empty" args={{ data: { widget: base, result: ok({ total: 0, grandTotal: 0, series: [], cells: [] }), noun: 'chamados' }, ui: { className: 'h-80' } }} />

<!-- Caso limite: título comprido num bloco estreito. -->
<Story name="LongTitleNarrow" args={{ data: { widget: { ...base, title: 'Chamados da Infraestrutura abertos pelo financeiro nos últimos trinta dias' }, result: ok(categories), noun: 'chamados' }, ui: { className: 'h-80 max-w-[280px]' } }} />
