<script lang="ts">
  import { page } from '$app/state';
  import { brasiliaClock } from '@template/shared/domain/task-flow.util';
  import { type Task } from '@template/shared/schemas/task.schema';

  import ConfirmDialog from '$lib/components/azuos-confirm-dialog/azuos-confirm-dialog.svelte';
  import { useTaskListModel } from '$lib/hooks/use-task-list/use-task-list.svelte';
  import TaskDetailDialog from './components/azuos-task-detail-dialog/azuos-task-detail-dialog.svelte';
  import TaskListView from './components/azuos-task-list-view/azuos-task-list-view.svelte';
  import TaskFormSlot from './task-form-slot.svelte';

  /**
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   *
   * O que mora aqui é QUAL PEÇA DA TELA ESTÁ NA FRENTE: o formulário (nova ou editando qual) e o
   * aviso de um arrasto recusado.
   */
  const list = useTaskListModel('infra');
  const viewerId = $derived((page.data.user as { id: string } | undefined)?.id ?? '');

  type FormTarget = { task: Task | null };
  let form = $state<FormTarget | null>(null);
  let refusal = $state<string | null>(null);
</script>

<svelte:head>
  <title>Tarefas</title>
</svelte:head>

<TaskListView
  data={{ ...list.data, today: brasiliaClock().day }}
  state={{ ...list.state, actionError: refusal ?? list.state.actionError }}
  actions={{
    ...list.actions,
    onNew: () => (form = { task: null }),
    onRefuse: (message: string) => (refusal = message),
    onMove: (task: Task, status: 'done' | 'reopened') => {
      refusal = null;
      list.actions.onMove(task, status);
    },
  }}
/>

{#if list.data.selected && !form}
  <TaskDetailDialog
    data={{ task: list.data.selected }}
    state={{ isOpen: true, isBusy: list.state.isMutating, error: list.state.actionError }}
    actions={{
      onClose: list.actions.onClose,
      onEdit: (task: Task) => (form = { task }),
      onMove: list.actions.onMove,
      onToggleStep: list.actions.onToggleStep,
      onRemoveLink: list.actions.onRemoveLink,
      onRemove: list.actions.onAskRemove,
    }}
  />
{/if}

{#if form}
  {#key form.task?.id ?? 'new'}
    <TaskFormSlot
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
