<!--
  @component
  A TIMELINE DAS TAREFAS — cada tarefa numa linha, com a barra do início ao prazo dentro do mês
  à vista. A cor da barra é a da situação (finalizada verde, reaberta amarela, aberta azul;
  atrasada vermelha); o dia de hoje é a linha vertical.

  - `data`: `tasks`, `month`, `today`, `now`.
  - `actions`: `onOpen`, `onMonthChange`.
-->
<script lang="ts" module>
  import { type Task } from '@template/shared/schemas/task.schema';

  export type AzuosTaskTimelineProps = {
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
  import { daysOfMonth, monthLabel, timelineSpan } from '../azuos-task-calendar/task-calendar.util';

  let { data, actions }: AzuosTaskTimelineProps = $props();

  const days = $derived(daysOfMonth(data.month));
  const rows = $derived(
    data.tasks.flatMap((task) => {
      const span = timelineSpan(task, data.month);
      return span ? [{ task, span }] : [];
    }),
  );
  const todayIndex = $derived(days.indexOf(data.today));

  function barClass(task: Task): string {
    if (taskDueBadge(task, data.now)?.tone === 'danger') return 'bg-destructive';
    if (task.status === 'done') return 'bg-success';
    if (task.status === 'reopened') return 'bg-warning';

    return 'bg-primary';
  }
</script>

<section aria-label="Timeline das tarefas" class="rounded-surface bg-card shadow-card flex flex-col gap-3 p-4">
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

  {#if rows.length === 0}
    <p class="text-muted-foreground py-8 text-center text-sm">Nenhuma tarefa neste mês.</p>
  {:else}
    <div class="overflow-x-auto">
      <div class="min-w-[48rem]">
        <div class="grid items-end gap-px pl-56" style={`grid-template-columns: repeat(${days.length}, minmax(0, 1fr))`}>
          {#each days as day (day)}
            <span class={cn('text-center text-xs tabular-nums', day === data.today ? 'text-primary font-bold' : 'text-muted-foreground')}>
              {Number(day.slice(8))}
            </span>
          {/each}
        </div>
        <ul class="divide-border/60 relative mt-1 divide-y">
          {#each rows as row (row.task.id)}
            <li class="flex items-center gap-2 py-1.5">
              <button
                type="button"
                class="text-foreground hover:text-primary w-54 shrink-0 truncate text-left text-sm"
                title={row.task.title}
                onclick={() => actions.onOpen(row.task)}
              >
                {row.task.title}
              </button>
              <div
                class="relative grid h-5 flex-1 gap-px"
                style={`grid-template-columns: repeat(${days.length}, minmax(0, 1fr))`}
              >
                {#if todayIndex >= 0}
                  <span
                    aria-hidden="true"
                    class="bg-primary/40 pointer-events-none absolute inset-y-0 w-px"
                    style={`left: ${((todayIndex + 0.5) / days.length) * 100}%`}
                  ></span>
                {/if}
                <button
                  type="button"
                  aria-label={`Abrir a tarefa ${row.task.title}`}
                  class={cn('rounded-chip h-5 focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none', barClass(row.task))}
                  style={`grid-column: ${row.span.start + 1} / ${row.span.end + 2}`}
                  onclick={() => actions.onOpen(row.task)}
                ></button>
              </div>
            </li>
          {/each}
        </ul>
      </div>
    </div>
  {/if}
</section>
