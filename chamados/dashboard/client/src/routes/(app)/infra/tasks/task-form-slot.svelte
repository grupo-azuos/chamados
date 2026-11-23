<script lang="ts" module>
  import { type Task } from '@template/shared/schemas/task.schema';

  import { type AzuosPersonPickerPerson } from '$lib/components/azuos-person-picker-field/azuos-person-picker-field.svelte';

  /**
   * A ponte entre a tela e o formulário da tarefa: o view-model do formulário nasce junto com o
   * diálogo (e morre com ele). Quem troca de tarefa é o `{#key}` da rota.
   */
  export type TaskFormSlotProps = {
    task: Task | null;
    viewerId: string;
    people: AzuosPersonPickerPerson[];
    onSaved: (task: Task) => void;
    onClose: () => void;
  };
</script>

<script lang="ts">
  import { useTaskFormModel } from '$lib/hooks/use-task-form/use-task-form.svelte';
  import TaskFormDialog from './components/azuos-task-form-dialog/azuos-task-form-dialog.svelte';

  let { task, viewerId, people, onSaved, onClose }: TaskFormSlotProps = $props();

  /* Fotografa a tarefa na montagem: acompanhar apagaria o que a pessoa digita quando a lista
     recarregasse por trás. */
  // svelte-ignore state_referenced_locally
  const form = useTaskFormModel({ area: 'infra', viewerId, task, onSaved });
</script>

<TaskFormDialog
  data={{ ...form.data, people }}
  state={{ ...form.state, isOpen: true }}
  actions={{ ...form.actions, onClose: () => (form.state.isSubmitting ? undefined : onClose()) }}
/>
