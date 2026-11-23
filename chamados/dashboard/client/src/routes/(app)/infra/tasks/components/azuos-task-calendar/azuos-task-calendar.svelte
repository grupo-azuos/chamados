<!--
  @component
  O CALENDÁRIO DAS TAREFAS — o mês em grade (domingo a sábado), com cada tarefa no dia do prazo
  (ou do início, quando não há prazo). As setas trocam o mês; o dia de hoje fica marcado.

  Cada tarefa é um botão pequeno na cor do prazo (atrasada vermelha, vencendo amarela); clicar
  abre a ficha. Dia com muitas tarefas mostra as três primeiras e "+N".

  - `data`: `tasks`, `month` (`aaaa-mm`), `today` (`aaaa-mm-dd`), `now`.
  - `actions`: `onOpen`, `onMonthChange`.
-->
<script lang="ts" module>
  import { type Task } from '@template/shared/schemas/task.schema';

  export type AzuosTaskCalendarProps = {
    data: { tasks: Task[]; month: string; today: string; now?: Date };
    actions: { onOpen: (task: Task) => void; onMonthChange: (month: string) => void };
  };
</script>

<script lang="ts">
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import { shiftMonth } from '$lib/hooks/use-task-list/use-task-list.svelte';
  import { cn } from '$lib/utils/cn';
  import { taskDueBadge } from '$lib/utils/task-due.util';
  import { calendarDayOf, monthLabel, monthWeeks } from './task-calendar.util';

  let { data, actions }: AzuosTaskCalendarProps = $props();

  const MAX_PER_DAY = 3;
  const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

  const weeks = $derived(monthWeeks(data.month));
  const byDay = $derived(
    data.tasks.reduce<Record<string, Task[]>>((map, task) => {
      const day = calendarDayOf(task);
      (map[day] ??= []).push(task);
      return map;
    }, {}),
  );

  const TONE_CLASS = {
    danger: 'bg-destructive-soft text-destructive',
    warning: 'bg-warning-soft text-warning-ink',
    neutral: 'bg-muted text-foreground',
  } as const;

  function toneOf(task: Task): keyof typeof TONE_CLASS {
    return taskDueBadge(task, data.now)?.tone ?? 'neutral';
  }
</script>

<section aria-label="Calendário das tarefas" class="rounded-surface bg-card shadow-card flex flex-col gap-3 p-4">
  <header class="flex items-center justify-between gap-2">
    <ActionButton
      data={{ label: 'Mês anterior' }}
      ui={{ variant: 'ghost', icon: ChevronLeft, isIconOnly: true }}
      actions={{ onClick: () => actions.onMonthChange(shiftMonth(data.month, -1)) }}
    />
    <h2 class="text-foreground text-base font-semibold">{monthLabel(data.month)}</h2>
    <ActionButton
      data={{ label: 'Próximo mês' }}
      ui={{ variant: 'ghost', icon: ChevronRight, isIconOnly: true }}
      actions={{ onClick: () => actions.onMonthChange(shiftMonth(data.month, 1)) }}
    />
  </header>

  <div class="grid grid-cols-7 gap-1" role="grid" aria-label={monthLabel(data.month)}>
    {#each WEEKDAYS as weekday (weekday)}
      <span role="columnheader" class="text-muted-foreground py-1 text-center text-xs font-medium">{weekday}</span>
    {/each}
    {#each weeks as week, index (index)}
      {#each week as day, column (`${index}-${column}`)}
        <div
          role="gridcell"
          class={cn('rounded-box flex min-h-24 flex-col gap-1 p-1.5', day ? 'bg-muted/50' : 'bg-transparent')}
        >
          {#if day}
            {@const tasks = byDay[day] ?? []}
            <span
              class={cn(
                'self-end rounded-full px-1.5 text-xs tabular-nums',
                day === data.today ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground',
              )}
            >
              {Number(day.slice(8))}
            </span>
            {#each tasks.slice(0, MAX_PER_DAY) as task (task.id)}
              <button
                type="button"
                title={task.title}
                class={cn(
                  'rounded-chip focus-visible:ring-ring/50 truncate px-1.5 py-0.5 text-left text-xs font-medium focus-visible:ring-3 focus-visible:outline-none',
                  TONE_CLASS[toneOf(task)],
                  task.status === 'done' && 'line-through opacity-70',
                )}
                onclick={() => actions.onOpen(task)}
              >
                {task.title}
              </button>
            {/each}
            {#if tasks.length > MAX_PER_DAY}
              <span class="text-muted-foreground px-1 text-xs">+{tasks.length - MAX_PER_DAY}</span>
            {/if}
          {/if}
        </div>
      {/each}
    {/each}
  </div>
</section>
