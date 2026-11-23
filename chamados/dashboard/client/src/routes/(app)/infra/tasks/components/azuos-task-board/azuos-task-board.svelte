<!--
  @component
  O QUADRO DAS TAREFAS — uma coluna por situação (Aberta, Reaberta, Finalizada), com o mesmo
  arrastar do quadro dos chamados (`@dnd-kit`: teclado, o cartão inteiro seguindo o ponteiro,
  rolagem perto da borda).

  Os movimentos são os da régua (`canMoveTask`): soltar em Finalizada finaliza; tirar de
  Finalizada para Reaberta reabre. O resto é recusado com aviso. A tarefa de chamado não se
  arrasta — ela acompanha o chamado.

  - `data.tasks`, `data.now`; `state.isMoving`.
  - `actions`: `onOpen`, `onMove(task, 'done' | 'reopened')`, `onRefuse(mensagem)`.
-->
<script lang="ts" module>
  import { type TaskStatus } from '@template/shared/domain/task-flow.util';
  import { type Task } from '@template/shared/schemas/task.schema';

  export type AzuosTaskBoardProps = {
    data: { tasks: Task[]; now?: Date };
    state?: { isMoving?: boolean };
    actions: {
      onOpen: (task: Task) => void;
      onMove: (task: Task, status: 'done' | 'reopened') => void;
      onRefuse: (message: string) => void;
    };
  };

  /** A coluna onde a tarefa foi solta vira o movimento — ou a recusa. */
  export function moveOfTaskDrop(
    task: Pick<Task, 'status' | 'origin'>,
    column: TaskStatus,
  ): { status: 'done' | 'reopened' } | { refusal: string } | null {
    if (task.status === column) return null;
    if (task.origin === 'ticket') {
      return { refusal: 'A tarefa de um chamado acompanha o chamado: encerre ou reabra o chamado.' };
    }
    if (column === 'done') return { status: 'done' };
    if (column === 'reopened' && task.status === 'done') return { status: 'reopened' };

    return { refusal: 'Tarefa não volta para "Aberta": finalizada, ela é reaberta.' };
  }
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
  import { TASK_STATUS_LABELS, TASK_STATUSES } from '@template/shared/domain/task-flow.util';

  import DraggableCard from '$lib/components/azuos-kanban-draggable-card/azuos-kanban-draggable-card.svelte';
  import StageColumn from '$lib/components/azuos-kanban-column/azuos-kanban-column.svelte';
  import OwnerAvatar from '../azuos-task-owner-avatar/azuos-task-owner-avatar.svelte';
  import ProgressBar from '$lib/components/azuos-progress-bar/azuos-progress-bar.svelte';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import { taskDueBadge, taskPercentage } from '$lib/utils/task-due.util';

  let { data, state: boardState, actions }: AzuosTaskBoardProps = $props();

  const LOOK = {
    open: { tone: 'info', icon: CircleDot },
    reopened: { tone: 'warning', icon: RotateCcw },
    done: { tone: 'success', icon: CircleCheck },
  } as const;

  const dropIdOf = (status: TaskStatus) => `column:${status}`;
  const columns = $derived(
    TASK_STATUSES.map((status) => ({ status, tasks: data.tasks.filter((task) => task.status === status) })),
  );

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
    const status = String(event.operation.target.id).replace('column:', '') as TaskStatus;
    if (!task) return;
    const move = moveOfTaskDrop(task, status);
    if (!move) return;
    if ('refusal' in move) {
      actions.onRefuse(move.refusal);
      return;
    }
    actions.onMove(task, move.status);
  }
</script>

{#snippet card(task: Task)}
  {@const due = taskDueBadge(task, data.now)}
  <button
    type="button"
    aria-label={`Abrir a tarefa ${task.title}`}
    class="rounded-surface bg-card shadow-card hover:shadow-card-hover focus-visible:ring-ring/50 flex w-full flex-col gap-2 p-3 text-left transition-shadow focus-visible:ring-3 focus-visible:outline-none"
    onclick={() => actions.onOpen(task)}
  >
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
  </button>
{/snippet}

<section aria-label="Quadro das tarefas">
  <DragDropProvider {sensors} {plugins} onDragEnd={handleDragEnd}>
    <div class="flex w-full items-start justify-start gap-4 overflow-x-auto pb-4">
      {#each columns as column (column.status)}
        <StageColumn
          data={{ title: TASK_STATUS_LABELS[column.status], count: column.tasks.length }}
          ui={{ tone: LOOK[column.status].tone, icon: LOOK[column.status].icon, dropId: dropIdOf(column.status) }}
        >
          {#if column.tasks.length === 0}
            <p class="text-muted-foreground py-6 text-center text-xs">Arraste para cá.</p>
          {:else}
            {#each column.tasks as task (task.id)}
              <DraggableCard
                data={{ id: task.id, label: `Mover a tarefa ${task.title}` }}
                state={{ isDisabled: Boolean(boardState?.isMoving) || task.origin === 'ticket' }}
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
