<!--
  @component
  O QUADRO DAS TAREFAS — uma coluna por situação: Aberta, Reaberta, AS PRÓPRIAS DA EQUIPE (na
  ordem dela, cada uma na cor que ganhou) e Finalizada, como no Paralegal. O mesmo arrastar do
  quadro dos chamados (`@dnd-kit`: teclado, o cartão inteiro seguindo o ponteiro, rolagem perto da
  borda). "Situações" abre o diálogo de criar, renomear, mudar de lugar e arquivar as próprias.

  Os movimentos são os de `moveOfTaskDrop`: soltar numa própria põe a tarefa nela; em Finalizada,
  finaliza; de Finalizada para Reaberta, reabre; da própria para a coluna fixa dela, sai da própria.
  O resto é recusado com aviso. A tarefa de chamado não finaliza nem reabre por aqui — ela acompanha
  o chamado —, mas anda pelas próprias.

  - `data.tasks`, `data.stages`, `data.now`; `ui.canManageStages`; `state.isMoving`.
  - `actions`: `onOpen`, `onMove(task, 'done' | 'reopened')`, `onStage(task, stageId)`,
    `onRefuse(mensagem)`, `onManageStages`.
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
      onManageStages?: () => void;
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
  import Settings2 from '@lucide/svelte/icons/settings-2';
  import Tag from '@lucide/svelte/icons/tag';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import DraggableCard from '$lib/components/azuos-kanban-draggable-card/azuos-kanban-draggable-card.svelte';
  import StageColumn from '$lib/components/azuos-kanban-column/azuos-kanban-column.svelte';
  import OwnerAvatar from '../azuos-task-owner-avatar/azuos-task-owner-avatar.svelte';
  import ProgressBar from '$lib/components/azuos-progress-bar/azuos-progress-bar.svelte';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import { cardHueFromHex } from '$lib/utils/card-tone.util';
  import { taskDueBadge, taskPercentage } from '$lib/utils/task-due.util';
  import { columnIdOf, moveOfTaskDrop, type TaskColumn, taskColumnsOf } from '$lib/utils/task-stage.util';

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
    if (column.kind === 'stage') return { tone: cardHueFromHex(column.stage.color), icon: Tag };

    return LOOK[column.status];
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

<section aria-label="Quadro das tarefas" class="flex flex-col gap-3">
  {#if ui?.canManageStages && actions.onManageStages}
    <div class="flex justify-end">
      <ActionButton
        data={{ label: 'Situações' }}
        ui={{ variant: 'secondary', size: 'sm', icon: Settings2 }}
        actions={{ onClick: actions.onManageStages }}
      />
    </div>
  {/if}
  <DragDropProvider {sensors} {plugins} onDragEnd={handleDragEnd}>
    <div class="flex w-full items-start justify-start gap-4 overflow-x-auto pb-4">
      {#each columns as { column, tasks } (column.id)}
        {@const look = lookOf(column)}
        <StageColumn data={{ title: column.title, count: tasks.length }} ui={{ tone: look.tone, icon: look.icon, dropId: column.id }}>
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
