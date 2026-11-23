<!--
  @component
  A TELA DE TAREFAS — no molde do grupo: cabeçalho (título, modos de ver e "Nova tarefa") →
  números (Tarefas, Atrasadas, Vencem na semana) → busca e filtros → o conteúdo do modo escolhido
  → paginação (só lista e cards).

  Os modos são os do Paralegal: Lista, Cards, Quadro, Calendário e Timeline. "Atrasadas" pisca
  (só com `motion-safe`) quando há alguma, e clicar nele filtra as atrasadas.

  Função pura de props: recebe o model da lista inteiro (`data`/`state`/`actions`) mais o que é
  da tela — `today`, `now`, `canCreate` e `onNew`/`onRefuse`.
-->
<script lang="ts" module>
  import { type TaskListModel } from '$lib/hooks/use-task-list/use-task-list.svelte';
  import { type TaskMapModel } from '$lib/hooks/use-task-map/use-task-map.svelte';

  export type AzuosTaskListViewProps = {
    data: TaskListModel['data'] & { today: string; now?: Date; map: TaskMapModel['data'] };
    ui?: { canCreate?: boolean };
    state: TaskListModel['state'];
    actions: TaskListModel['actions'] & {
      onNew: () => void;
      onRefuse: (message: string) => void;
      map: TaskMapModel['actions'];
    };
  };
</script>

<script lang="ts">
  import AlarmClock from '@lucide/svelte/icons/alarm-clock';
  import CalendarClock from '@lucide/svelte/icons/calendar-clock';
  import ClipboardList from '@lucide/svelte/icons/clipboard-list';
  import ListChecks from '@lucide/svelte/icons/list-checks';
  import Plus from '@lucide/svelte/icons/plus';
  import {
    TASK_ORIGIN_LABELS,
    TASK_ORIGINS,
    TASK_STATUS_LABELS,
    TASK_STATUSES,
  } from '@template/shared/domain/task-flow.util';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import CardSurface from '$lib/components/azuos-card-surface/azuos-card-surface.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import PaginationBar from '$lib/components/azuos-pagination-bar/azuos-pagination-bar.svelte';
  import PersonPickerField from '$lib/components/azuos-person-picker-field/azuos-person-picker-field.svelte';
  import SegmentedControl from '$lib/components/azuos-segmented-control/azuos-segmented-control.svelte';
  import StatCard from '$lib/components/azuos-stat-card/azuos-stat-card.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import { TASK_VIEW_LABELS, TASK_VIEWS, type TaskView } from '$lib/hooks/use-task-list/use-task-list.svelte';
  import TaskBoard from '../azuos-task-board/azuos-task-board.svelte';
  import TaskCalendar from '../azuos-task-calendar/azuos-task-calendar.svelte';
  import TaskCard from '../azuos-task-card/azuos-task-card.svelte';
  import TaskRow from '../azuos-task-row/azuos-task-row.svelte';
  import TaskMap from '../azuos-task-map/azuos-task-map.svelte';
  import TaskTimeline from '../azuos-task-timeline/azuos-task-timeline.svelte';

  let { data, ui, state: viewState, actions }: AzuosTaskListViewProps = $props();

  const paged = $derived(data.view === 'list' || data.view === 'cards');
</script>

<section class="flex flex-col gap-6" aria-label="Tarefas">
  <PageHeader
    data={{ title: 'Tarefas', description: 'O trabalho da Infraestrutura: chamados, manutenções e o que for cadastrado à mão.' }}
    ui={{ icon: ListChecks }}
  >
    <div class="flex flex-wrap items-center gap-2">
      <SegmentedControl
        data={{ value: data.view, options: TASK_VIEWS.map((view) => ({ value: view, label: TASK_VIEW_LABELS[view] })) }}
        ui={{ ariaLabel: 'Modo de ver as tarefas' }}
        actions={{ onChange: (value: string) => actions.onViewChange(value as TaskView) }}
      />
      {#if ui?.canCreate !== false}
        <ActionButton
          data={{ label: 'Nova tarefa' }}
          ui={{ variant: 'primary', icon: Plus }}
          actions={{ onClick: actions.onNew }}
        />
      {/if}
    </div>
  </PageHeader>

  <div class="grid gap-3 sm:grid-cols-3">
    <StatCard
      data={{ label: 'Tarefas', value: data.total, hint: 'no recorte' }}
      ui={{ tone: 'info', icon: ClipboardList }}
      state={{ isLoading: viewState.isLoading }}
    />
    <div class="relative">
      <StatCard
        data={{ label: 'Atrasadas', value: data.alerts.overdue, tooltip: 'Clique para ver só as atrasadas' }}
        ui={{ tone: 'danger', icon: AlarmClock }}
        state={{ isLoading: viewState.isLoading, isSelected: data.filter.overdue }}
        actions={{ onClick: () => actions.onFilterChange('overdue', !data.filter.overdue) }}
      />
      {#if data.alerts.overdue > 0}
        <span class="pointer-events-none absolute top-3 right-3 flex size-3" aria-hidden="true">
          <span class="bg-destructive absolute inline-flex size-full rounded-full motion-safe:animate-ping"></span>
          <span class="bg-destructive relative inline-flex size-3 rounded-full"></span>
        </span>
      {/if}
    </div>
    <StatCard
      data={{ label: 'Vencem na semana', value: data.alerts.dueSoon }}
      ui={{ tone: 'warning', icon: CalendarClock }}
      state={{ isLoading: viewState.isLoading }}
    />
  </div>

  <CardSurface ui={{ className: 'flex flex-col gap-3 p-4' }}>
    <div class="grid items-end gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <TextField
        data={{ label: 'Buscar', name: 'search', value: data.filter.search, placeholder: 'Título ou descrição' }}
        actions={{ onChange: actions.onSearchChange }}
      />
      <div class="flex flex-col gap-1.5">
        <span class="text-ink-700 text-sm font-medium">Responsável</span>
        <PersonPickerField
          data={{ value: data.filter.ownerId, people: data.people, leading: [{ value: '', label: 'Todos os responsáveis' }] }}
          ui={{ ariaLabel: 'Responsável' }}
          actions={{ onChange: (id: string) => actions.onFilterChange('ownerId', id) }}
        />
      </div>
      <div class="flex flex-col gap-1.5">
        <span class="text-ink-700 text-sm font-medium">Situação</span>
        <OptionPicker
          data={{ value: data.filter.status, options: TASK_STATUSES.map((status) => ({ value: status, label: TASK_STATUS_LABELS[status] })) }}
          ui={{ ariaLabel: 'Situação', allLabel: 'Todas', mode: 'combobox', fullWidth: true }}
          actions={{ onChange: (value: string) => actions.onFilterChange('status', value as typeof data.filter.status) }}
        />
      </div>
      <div class="flex flex-col gap-1.5">
        <span class="text-ink-700 text-sm font-medium">Origem</span>
        <OptionPicker
          data={{ value: data.filter.origin, options: TASK_ORIGINS.map((origin) => ({ value: origin, label: TASK_ORIGIN_LABELS[origin] })) }}
          ui={{ ariaLabel: 'Origem', allLabel: 'Todas', mode: 'combobox', fullWidth: true }}
          actions={{ onChange: (value: string) => actions.onFilterChange('origin', value as typeof data.filter.origin) }}
        />
      </div>
    </div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <span class="text-muted-foreground text-sm font-medium">Mostrar</span>
        <SegmentedControl
          data={{ value: data.filter.mine ? 'mine' : 'team', options: [{ value: 'team', label: 'Da equipe' }, { value: 'mine', label: 'Minhas' }] }}
          ui={{ ariaLabel: 'Tarefas da equipe ou só as minhas' }}
          actions={{ onChange: (value: string) => actions.onFilterChange('mine', value === 'mine') }}
        />
      </div>
      {#if data.activeFilterCount > 0}
        <ActionButton
          data={{ label: 'Limpar filtros' }}
          ui={{ variant: 'ghost', size: 'sm' }}
          actions={{ onClick: actions.onClearFilters }}
        />
      {/if}
    </div>
  </CardSurface>

  {#if viewState.actionError}
    <ErrorState data={{ message: viewState.actionError }} ui={{ variant: 'inline' }} />
  {/if}

  {#if viewState.error}
    <ErrorState data={{ message: viewState.error }} actions={{ onRetry: actions.onRetry }} />
  {:else if viewState.isEmpty && paged}
    <EmptyState data={{ title: 'Nenhuma tarefa ainda', description: 'Os chamados de Infraestrutura e as manutenções que vencem viram tarefa sozinhos. Para o resto, use "Nova tarefa".' }} />
  {:else if viewState.isFilteredOut && paged}
    <EmptyState data={{ title: 'Nada com esses filtros', description: 'Tire algum filtro para ver mais tarefas.' }} />
  {:else if data.view === 'list'}
    <ul class="flex flex-col gap-2" aria-label="Lista de tarefas">
      {#each data.tasks as task (task.id)}
        <li><TaskRow data={{ task, now: data.now }} actions={{ onOpen: actions.onOpen }} /></li>
      {/each}
    </ul>
  {:else if data.view === 'cards'}
    <!-- Os cards são filhos diretos da grade (como no Inventário): um invólucro entre eles quebra
         a altura igual da linha. -->
    <div class="card-grid" data-slot="task-cards">
      {#each data.tasks as task (task.id)}
        <TaskCard
          data={{ task, now: data.now }}
          actions={{ onOpen: actions.onOpen, onMove: actions.onMove, onRemove: actions.onAskRemove }}
        />
      {/each}
    </div>
  {:else if data.view === 'board'}
    <TaskBoard
      data={{ tasks: data.tasks, now: data.now }}
      state={{ isMoving: viewState.isMutating }}
      actions={{ onOpen: actions.onOpen, onMove: actions.onMove, onRefuse: actions.onRefuse }}
    />
  {:else if data.view === 'calendar'}
    <TaskCalendar
      data={{ tasks: data.tasks, month: data.month, now: data.now }}
      actions={{ onOpen: actions.onOpen, onRangeChange: actions.onRangeChange }}
    />
  {:else if data.view === 'map'}
    <TaskMap
      data={{
        tasks: data.tasks,
        people: data.people,
        peopleIds: data.map.peopleIds,
        positions: data.map.positions,
        now: data.now,
      }}
      state={{ isLoading: viewState.isLoading }}
      actions={actions.map}
    />
  {:else}
    <TaskTimeline
      data={{ tasks: data.tasks, window: data.window, zoom: data.zoom, today: data.today, now: data.now }}
      state={{ isLoading: viewState.isLoading }}
      actions={{
        onShift: actions.onShiftWindow,
        onToday: actions.onWindowToday,
        onZoom: actions.onZoom,
        onOpen: actions.onOpen,
      }}
    />
  {/if}

  {#if viewState.isTruncated}
    <p class="text-muted-foreground text-xs" role="status">
      Mostrando {data.tasks.length} de {data.total}. Use os filtros para ver o resto.
    </p>
  {/if}

  {#if paged}
    <PaginationBar
      data={{ page: data.page, pageSize: data.pageSize, total: data.total, noun: ['tarefa', 'tarefas'] }}
      state={{ isLoading: viewState.isLoading }}
      actions={{ onPageChange: actions.onPageChange }}
    />
  {/if}
</section>
