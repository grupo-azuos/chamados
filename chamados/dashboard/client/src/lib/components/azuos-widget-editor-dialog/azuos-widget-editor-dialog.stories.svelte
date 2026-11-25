<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type Widget } from '@template/shared/schemas/dashboard-board.schema';

  import WidgetEditorDialog from './azuos-widget-editor-dialog.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosWidgetEditorDialog',
    component: WidgetEditorDialog,
  });

  const widget: Widget = {
    id: 'w1',
    kind: 'column',
    title: 'Chamados por situação',
    source: 'infraTickets',
    groupBy: 'status',
    splitBy: null,
    filterId: null,
    onlyMine: false,
    period: '30d',
    window: null,
  };
  const preview = {
    data: { total: 12, grandTotal: 20, series: [{ key: 'open', label: 'Aberto', value: 8 }, { key: 'done', label: 'Resolvido', value: 4 }], cells: [] },
    isLoading: false,
    error: null,
  };
  const actions = { onClose: () => {}, onSubmit: () => {}, onPreviewChange: () => {} };
</script>

<Story name="Default" args={{ data: { editing: { widget, isNew: false }, filters: [], preview }, actions }} />

<Story name="New" args={{ data: { editing: { widget: { ...widget, title: 'Chamados' }, isNew: true }, filters: [], preview }, actions }} />

<Story name="Agenda" args={{ data: { editing: { widget: { ...widget, kind: 'agenda', groupBy: 'createdDay', window: { mode: 'relative', unit: 'month', count: 1, direction: 'next' } }, isNew: false }, filters: [], preview }, actions }} />

<Story name="LoadingPreview" args={{ data: { editing: { widget, isNew: false }, filters: [], preview: { data: null, isLoading: true, error: null } }, actions }} />

<!-- Caso limite: título no limite de 60 caracteres. -->
<Story name="LongTitle" args={{ data: { editing: { widget: { ...widget, title: 'Chamados da Infraestrutura abertos pelo financeiro em 2026' }, isNew: false }, filters: [], preview }, actions }} />
