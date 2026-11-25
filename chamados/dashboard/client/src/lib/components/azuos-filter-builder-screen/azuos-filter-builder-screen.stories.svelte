<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type SavedFilter } from '@template/shared/schemas/dashboard-board.schema';

  import FilterBuilderScreen from './azuos-filter-builder-screen.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosFilterBuilderScreen',
    component: FilterBuilderScreen,
  });

  const filter: SavedFilter = {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Urgentes do mês',
    description: 'Alta prioridade, abertos neste mês',
    source: 'infraTickets',
    scope: 'shared',
    tree: { id: 'g', combinator: 'and', rules: [{ id: 'r1', field: 'priority', operator: '=', value: 'high' }] },
    ownerId: 'u-ana',
    ownerName: 'Ana Lima',
    canEdit: true,
    archive: null,
    updatedAt: '2026-11-20T12:00:00.000Z',
  };
  const archived = { ...filter, id: '00000000-0000-4000-8000-000000000002', name: 'Antigos', archive: { archivedAt: '2026-11-19T12:00:00.000Z', archivedBy: 'u-ana' } };
  const actions = { onClose: () => {}, onNew: () => {}, onEdit: () => {}, onCancelEdit: () => {}, onSave: () => {}, onArchive: () => {}, onRestore: () => {} };
</script>

<Story name="Default" args={{ data: { module: 'infra', filters: [filter], archived: [archived], editing: null }, state: { isOpen: true }, actions }} />

<Story name="Empty" args={{ data: { module: 'infra', filters: [], archived: [], editing: null }, state: { isOpen: true }, actions }} />

<Story name="Editing" args={{ data: { module: 'infra', filters: [filter], archived: [], editing: filter }, state: { isOpen: true }, actions }} />

<Story name="New" args={{ data: { module: 'manutencao', filters: [], archived: [], editing: 'new' }, state: { isOpen: true }, actions }} />

<Story name="SaveError" args={{ data: { module: 'infra', filters: [filter], archived: [], editing: filter }, state: { isOpen: true, error: 'O filtro passa de 50 condições.' }, actions }} />
