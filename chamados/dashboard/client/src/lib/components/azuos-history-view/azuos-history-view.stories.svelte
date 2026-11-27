<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type HistoryEntry } from '@template/shared/schemas/history.schema';
  import { fn } from 'storybook/test';

  import { EMPTY_HISTORY_FILTER } from '$lib/hooks/use-history/use-history.svelte';
  import HistoryView from './azuos-history-view.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosHistoryView',
    component: HistoryView,
    parameters: { layout: 'padded' },
  });

  const entries: HistoryEntry[] = [
    {
      id: '3',
      action: 'tickets.update',
      kind: 'updated',
      target: { type: 'tickets', id: '7', label: 'CH-2026-0007' },
      changes: [{ field: 'status', from: null, to: 'resolved' }],
      actor: { id: 'u-exemplo-1', name: 'Pessoa de exemplo' },
      occurredAt: '2026-11-20T13:00:00.000Z',
    },
    {
      id: '2',
      action: 'maintenances.create',
      kind: 'created',
      target: { type: 'maintenances', id: '12', label: null },
      changes: [],
      actor: { id: null, name: null },
      occurredAt: '2026-11-19T09:30:00.000Z',
    },
    {
      id: '1',
      action: 'parts.remove',
      kind: 'archived',
      target: { type: 'parts', id: '4', label: 'Fonte ATX 500 W' },
      changes: [],
      actor: { id: 'u-exemplo-2', name: 'Outra pessoa de exemplo' },
      occurredAt: '2026-11-18T17:45:00.000Z',
    },
  ];

  const actions = { onFilterChange: fn(), onClearFilters: fn(), onPageChange: fn(), onRetry: fn() };
  const data = { module: 'infra' as const, entries, filter: EMPTY_HISTORY_FILTER, page: 1, pageSize: 50, total: 3 };
  const idle = { isLoading: false, isFetching: false, error: null };
</script>

<Story name="Default" args={{ data, state: idle, actions }} />

<Story name="Carregando" args={{ data: { ...data, entries: [], total: 0 }, state: { ...idle, isLoading: true }, actions }} />

<Story name="Vazio" args={{ data: { ...data, entries: [], total: 0 }, state: idle, actions }} />

<Story
  name="Filtrado sem resultado"
  args={{ data: { ...data, entries: [], total: 0, filter: { ...EMPTY_HISTORY_FILTER, who: 'mine' } }, state: idle, actions }}
/>

<Story name="Falhou" args={{ data: { ...data, entries: [], total: 0 }, state: { ...idle, error: 'Serviço fora do ar.' }, actions }} />

<!-- Caso limite: muitas páginas e um alvo de nome comprido, que quebra a linha. -->
<Story
  name="Muitas páginas"
  args={{
    data: {
      ...data,
      total: 312,
      page: 2,
      entries: [{ ...entries[0]!, target: { type: 'inventory-items', id: '9', label: 'Cadeira giratória de escritório com apoio de braço regulável e encosto em tela' } }],
    },
    state: idle,
    actions,
  }}
/>
