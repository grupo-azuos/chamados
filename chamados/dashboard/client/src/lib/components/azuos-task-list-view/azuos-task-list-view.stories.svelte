<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import { TEST_NOW, taskFixture } from '$lib/utils/task-fixture.test-support';
  import Component from './azuos-task-list-view.svelte';

  const { Story } = defineMeta({
    title: 'Features/Tasks/AzuosTaskListView',
    component: Component,
    tags: ['autodocs'],
    parameters: { layout: 'fullscreen' },
  });

  const tasks = [
    taskFixture({ dueDate: '2026-11-20' }),
    taskFixture({ id: 2, title: 'Impressora da recepção', origin: 'ticket', ticketId: 56, steps: [], progress: { done: 0, total: 0 } }),
    taskFixture({ id: 3, title: 'Preventiva — Computador 04', origin: 'maintenance', computerId: 4, owner: null }),
    taskFixture({ id: 4, title: 'Organizar o rack', status: 'done', progress: { done: 2, total: 2 } }),
  ];
  const data = {
    area: 'infra' as const,
    view: 'list' as const,
    tasks,
    total: tasks.length,
    alerts: { overdue: 1, dueSoon: 2 },
    filter: { search: '', status: '' as const, origin: '' as const, ownerId: '', mine: false, overdue: false, archived: 'hide' as const },
    activeFilterCount: 0,
    page: 1,
    pageSize: 15,
    month: '2026-11',
    window: { from: '2026-11-16', to: '2026-12-20' },
    zoom: 'month' as const,
    map: { peopleIds: [], positions: {} },
    stages: [],
    people: [],
    selected: null,
    removing: null,
    today: '2026-11-23',
    now: TEST_NOW,
  };
  const state = { isLoading: false, isEmpty: false, isFilteredOut: false, isTruncated: false, isMutating: false, error: null, actionError: null };
  const actions = {
    onViewChange: fn(), onSearchChange: fn(), onFilterChange: fn(), onClearFilters: fn(), onPageChange: fn(),
    onMonthChange: fn(), onRangeChange: fn(), onShiftWindow: fn(), onWindowToday: fn(), onZoom: fn(), onOpen: fn(), onClose: fn(), onMove: fn(), onStage: fn(), onToggleStep: fn(), onRemoveLink: fn(),
    onAskRemove: fn(), onCancelRemove: fn(), onConfirmRemove: fn(),
    onRestore: fn(), onRetry: fn(), onNew: fn(), onRefuse: fn(),
    map: { onPeopleChange: fn(), onIslandMove: fn(), onResetLayout: fn() },
    onNewStage: fn(),
    onEditStage: fn(),
  };
</script>

<Story name="Lista" args={{ data, state, actions }} />
<Story name="Carregando" args={{ data: { ...data, tasks: [] }, state: { ...state, isLoading: true }, actions }} />
<Story name="Quadro" args={{ data: { ...data, view: 'board' }, state, actions }} />
<Story name="Calendario" args={{ data: { ...data, view: 'calendar' }, state, actions }} />
<Story name="Timeline" args={{ data: { ...data, view: 'timeline' }, state, actions }} />
<Story name="Mapa" args={{ data: { ...data, view: 'map' }, state, actions }} />
<Story name="Vazia" args={{ data: { ...data, tasks: [], total: 0, alerts: { overdue: 0, dueSoon: 0 } }, state: { ...state, isEmpty: true }, actions }} />
<Story name="ComErro" args={{ data: { ...data, tasks: [] }, state: { ...state, error: 'A API está fora do ar.' }, actions }} />
