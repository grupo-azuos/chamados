<script lang="ts" module>
  import { type RoleContext } from '@template/shared/domain/role-context.util';

  export type TaskListScreenProps = { area: RoleContext };
</script>

<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { brasiliaClock } from '@template/shared/domain/task-flow.util';
  import { type Task } from '@template/shared/schemas/task.schema';

  import ConfirmDialog from '$lib/components/azuos-confirm-dialog/azuos-confirm-dialog.svelte';
  import { useTaskListModel } from '$lib/hooks/use-task-list/use-task-list.svelte';
  import { useTaskMapModel } from '$lib/hooks/use-task-map/use-task-map.svelte';
  import { useTaskStagesModel } from '$lib/hooks/use-task-stages/use-task-stages.svelte';
  import TaskListView from '$lib/components/azuos-task-list-view/azuos-task-list-view.svelte';
  import TaskStageDialog from '$lib/components/azuos-task-stage-dialog/azuos-task-stage-dialog.svelte';
  import { contextPath } from '$lib/navigation/navigation';
  import TaskFormSlot from './task-form-slot.svelte';

  /**
   * A TELA DE TAREFAS DE UMA ÁREA — a mesma composição para Infraestrutura e Sistema (como a fila
   * de chamados): a rota da área só diz qual é. Só compõe: chama os models e entrega para a view.
   *
   * O que mora aqui é QUAL PEÇA DA TELA ESTÁ NA FRENTE: o formulário (nova ou editando qual) e o
   * aviso de um arrasto recusado.
   */
  let { area }: TaskListScreenProps = $props();

  // svelte-ignore state_referenced_locally
  const list = useTaskListModel(area);
  // svelte-ignore state_referenced_locally
  const map = useTaskMapModel(area);
  // svelte-ignore state_referenced_locally
  const stages = useTaskStagesModel(area);
  const base = $derived(contextPath(area));
  const viewerId = $derived((page.data.user as { id: string } | undefined)?.id ?? '');

  type FormTarget = { task: Task | null };
  let form = $state<FormTarget | null>(null);
  let refusal = $state<string | null>(null);
</script>

<svelte:head>
  <title>Tarefas</title>
</svelte:head>

<TaskListView
  data={{ ...list.data, today: brasiliaClock().day, map: map.data, stages: stages.data.stages, base }}
  state={{ ...list.state, actionError: refusal ?? list.state.actionError }}
  actions={{
    ...list.actions,
    /* Abrir a tarefa leva à PÁGINA dela (como no Paralegal), e não a um modal. */
    onOpen: (task: Task) => void goto(`${base}/tasks/${task.id}`),
    map: map.actions,
    onManageStages: stages.actions.onOpen,
    onNew: () => (form = { task: null }),
    onRefuse: (message: string) => (refusal = message),
    onMove: (task: Task, status: 'done' | 'reopened') => {
      refusal = null;
      list.actions.onMove(task, status);
    },
  }}
/>

{#if form}
  {#key form.task?.id ?? 'new'}
    <TaskFormSlot
      {area}
      task={form.task}
      {viewerId}
      people={list.data.people}
      onSaved={() => (form = null)}
      onClose={() => (form = null)}
    />
  {/key}
{/if}

<ConfirmDialog
  data={{
    title: 'Excluir a tarefa?',
    description: `"${list.data.removing?.title ?? ''}" sai da lista. Etapas e vínculos vão junto.`,
    confirmLabel: 'Excluir',
    confirmingLabel: 'Excluindo…',
  }}
  ui={{ tone: 'danger' }}
  state={{ isOpen: list.data.removing !== null, isConfirming: list.state.isMutating, error: list.state.actionError }}
  actions={{ onConfirm: list.actions.onConfirmRemove, onCancel: list.actions.onCancelRemove }}
/>

<TaskStageDialog
  data={stages.data}
  state={stages.state}
  actions={{
    onCreate: stages.actions.onCreate,
    onUpdate: stages.actions.onUpdate,
    onMove: stages.actions.onMove,
    onArchive: stages.actions.onArchive,
    onClose: stages.actions.onClose,
  }}
/>
