<!--
  @component
  A TIMELINE DAS TAREFAS — cada tarefa numa linha, com a barra do início ao prazo dentro do mês
  à vista. A cor da barra é a da situação (finalizada verde, reaberta amarela, aberta azul;
  atrasada vermelha); o dia de hoje é a linha vertical.

  Toda barra tem o RÓTULO: o prazo (ou o início), quem responde e as etapas. Dentro da barra quando
  ela é larga; ao lado (depois, ou antes quando ela termina no fim do mês) quando é curta — barra
  muda obrigava a abrir a tarefa para saber de quando a quando ela ia.

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

  /** A partir de quantos dias a barra leva o rótulo dentro dela. */
  const INSIDE_MIN_DAYS = 6;
  /** Quantos dias o rótulo de fora precisa depois da barra; sem isso, ele vai antes. */
  const OUTSIDE_LABEL_DAYS = 8;

  function barClass(task: Task): string {
    if (taskDueBadge(task, data.now)?.tone === 'danger') return 'bg-destructive text-destructive-foreground';
    if (task.status === 'done') return 'bg-success text-success-foreground';
    if (task.status === 'reopened') return 'bg-warning text-warning-foreground';

    return 'bg-primary text-primary-foreground';
  }

  function shortDay(day: string): string {
    return `${day.slice(8)}/${day.slice(5, 7)}`;
  }

  /** "Atrasada · 05/11 · Wellington Queiroz · 0/4" — o que se lê sem abrir a tarefa. */
  function barLabel(task: Task): string {
    const when = taskDueBadge(task, data.now)?.label ?? `Início ${shortDay(task.startDate)}`;
    const owner = task.owner?.name ?? 'Sem responsável';
    const steps = task.progress.total > 0 ? `${task.progress.done}/${task.progress.total}` : null;

    return [when, owner, steps].filter(Boolean).join(' · ');
  }

  function labelSpot(span: { start: number; end: number }): 'inside' | 'after' | 'before' {
    if (span.end - span.start + 1 >= INSIDE_MIN_DAYS) return 'inside';

    return span.end + 1 + OUTSIDE_LABEL_DAYS <= days.length ? 'after' : 'before';
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
            {@const label = barLabel(row.task)}
            {@const spot = labelSpot(row.span)}
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
                class="relative grid h-6 flex-1 gap-px"
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
                  title={label}
                  class={cn(
                    'rounded-chip flex h-6 min-w-0 items-center overflow-hidden px-2 text-left text-xs font-medium focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none',
                    barClass(row.task),
                  )}
                  style={`grid-column: ${row.span.start + 1} / ${row.span.end + 2}; grid-row: 1`}
                  onclick={() => actions.onOpen(row.task)}
                >
                  {#if spot === 'inside'}<span class="truncate">{label}</span>{/if}
                </button>
                {#if spot !== 'inside'}
                  <span
                    data-slot="task-timeline-label"
                    class={cn(
                      'text-muted-foreground min-w-0 self-center truncate px-1.5 text-xs',
                      spot === 'before' && 'text-right',
                    )}
                    style={spot === 'after'
                      ? `grid-column: ${row.span.end + 2} / -1; grid-row: 1`
                      : `grid-column: 1 / ${row.span.start + 1}; grid-row: 1`}
                  >
                    {label}
                  </span>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      </div>
    </div>
  {/if}
</section>
