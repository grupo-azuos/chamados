<!--
  @component
  A TELA DE TAREFAS — no molde do grupo: cabeçalho (título e "Nova tarefa") → números (Tarefas,
  Atrasadas, Vencem na semana) → barra de ferramentas (busca, filtros, o modo de ver) → o conteúdo
  do modo escolhido → paginação (só a lista).

  Os modos são Lista, Quadro, Calendário, Timeline e Mapa. A lista é a tabela OU a grade de cards,
  pela troca do sistema inteiro (`AzuosTableViewToggle`, no fim da barra). "Atrasadas" leva o selo
  vermelho do card quando há alguma, e clicar nele filtra as atrasadas.

  Função pura de props: recebe o model da lista inteiro (`data`/`state`/`actions`) mais o que é
  da tela — `today`, `now`, `canCreate` e `onNew`/`onRefuse`.
-->
<script lang="ts" module>
  import {
    TASK_ORIGIN_LABELS,
    TASK_ORIGINS,
    TASK_STATUS_LABELS,
    TASK_STATUSES,
  } from '@template/shared/domain/task-flow.util';
  import { type TaskListModel } from '$lib/hooks/use-task-list/use-task-list.svelte';
  import { type TaskMapModel } from '$lib/hooks/use-task-map/use-task-map.svelte';
  import { type AzuosFilterPanelProps } from '$lib/components/azuos-filter-panel/azuos-filter-panel.svelte';
  import { type TaskStage } from '@template/shared/schemas/task-stage.schema';

  export type AzuosTaskListViewProps = {
    data: TaskListModel['data'] & {
      today: string;
      now?: Date;
      map: TaskMapModel['data'];
      /** As situações próprias da área: as colunas do quadro e o filtro "Situação". */
      stages: TaskStage[];
      /** O começo do endereço da área (`/infra`, `/system`): para onde o mapa leva. */
      base?: string;
    };
    ui?: { canCreate?: boolean };
    state: TaskListModel['state'];
    actions: TaskListModel['actions'] & {
      onNew: () => void;
      onRefuse: (message: string) => void;
      map: TaskMapModel['actions'];
      /** "+ Nova situação" e o lápis da coluna própria: abrem o diálogo da situação. */
      onNewStage: () => void;
      onEditStage: (stage: TaskStage) => void;
    };
  };

  /** O que a tela diz de cada área: de onde as tarefas dela nascem. */
  const AREA_TEXT: Record<TaskListModel['data']['area'], { description: string; empty: string }> = {
    infra: {
      description: 'O trabalho da Infraestrutura: chamados, manutenções e o que for cadastrado à mão.',
      empty: 'Os chamados de Infraestrutura e as manutenções que vencem viram tarefa sozinhos. Para o resto, use "Nova tarefa".',
    },
    sistema: {
      description: 'O trabalho de Sistema: os chamados dos sistemas e o que for cadastrado à mão.',
      empty: 'Os chamados de Sistema viram tarefa sozinhos. Para o resto, use "Nova tarefa".',
    },
    manutencao: {
      description: 'O trabalho da Manutenção: os chamados e o que for cadastrado à mão.',
      empty: 'Os chamados da Manutenção viram tarefa sozinhos. Para o resto, use "Nova tarefa".',
    },
  };

  /**
   * O painel de filtros das tarefas: a busca, o responsável à vista (fora do mapa, que tem o campo
   * de pessoas dele) e, atrás do "Filtros", situação (as fixas e as próprias), origem e prazo.
   */
  export function taskFilterPanelOf(data: AzuosTaskListViewProps['data']): AzuosFilterPanelProps['data'] {
    const { filter } = data;
    const situations = [
      ...TASK_STATUSES.map((status) => ({ value: status, label: TASK_STATUS_LABELS[status] })),
      ...data.stages.map((stage) => ({ value: `stage:${stage.id}`, label: stage.label })),
    ];
    const origins = TASK_ORIGINS.map((origin) => ({ value: origin, label: TASK_ORIGIN_LABELS[origin] }));
    const deadlines = [{ value: 'overdue', label: 'Atrasadas' }];
    const owner = data.people.find((person) => person.id === filter.ownerId);
    const chips = [
      owner ? { key: 'ownerId', label: `Responsável: ${owner.name}` } : null,
      filter.status ? { key: 'status', label: situations.find((item) => item.value === filter.status)?.label ?? filter.status } : null,
      filter.origin ? { key: 'origin', label: TASK_ORIGIN_LABELS[filter.origin] } : null,
      filter.overdue ? { key: 'deadline', label: 'Atrasadas' } : null,
    ].filter((chip): chip is { key: string; label: string } => chip !== null);

    return {
      search: { value: filter.search, placeholder: 'Título ou descrição' },
      primary:
        data.view === 'map'
          ? undefined
          : {
              key: 'ownerId',
              label: 'Responsável',
              control: 'person',
              ariaLabel: 'Responsável',
              allLabel: 'Todos os responsáveis',
              value: filter.ownerId,
              options: [],
              people: data.people,
            },
      fields: [
        { key: 'status', label: 'Situação', control: 'select', ariaLabel: 'Situação', allLabel: 'Todas', value: filter.status, options: situations },
        { key: 'origin', label: 'Origem', control: 'pills', ariaLabel: 'Origem', allLabel: 'Todas', value: filter.origin, options: origins },
        { key: 'deadline', label: 'Prazo', control: 'pills', ariaLabel: 'Prazo', allLabel: 'Todos', value: filter.overdue ? 'overdue' : '', options: deadlines },
      ],
      chips,
      canClear: chips.length > 0 || filter.search.trim() !== '',
    };
  }
</script>

<script lang="ts">
  import { taskLinkKindsOf } from '@template/shared/domain/task-flow.util';
  import AlarmClock from '@lucide/svelte/icons/alarm-clock';
  import CalendarClock from '@lucide/svelte/icons/calendar-clock';
  import ClipboardList from '@lucide/svelte/icons/clipboard-list';
  import ListChecks from '@lucide/svelte/icons/list-checks';
  import Plus from '@lucide/svelte/icons/plus';
  import SearchX from '@lucide/svelte/icons/search-x';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import FilterPanel from '$lib/components/azuos-filter-panel/azuos-filter-panel.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import ListToolbar from '$lib/components/azuos-list-toolbar/azuos-list-toolbar.svelte';
  import SegmentedControl from '$lib/components/azuos-segmented-control/azuos-segmented-control.svelte';
  import { Skeleton } from '$lib/components/azuos-skeleton/azuos-skeleton';
  import StatCardGrid from '$lib/components/azuos-stat-card-grid/azuos-stat-card-grid.svelte';
  import ContentCard from '$lib/components/azuos-content-card/azuos-content-card.svelte';
  import { TASK_VIEW_LABELS, TASK_VIEWS, type TaskView } from '$lib/hooks/use-task-list/use-task-list.svelte';
  import TaskBoard from '$lib/components/azuos-task-board/azuos-task-board.svelte';
  import TaskCalendar from '$lib/components/azuos-task-calendar/azuos-task-calendar.svelte';
  import TaskCard from '$lib/components/azuos-task-card/azuos-task-card.svelte';
  import TaskTable from '$lib/components/azuos-task-table/azuos-task-table.svelte';
  import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';
  import { cn } from '$lib/utils/cn';
  import TaskMap from '$lib/components/azuos-task-map/azuos-task-map.svelte';
  import TaskTimeline from '$lib/components/azuos-task-timeline/azuos-task-timeline.svelte';

  let { data, ui, state: viewState, actions }: AzuosTaskListViewProps = $props();

  const paged = $derived(data.view === 'list');
  const tableView = useTableViewModel();
  const cardActions = $derived({
    onOpen: actions.onOpen,
    onMove: actions.onMove,
    onRemove: actions.onAskRemove,
    onRestore: actions.onRestore,
  });

  const WHO_OPTIONS = [
    { value: 'team', label: 'Da equipe' },
    { value: 'mine', label: 'Minhas' },
  ];
  const ARCHIVED_OPTIONS = [
    { value: 'hide', label: 'Em uso' },
    { value: 'only', label: 'Arquivadas' },
  ];

  /** Um campo do painel vira o filtro da tela ("Prazo: Atrasadas" é o `overdue`). */
  function changeField(key: string, value: string) {
    if (key === 'deadline') return actions.onFilterChange('overdue', value === 'overdue');
    if (key === 'ownerId') return actions.onFilterChange('ownerId', value);
    if (key === 'origin') return actions.onFilterChange('origin', value as typeof data.filter.origin);
    actions.onFilterChange('status', value as typeof data.filter.status);
  }
</script>

<section class="flex flex-col gap-6" aria-label="Tarefas">
  <PageHeader
    data={{ title: 'Tarefas', description: AREA_TEXT[data.area].description }}
    ui={{ icon: ListChecks }}
  >
    {#if ui?.canCreate !== false}
      <ActionButton
        data={{ label: 'Nova tarefa' }}
        ui={{ variant: 'primary', icon: Plus }}
        actions={{ onClick: actions.onNew }}
      />
    {/if}
  </PageHeader>

  <StatCardGrid>
    <ContentCard data={{ label: 'Tarefas', title: 'Tarefas', highlight: { value: data.total, hint: 'no recorte' } }} ui={{ icon: ClipboardList, iconTone: 'info' }} state={{ isLoading: viewState.isLoading }} />
    <ContentCard
      data={{
        label: 'Atrasadas',
        title: 'Atrasadas',
        meta: 'Clique para ver só as atrasadas',
        highlight: { value: data.alerts.overdue },
        alert: data.alerts.overdue > 0 ? { count: data.alerts.overdue, message: 'Há tarefas atrasadas' } : null,
      }}
      ui={{ icon: AlarmClock, iconTone: 'danger' }}
      state={{ isLoading: viewState.isLoading, isSelected: data.filter.overdue }}
      actions={{ onOpen: () => actions.onFilterChange('overdue', !data.filter.overdue) }}
    />
    <ContentCard data={{ label: 'Vencem na semana', title: 'Vencem na semana', highlight: { value: data.alerts.dueSoon } }} ui={{ icon: CalendarClock, iconTone: 'warning' }} state={{ isLoading: viewState.isLoading }} />
  </StatCardGrid>

  <!-- O cartão de filtros do grupo (o do Inventário e dos Chamados, como o do Paralegal): à vista a
       busca e o responsável; situação, origem e prazo atrás do "Filtros"; embaixo, o que MOSTRA. -->
  <FilterPanel
    data={taskFilterPanelOf(data)}
    ui={{ ariaLabel: 'Filtros das tarefas' }}
    actions={{
      onSearchChange: actions.onSearchChange,
      onFieldChange: (key: string, value: string) => changeField(key, value),
      onClearFilters: actions.onClearFilters,
    }}
  >
    {#snippet toggles()}
      <span class="text-muted-foreground text-sm font-medium">Ver</span>
      <SegmentedControl
        data={{ value: data.view, options: TASK_VIEWS.map((view) => ({ value: view, label: TASK_VIEW_LABELS[view] })) }}
        ui={{ ariaLabel: 'Modo de ver as tarefas' }}
        actions={{ onChange: (value: string) => actions.onViewChange(value as TaskView) }}
      />
      <span class="text-muted-foreground text-sm font-medium">Mostrar</span>
      {#if data.view !== 'map'}
        <SegmentedControl
          data={{ value: data.filter.mine ? 'mine' : 'team', options: WHO_OPTIONS }}
          ui={{ ariaLabel: 'Tarefas da equipe ou só as minhas' }}
          actions={{ onChange: (value: string) => actions.onFilterChange('mine', value === 'mine') }}
        />
      {/if}
      <SegmentedControl
        data={{ value: data.filter.archived, options: ARCHIVED_OPTIONS }}
        ui={{ ariaLabel: 'Em uso ou arquivadas' }}
        actions={{ onChange: (value: string) => actions.onFilterChange('archived', value as 'hide' | 'only') }}
      />
    {/snippet}
  </FilterPanel>

  <!-- A barra da lista (só na lista, a única que pagina): cards ou tabela à esquerda, as páginas
       à direita — a lista pagina no servidor nos dois formatos. -->
  {#if paged && !viewState.isLoading && !viewState.error && !viewState.isEmpty}
    {@render listToolbar('top')}
  {/if}

  {#if viewState.actionError}
    <ErrorState data={{ message: viewState.actionError }} ui={{ variant: 'inline' }} />
  {/if}

  {#if viewState.error}
    <ErrorState data={{ title: 'A lista de tarefas não carregou', message: viewState.error }} actions={{ onRetry: actions.onRetry }} />
  {:else if viewState.isLoading && paged}
    <!-- O esqueleto tem a forma da grade: sem ele, a tela pula quando a lista chega. -->
    <div class="card-grid" aria-busy="true" aria-label="Carregando as tarefas">
      {#each Array.from({ length: 6 }, (_, index) => index) as index (index)}
        <div class="bg-card shadow-card rounded-surface flex flex-col gap-3 p-4">
          <Skeleton class="h-3 w-1/4" />
          <Skeleton class="h-4 w-2/3" />
          <Skeleton class="h-3 w-full" />
          <Skeleton class="mt-4 h-6 w-1/2" />
        </div>
      {/each}
    </div>
  {:else if viewState.isEmpty && paged}
    <EmptyState data={{ title: 'Nenhuma tarefa ainda', description: AREA_TEXT[data.area].empty }} ui={{ icon: ListChecks }}>
      {#if ui?.canCreate !== false}
        <ActionButton data={{ label: 'Nova tarefa' }} ui={{ icon: Plus }} actions={{ onClick: actions.onNew }} />
      {/if}
    </EmptyState>
  {:else if viewState.isFilteredOut && paged}
    <EmptyState data={{ title: 'Nenhuma tarefa encontrada', description: 'Nada combina com a busca ou os filtros escolhidos.' }} ui={{ icon: SearchX }}>
      <ActionButton data={{ label: 'Limpar filtros' }} ui={{ variant: 'secondary' }} actions={{ onClick: actions.onClearFilters }} />
    </EmptyState>
  {:else if data.view === 'list'}
    <!-- A grade de cards: sempre na tela estreita (< xl), ou quando a pessoa pediu cards na troca.
         Os cards são filhos diretos da grade: um invólucro entre eles quebra a altura igual. -->
    <div class={cn('card-grid', !tableView.forceCards && 'xl:hidden')} data-slot="task-cards">
      {#each data.tasks as task (task.id)}
        <TaskCard data={{ task, now: data.now }} actions={cardActions} />
      {/each}
    </div>
    <!-- A tabela: só quando a tela cabe (>= xl) E a pessoa não preferiu cards. -->
    <div class={cn('hidden', !tableView.forceCards && 'xl:block')} data-slot="task-table">
      <TaskTable data={{ tasks: data.tasks, now: data.now }} actions={cardActions} />
    </div>
  {:else if data.view === 'board'}
    <TaskBoard
      data={{ tasks: data.tasks, stages: data.stages, now: data.now }}
      ui={{ canManageStages: ui?.canCreate !== false }}
      state={{ isMoving: viewState.isMutating }}
      actions={{
        onOpen: actions.onOpen,
        onMove: actions.onMove,
        onStage: actions.onStage,
        onRefuse: actions.onRefuse,
        onNewStage: actions.onNewStage,
        onEditStage: actions.onEditStage,
      }}
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
        base: data.base,
        kinds: taskLinkKindsOf(data.area),
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
    {@render listToolbar('bottom')}
  {/if}
</section>

{#snippet listToolbar(position: 'top' | 'bottom')}
  <ListToolbar
    data={{
      layout: 'card',
      scroll: { loaded: data.tasks.length, totalItems: data.total },
      pages: { page: data.page, pageSize: data.pageSize, totalItems: data.total },
      noun: ['tarefa', 'tarefas'],
      gender: 'feminine',
    }}
    ui={{ position }}
    state={{ isLoading: viewState.isLoading }}
    actions={{ onPageChange: actions.onPageChange }}
  />
{/snippet}
