<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';

  import ConfirmDialog from '$lib/components/azuos-confirm-dialog/azuos-confirm-dialog.svelte';
  import { useBackTarget } from '$lib/hooks/use-navigation-stack/use-navigation-stack.svelte';
  import { useTaskDetailModel } from '$lib/hooks/use-task-detail/use-task-detail.svelte';
  import TaskDetailView from '../components/azuos-task-detail-view/azuos-task-detail-view.svelte';
  import TaskFormSlot from '../task-form-slot.svelte';

  /**
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   *
   * A tarefa é uma PÁGINA, e não um modal sobre a lista (como no Paralegal): tem endereço próprio,
   * que se cola num chamado, e é para onde levam o mapa, o quadro e a timeline. O que mora aqui é
   * QUAL PEÇA ESTÁ NA FRENTE: o formulário de editar e a confirmação de excluir.
   */
  const id = Number(page.params.id);
  const detail = useTaskDetailModel(id);
  /* "Voltar para o mapa", quando veio de lá: o caminho da pessoa, e não um endereço fixo. */
  const back = useBackTarget({ to: '/infra/tasks', destination: 'as tarefas' });
  const viewerId = $derived((page.data.user as { id: string } | undefined)?.id ?? '');

  let isEditing = $state(false);
  let isRemoving = $state(false);
</script>

<svelte:head>
  <title>{detail.data.task?.title ?? 'Tarefa'}</title>
</svelte:head>

<TaskDetailView
  data={{ ...detail.data, backDestination: back.destination }}
  state={detail.state}
  actions={{
    ...detail.actions,
    onBack: back.onBack,
    onEdit: () => (isEditing = true),
    onRemove: () => (isRemoving = true),
  }}
/>

{#if isEditing && detail.data.task}
  <TaskFormSlot
    task={detail.data.task}
    {viewerId}
    people={detail.data.people}
    onSaved={() => (isEditing = false)}
    onClose={() => (isEditing = false)}
  />
{/if}

<ConfirmDialog
  data={{
    title: 'Excluir a tarefa?',
    description: `"${detail.data.task?.title ?? ''}" sai da lista. Etapas e vínculos vão junto.`,
    confirmLabel: 'Excluir',
    confirmingLabel: 'Excluindo…',
  }}
  ui={{ tone: 'danger' }}
  state={{ isOpen: isRemoving, isConfirming: detail.state.isRemoving, error: detail.state.actionError }}
  actions={{
    onConfirm: () => detail.actions.onRemove(() => void goto('/infra/tasks')),
    onCancel: () => (isRemoving = false),
  }}
/>

