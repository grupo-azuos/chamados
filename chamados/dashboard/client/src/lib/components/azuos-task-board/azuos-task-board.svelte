<!--
  @component
  O QUADRO DAS TAREFAS — uma coluna por situação: Aberta, Reaberta, AS PRÓPRIAS DA EQUIPE (na
  ordem dela, cada uma na cor que ganhou) e Finalizada, como no Paralegal. O mesmo arrastar do
  quadro dos chamados (`@dnd-kit`: teclado, o cartão inteiro seguindo o ponteiro, rolagem perto da
  borda). "+ Nova situação" (a coluna tracejada antes de Finalizada) cria uma própria; o lápis da
  coluna própria a edita. O card leva, no fundo, o ícone grande da coluna em que está.

  Os movimentos são os de `moveOfTaskDrop`: soltar numa própria põe a tarefa nela; em Finalizada,
  finaliza; de Finalizada para Reaberta, reabre; da própria para a coluna fixa dela, sai da própria.
  O resto é recusado com aviso. A tarefa de chamado não finaliza nem reabre por aqui — ela acompanha
  o chamado —, mas anda pelas próprias.

  - `data.tasks`, `data.stages`, `data.now`; `ui.canManageStages`; `state.isMoving`.
  - `actions`: `onOpen`, `onMove(task, 'done' | 'reopened')`, `onStage(task, stageId)`,
    `onRefuse(mensagem)`, `onNewStage`, `onEditStage(stage)`.
-->
<script lang="ts" module>
  import { type Task } from '@template/shared/schemas/task.schema';
  import { type TaskStage } from '@template/shared/schemas/task-stage.schema';

  export type AzuosTaskBoardProps = {
    data: { tasks: Task[]; stages?: TaskStage[]; now?: Date };
    ui?: { canManageStages?: boolean };
    state?: { isMoving?: boolean };
    actions: {
      onOpen: (task: Task) => void;
      onMove: (task: Task, status: 'done' | 'reopened') => void;
      onStage: (task: Task, stageId: number | null) => void;
      onRefuse: (message: string) => void;
      onNewStage?: () => void;
      onEditStage?: (stage: TaskStage) => void;
    };
  };
</script>

<script lang="ts">
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import CircleDot from '@lucide/svelte/icons/circle-dot';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import {
    Accessibility,
    AutoScroller,
    Cursor,
    Feedback,
    PointerActivationConstraints,
    PreventSelection,
  } from '@dnd-kit/dom';
  import { DragDropProvider, DragOverlay, KeyboardSensor, PointerSensor } from '@dnd-kit/svelte';
  import Plus from '@lucide/svelte/icons/plus';

  import CardSurface from '$lib/components/azuos-card-surface/azuos-card-surface.svelte';
  import DraggableCard from '$lib/components/azuos-kanban-draggable-card/azuos-kanban-draggable-card.svelte';
  import StageColumn from '$lib/components/azuos-kanban-column/azuos-kanban-column.svelte';
  import OwnerAvatar from '$lib/components/azuos-task-owner-avatar/azuos-task-owner-avatar.svelte';
  import ProgressBar from '$lib/components/azuos-progress-bar/azuos-progress-bar.svelte';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import { cardHueFromHex } from '$lib/utils/card-tone.util';
  import { taskDueBadge, taskPercentage } from '$lib/utils/task-due.util';
  import { columnIdOf, moveOfTaskDrop, type TaskColumn, taskColumnsOf } from '$lib/utils/task-stage.util';
  import { taskStageIconOf } from '$lib/utils/task-stage-icon.util';

  let { data, ui, state: boardState, actions }: AzuosTaskBoardProps = $props();

  const LOOK = {
    open: { tone: 'info', icon: CircleDot },
    reopened: { tone: 'warning', icon: RotateCcw },
    done: { tone: 'success', icon: CircleCheck },
  } as const;

  const columns = $derived(
    taskColumnsOf(data.stages ?? []).map((column) => ({
      column,
      tasks: data.tasks.filter((task) => columnIdOf(task) === column.id),
    })),
  );

  /** A cor e o ícone da coluna: as fixas no tom delas; a própria, no tom mais perto da cor dela. */
  function lookOf(column: TaskColumn) {
    if (column.kind === 'stage') {
      return { tone: cardHueFromHex(column.stage.color), icon: taskStageIconOf(column.stage.icon) };
    }

    return LOOK[column.status];
  }

  /** O ícone e o tom da coluna em que a tarefa está — o desenho grande no fundo do card. */
  function lookOfTask(task: Task) {
    const column = columns.find((item) => item.column.id === columnIdOf(task))?.column;

    return column ? lookOf(column) : LOOK[task.status];
  }

  const sensors = [
    PointerSensor.configure({
      activationConstraints: () => [new PointerActivationConstraints.Distance({ value: 6 })],
    }),
    KeyboardSensor,
  ];

  type DragSnapshot = {
    canceled?: boolean;
    operation: { source: { id: unknown } | null; target: { id: unknown } | null };
  };

  const plugins = [
    Accessibility.configure({
      screenReaderInstructions: {
        draggable:
          'Para pegar a tarefa, aperte Espaço. Use as setas para levá-la a outra coluna. Aperte Espaço de novo para soltar, ou Esc para desistir.',
      },
    }),
    AutoScroller,
    Cursor,
    Feedback,
    PreventSelection,
  ];

  function taskOf(id: unknown): Task | undefined {
    return data.tasks.find((task) => task.id === Number(id));
  }

  function handleDragEnd(event: DragSnapshot): void {
    if (event.canceled || !event.operation.target) return;
    const task = taskOf(event.operation.source?.id);
    if (!task) return;
    const move = moveOfTaskDrop(task, String(event.operation.target.id));
    if (!move) return;
    if ('refusal' in move) return actions.onRefuse(move.refusal);
    if ('stageId' in move) return actions.onStage(task, move.stageId);
    actions.onMove(task, move.status);
  }
</script>

{#snippet card(task: Task)}
  {@const due = taskDueBadge(task, data.now)}
  {@const look = lookOfTask(task)}
  <CardSurface
    data={{ label: `Abrir a tarefa ${task.title}` }}
    ui={{ mark: look.icon, markTone: look.tone, className: 'w-full' }}
    actions={{ onClick: () => actions.onOpen(task) }}
  >
  <div class="flex flex-col gap-2 p-3 text-left">
    <span class="text-foreground line-clamp-2 text-sm font-semibold">{task.title}</span>
    {#if due}
      <span class="self-start">
        <StatusBadge data={{ label: due.label }} ui={{ tone: due.tone, size: 'sm' }} />
      </span>
    {/if}
    <ProgressBar
      data={{ percentage: taskPercentage(task), done: task.progress.done, total: task.progress.total }}
      ui={{ showCount: true, itemLabel: 'etapas', emptyLabel: 'Sem etapas' }}
    />
    <span class="text-muted-foreground flex items-center gap-2 text-xs">
      <OwnerAvatar owner={task.owner} />
      <span class="truncate">{task.owner ? (task.owner.name ?? 'Fora do diretório') : 'Sem responsável'}</span>
    </span>
  </div>
  </CardSurface>
{/snippet}

<section aria-label="Quadro das tarefas" class="flex flex-col gap-3">
  <DragDropProvider {sensors} {plugins} onDragEnd={handleDragEnd}>
    <div class="flex w-full items-start justify-start gap-4 overflow-x-auto pb-4">
      {#each columns as { column, tasks } (column.id)}
        {@const look = lookOf(column)}
        {#if column.kind === 'status' && column.status === 'done' && ui?.canManageStages && actions.onNewStage}
          <!-- O "+ Nova situação": uma coluna tracejada, no lugar onde a nova vai nascer. -->
          <button
            type="button"
            onclick={actions.onNewStage}
            class="rounded-surface border-input text-ink-500 hover:bg-accent hover:text-foreground focus-visible:ring-ring flex min-h-24 w-72 shrink-0 items-center justify-center gap-2 border-2 border-dashed text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none sm:w-80"
          >
            <Plus aria-hidden="true" class="size-4" />
            Nova situação
          </button>
        {/if}
        <StageColumn
          data={{ title: column.title, count: tasks.length }}
          ui={{ tone: look.tone, icon: look.icon, dropId: column.id }}
          actions={column.kind === 'stage' && ui?.canManageStages && actions.onEditStage
            ? { onEdit: () => column.kind === 'stage' && actions.onEditStage?.(column.stage) }
            : undefined}
        >
          {#if tasks.length === 0}
            <p class="text-muted-foreground py-6 text-center text-xs">Arraste para cá.</p>
          {:else}
            {#each tasks as task (task.id)}
              <DraggableCard
                data={{ id: task.id, label: `Mover a tarefa ${task.title}` }}
                state={{ isDisabled: Boolean(boardState?.isMoving) }}
              >
                {@render card(task)}
              </DraggableCard>
            {/each}
          {/if}
        </StageColumn>
      {/each}
    </div>

    <DragOverlay dropAnimation={null}>
      {#snippet children(source)}
        {@const dragged = taskOf(source.id)}
        {#if dragged}
          <div class="w-72 cursor-grabbing shadow-xl sm:w-80">{@render card(dragged)}</div>
        {/if}
      {/snippet}
    </DragOverlay>
  </DragDropProvider>
</section>
