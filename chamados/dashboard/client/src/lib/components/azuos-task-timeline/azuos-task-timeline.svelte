<!--
  @component
  A TIMELINE DAS TAREFAS (o Gantt do Paralegal) — cada tarefa uma barra, do dia em que começa ao
  prazo; a sem prazo, um dia só. Uma RAIA POR RESPONSÁVEL, com a foto: dá para ver quem está com o
  quê, e quando.

  O zoom diz quantos dias cabem (Semana, 2 semanas, Mês), e cada um tem a sua largura mínima de
  dia: o que não cabe rola para o lado, com a coluna dos nomes sempre à vista. O título fica sempre
  DENTRO da barra, cortado quando não cabe, e inteiro na dica. As setas andam de semana em semana;
  "Hoje" volta à janela de agora. A coluna de hoje fica marcada, e o fim de semana num tom mais
  fundo. A barra que passa da janela fica com a ponta reta e a seta ("até 05/12"). A cor é a da
  situação; a atrasada, vermelha. Clicar abre a tarefa.

  - `data`: `tasks`, `window`, `zoom`, `today`, `now`.
  - `state`: `isLoading`.
  - `actions`: `onShift(weeks)`, `onToday`, `onZoom`, `onOpen`.
-->
<script lang="ts" module>
  import { type Task } from '@template/shared/schemas/task.schema';

  import { type GanttWindow, type TimelineZoom } from '$lib/utils/task-gantt.util';

  export type AzuosTaskTimelineProps = {
    data: { tasks: Task[]; window: GanttWindow; zoom: TimelineZoom; today: string; now?: Date };
    state?: { isLoading?: boolean };
    actions: {
      onShift: (weeks: number) => void;
      onToday: () => void;
      onZoom: (zoom: TimelineZoom) => void;
      onOpen: (task: Task) => void;
    };
  };

  const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  export function dayHeadOf(day: string, index: number): string {
    if (index === 0 || day.endsWith('-01')) return MONTHS[Number(day.slice(5, 7)) - 1]!;

    return WEEKDAYS[new Date(`${day}T00:00:00.000Z`).getUTCDay()]!;
  }
</script>

<script lang="ts">
  import CalendarRange from '@lucide/svelte/icons/calendar-range';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import LocateFixed from '@lucide/svelte/icons/locate-fixed';
  import { TASK_STATUS_LABELS } from '@template/shared/domain/task-flow.util';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import LoadingState from '$lib/components/azuos-loading-state/azuos-loading-state.svelte';
  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
  import SegmentedControl from '$lib/components/azuos-segmented-control/azuos-segmented-control.svelte';
  import * as Tooltip from '$lib/components/azuos-tooltip/azuos-tooltip';
  import { cardToneClasses } from '$lib/utils/card-tone.util';
  import { cn } from '$lib/utils/cn';
  import {
    brazilianDay,
    ganttBarOf,
    ganttDays,
    ganttLanesOf,
    ganttTitleOf,
    isWeekend,
    TASK_STATUS_HUES,
    taskHueOf,
    TIMELINE_DAY_PX,
    TIMELINE_ZOOM_LABELS,
    TIMELINE_ZOOMS,
  } from '$lib/utils/task-gantt.util';

  let { data, state: timelineState, actions }: AzuosTaskTimelineProps = $props();

  const NAME_COLUMN_PX = 240;
  /** Abaixo disso, a barra não tem lugar para o "até 05/12": fica só a seta (e o dia, na dica). */
  const CUT_DATE_MIN_DAYS = 3;
  /* A coluna dos nomes fica presa à esquerda ao rolar para o lado: sem ela, a barra perde a dona. */
  const STICKY_NAME = 'bg-card sticky left-0 z-20';
  const FOCUS = 'focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none';

  const ZOOM_OPTIONS = TIMELINE_ZOOMS.map((zoom) => ({ value: zoom, label: TIMELINE_ZOOM_LABELS[zoom] }));
  const LEGEND = [
    ...Object.entries(TASK_STATUS_HUES).map(([status, hue]) => ({
      label: TASK_STATUS_LABELS[status as keyof typeof TASK_STATUS_HUES],
      hue,
    })),
    { label: 'Atrasada', hue: 'red' as const },
  ];

  const days = $derived(ganttDays(data.window));
  const dayPx = $derived(TIMELINE_DAY_PX[data.zoom]);
  const grid = $derived(
    `grid-template-columns: ${NAME_COLUMN_PX}px repeat(${days.length}, minmax(${dayPx}px, 1fr)); min-width: ${NAME_COLUMN_PX + days.length * dayPx}px`,
  );
  const lanes = $derived(ganttLanesOf(data.tasks.filter((task) => ganttBarOf(task, data.window))));

  /** Hoje marcado; sábado e domingo num tom mais fundo. */
  function dayTone(day: string): string {
    if (day === data.today) return 'bg-accent';

    return isWeekend(day) ? 'bg-muted' : '';
  }

  function situationOf(task: Task): string {
    return TASK_STATUS_LABELS[task.status];
  }

  function periodOf(task: Task): string {
    if (!task.dueDate) return `começa em ${brazilianDay(task.startDate)}, sem prazo`;

    return `de ${brazilianDay(task.startDate)} a ${brazilianDay(task.dueDate)}`;
  }
</script>

<section aria-label="Timeline das tarefas" class="flex flex-col gap-3">
  <div class="flex flex-wrap items-center gap-2">
    <ActionButton
      data={{ label: 'Semana anterior' }}
      ui={{ variant: 'secondary', size: 'sm', icon: ChevronLeft, isIconOnly: true }}
      actions={{ onClick: () => actions.onShift(-1) }}
    />
    <ActionButton
      data={{ label: 'Hoje' }}
      ui={{ variant: 'secondary', size: 'sm', icon: LocateFixed }}
      actions={{ onClick: actions.onToday }}
    />
    <ActionButton
      data={{ label: 'Próxima semana' }}
      ui={{ variant: 'secondary', size: 'sm', icon: ChevronRight, isIconOnly: true }}
      actions={{ onClick: () => actions.onShift(1) }}
    />
    <h2 class="text-foreground text-base font-semibold">{ganttTitleOf(data.window)}</h2>
    <SegmentedControl
      data={{ value: data.zoom, options: ZOOM_OPTIONS }}
      ui={{ ariaLabel: 'Quantos dias mostrar' }}
      actions={{ onChange: (value) => actions.onZoom(value as TimelineZoom) }}
    />
    <ul aria-label="Legenda" class="ml-auto flex flex-wrap items-center gap-3">
      {#each LEGEND as item (item.label)}
        <li class="text-muted-foreground flex items-center gap-1.5 text-xs">
          <span aria-hidden="true" class={cn('size-2.5 rounded-full', cardToneClasses(item.hue).swatch)}></span>
          {item.label}
        </li>
      {/each}
    </ul>
  </div>

  {#if timelineState?.isLoading}
    <LoadingState data={{ label: 'Carregando as tarefas…' }} />
  {:else if lanes.length === 0}
    <EmptyState
      data={{ title: 'Nenhuma tarefa nestes dias', description: 'Ande pelas semanas, mude o zoom ou os filtros.' }}
      ui={{ icon: CalendarRange }}
    />
  {:else}
    <div class="rounded-surface bg-card shadow-card overflow-x-auto">
      <div role="table" aria-label="Tarefas por responsável e dia">
        <div role="row" class="border-border grid border-b" style={grid}>
          <span role="columnheader" class={cn(STICKY_NAME, 'text-muted-foreground px-3 py-2 text-xs font-semibold')}>
            Tarefa
          </span>
          {#each days as day, index (day)}
            <span
              role="columnheader"
              aria-label={brazilianDay(day)}
              class={cn(
                'flex flex-col items-center py-1 text-xs tabular-nums',
                dayTone(day),
                day === data.today ? 'text-foreground font-bold' : 'text-muted-foreground',
              )}
            >
              <span>{dayHeadOf(day, index)}</span>
              <span>{day.slice(8, 10)}</span>
            </span>
          {/each}
        </div>

        {#each lanes as lane (lane.ownerId)}
          <div role="rowgroup" aria-label={lane.ownerName}>
            <div role="row" class="border-border bg-mantle border-b py-1.5">
              <span role="rowheader" class="text-foreground sticky left-0 inline-flex items-center gap-2 px-3 text-sm font-semibold">
                <PersonAvatar
                  name={lane.ownerName}
                  avatarUrl={lane.ownerPhoto}
                  personId={lane.ownerId || null}
                  ui={{ size: 'sm' }}
                />
                {lane.ownerName}
                <span class="text-muted-foreground text-xs font-normal">
                  {lane.tasks.length}
                  {lane.tasks.length === 1 ? 'tarefa' : 'tarefas'}
                </span>
              </span>
            </div>
            {#each lane.tasks as task (task.id)}
              {@const bar = ganttBarOf(task, data.window)}
              {@const label = `${task.title} · ${situationOf(task)}, ${periodOf(task)}`}
              <div role="row" class="border-border grid border-b last:border-b-0" style={grid}>
                <span role="rowheader" class={cn(STICKY_NAME, 'row-start-1 flex min-w-0 items-center px-3 py-1.5')}>
                  <button
                    type="button"
                    onclick={() => actions.onOpen(task)}
                    class={cn('rounded-control text-foreground truncate text-left text-sm hover:underline', FOCUS)}
                  >
                    {task.title}
                  </button>
                </span>
                {#each days as day, index (day)}
                  <span aria-hidden="true" class={cn('row-start-1', dayTone(day))} style={`grid-column: ${index + 2}`}></span>
                {/each}
                {#if bar}
                  <span
                    role="cell"
                    class="z-10 row-start-1 flex min-w-0 items-center py-1.5"
                    style={`grid-column: ${bar.column + 2} / span ${bar.span}`}
                  >
                    <Tooltip.Provider>
                      <Tooltip.Root>
                        <Tooltip.Trigger>
                          {#snippet child({ props })}
                            <button
                              {...props}
                              type="button"
                              onclick={() => actions.onOpen(task)}
                              aria-label={`Abrir a tarefa ${label}`}
                              class={cn(
                                'rounded-chip shadow-card flex h-6 w-full min-w-0 items-center gap-1 px-2 text-left text-xs font-medium',
                                FOCUS,
                                cardToneClasses(taskHueOf(task, data.now)).dot,
                                bar.isCutStart && 'rounded-l-none pl-1',
                                bar.isCutEnd && 'rounded-r-none pr-1',
                              )}
                            >
                              {#if bar.isCutStart}<ChevronLeft aria-hidden="true" class="size-3.5 shrink-0" />{/if}
                              <span class="min-w-0 flex-1 truncate">{task.title}</span>
                              {#if bar.isCutEnd}
                                <span class="ml-auto flex shrink-0 items-center gap-0.5 tabular-nums">
                                  {#if task.dueDate && bar.span >= CUT_DATE_MIN_DAYS}
                                    até {task.dueDate.slice(8, 10)}/{task.dueDate.slice(5, 7)}
                                  {/if}
                                  <ChevronRight aria-hidden="true" class="size-3.5" />
                                </span>
                              {/if}
                            </button>
                          {/snippet}
                        </Tooltip.Trigger>
                        <Tooltip.Content class="max-w-xs whitespace-normal">{label}</Tooltip.Content>
                      </Tooltip.Root>
                    </Tooltip.Provider>
                  </span>
                {/if}
              </div>
            {/each}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</section>
