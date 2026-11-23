<!--
  @component
  CRIAR UMA SITUAÇÃO DA TAREFA OU EDITAR UMA QUE EXISTE (o diálogo do Paralegal) — como se chama e
  como aparece (cor e ícone, com a prévia). Abre vazio pelo "+ Nova situação" do quadro, e numa
  situação pelo lápis da coluna.

  Só as próprias passam por aqui: Aberta, Reaberta e Finalizada são fixas e não têm lápis. Na
  edição dá para andar a coluna para a esquerda ou a direita, entre as próprias; arquivar devolve
  as tarefas dela à coluna fixa de cada uma. Na nova, "Situações arquivadas" deixa desarquivar em
  vez de criar de novo.

  - `data`: `editing` (nula na nova), `stages`, `archivedStages`.
  - `state`: `isOpen`, `isSaving`, `error`, `archive`.
  - `actions`: `onClose`, `onCreate`, `onUpdate`, `onMove`, `onRemove`, `onArchiveOpenChange`,
    `onRestore`.
-->
<script lang="ts" module>
  import {
    type CreateTaskStageInput,
    type TaskStage,
    type TaskStageIcon,
    type UpdateTaskStageInput,
  } from '@template/shared/schemas/task-stage.schema';

  import {
    type AzuosArchivedItem,
    type AzuosArchivedListProps,
  } from '$lib/components/azuos-archived-list/azuos-archived-list.svelte';

  export type AzuosTaskStageDialogProps = {
    data: { editing: TaskStage | null; stages: TaskStage[]; archivedStages: AzuosArchivedItem[] };
    state: { isOpen: boolean; isSaving: boolean; error: string | null; archive: AzuosArchivedListProps['state'] };
    actions: {
      onClose: () => void;
      onCreate: (input: Omit<CreateTaskStageInput, 'area'>) => Promise<boolean>;
      onUpdate: (id: number, input: UpdateTaskStageInput) => Promise<boolean>;
      onMove: (id: number, direction: -1 | 1) => void;
      onRemove: (id: number) => Promise<boolean>;
      onArchiveOpenChange: (isOpen: boolean) => void;
      onRestore: (key: string) => void;
    };
  };

  export type StageForm = { label: string; color: string; icon: string };

  export function stageFormOf(editing: TaskStage | null, defaultColor: string): StageForm {
    if (editing) return { label: editing.label, color: editing.color, icon: editing.icon ?? 'tag' };

    return { label: '', color: defaultColor, icon: 'tag' };
  }
</script>

<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ArchivedList from '$lib/components/azuos-archived-list/azuos-archived-list.svelte';
  import ColorSwatchField from '$lib/components/azuos-color-swatch-field/azuos-color-swatch-field.svelte';
  import ConfirmDialog from '$lib/components/azuos-confirm-dialog/azuos-confirm-dialog.svelte';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/azuos-dialog/azuos-dialog';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import IconPicker from '$lib/components/azuos-icon-picker/azuos-icon-picker.svelte';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import { COMPANY_COLOR_PALETTE } from '$lib/utils/company-color.util';
  import { TASK_STAGE_ICON_OPTIONS, taskStageIconOf } from '$lib/utils/task-stage-icon.util';

  let { data, state: dialogState, actions }: AzuosTaskStageDialogProps = $props();

  let values = $state<StageForm>(stageFormOf(null, COMPANY_COLOR_PALETTE[0]));
  let formError = $state<string | null>(null);
  let isConfirmingRemove = $state(false);

  const editing = $derived(data.editing);
  const index = $derived(editing ? data.stages.findIndex((stage) => stage.id === editing.id) : -1);

  /* Cada abertura começa do zero (ou da situação aberta): o rascunho de antes não fica. */
  $effect(() => {
    if (!dialogState.isOpen) return;
    values = stageFormOf(data.editing, COMPANY_COLOR_PALETTE[0]);
    formError = null;
    isConfirmingRemove = false;
  });

  async function submit() {
    formError = values.label.trim() ? null : 'Informe o nome da situação.';
    if (formError) return;
    const input = { label: values.label.trim(), color: values.color, icon: values.icon as TaskStageIcon };
    const saved = editing ? await actions.onUpdate(editing.id, input) : await actions.onCreate(input);
    if (saved) actions.onClose();
  }

  async function remove() {
    if (!editing) return;
    const removed = await actions.onRemove(editing.id);
    isConfirmingRemove = false;
    if (removed) actions.onClose();
  }
</script>

<Dialog
  open={dialogState.isOpen}
  onOpenChange={(open: boolean) => (!open && !dialogState.isSaving ? actions.onClose() : undefined)}
>
  <DialogContent class="overflow-y-auto sm:max-w-xl">
    <DialogHeader>
      <DialogTitle>{editing ? 'Editar situação' : 'Nova situação'}</DialogTitle>
      <DialogDescription>
        {editing
          ? 'O nome, a cor e o ícone mudam em todas as tarefas desta situação.'
          : 'A situação vira uma coluna do quadro, entre Reaberta e Finalizada, e uma opção do filtro.'}
      </DialogDescription>
    </DialogHeader>

    <form
      class="flex flex-col gap-5"
      onsubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <fieldset class="flex flex-col gap-4">
        <legend class="text-ink-700 mb-2 text-xs font-semibold uppercase">Identificação</legend>
        <TextField
          data={{
            label: 'Nome da situação',
            name: 'taskStageLabel',
            value: values.label,
            placeholder: 'Ex.: Aguardando peça',
            isRequired: true,
          }}
          state={{ isDisabled: dialogState.isSaving, isAutoFocused: true }}
          actions={{ onChange: (label: string) => (values = { ...values, label }) }}
        />
      </fieldset>

      <fieldset class="flex flex-col gap-4">
        <legend class="text-ink-700 mb-2 text-xs font-semibold uppercase">Aparência</legend>
        <div class="flex flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Cor</span>
          <ColorSwatchField
            data={{ value: values.color }}
            ui={{ allowRandom: false, ariaLabel: 'Cor da situação' }}
            state={{ isDisabled: dialogState.isSaving }}
            actions={{ onChange: (color: string) => (values = { ...values, color }) }}
          />
        </div>
        <IconPicker
          data={{ value: values.icon, options: TASK_STAGE_ICON_OPTIONS }}
          ui={{ label: 'Ícone' }}
          state={{ isDisabled: dialogState.isSaving }}
          actions={{ onChange: (icon: string) => (values = { ...values, icon }) }}
        />
        <p class="text-ink-500 flex items-center gap-2 text-sm">
          Prévia:
          <StatusBadge
            data={{ label: values.label.trim() || 'Nome da situação' }}
            ui={{ color: values.color, icon: taskStageIconOf(values.icon) }}
          />
        </p>
      </fieldset>

      {#if editing}
        <fieldset class="flex flex-col gap-2">
          <legend class="text-ink-700 mb-2 text-xs font-semibold uppercase">Lugar no quadro</legend>
          <div role="group" aria-label="Lugar no quadro" class="flex flex-wrap gap-2">
            <ActionButton
              data={{ label: 'Mover para a esquerda' }}
              ui={{ variant: 'secondary', icon: ArrowLeft }}
              state={{ isDisabled: dialogState.isSaving || index <= 0 }}
              actions={{ onClick: () => actions.onMove(editing.id, -1) }}
            />
            <ActionButton
              data={{ label: 'Mover para a direita' }}
              ui={{ variant: 'secondary', icon: ArrowRight }}
              state={{ isDisabled: dialogState.isSaving || index < 0 || index >= data.stages.length - 1 }}
              actions={{ onClick: () => actions.onMove(editing.id, 1) }}
            />
          </div>
          <p class="text-muted-foreground text-xs">
            Anda entre as situações da equipe. Aberta e Reaberta ficam sempre no começo, e Finalizada no fim.
          </p>
        </fieldset>
      {/if}

      {#if formError ?? dialogState.error}
        <ErrorState data={{ message: formError ?? dialogState.error ?? '' }} ui={{ variant: 'inline' }} />
      {/if}

      {#if !editing}
        <!-- Na situação nova: o que a pessoa procura pode estar só arquivado. -->
        <ArchivedList
          data={{ title: 'Situações arquivadas', items: data.archivedStages }}
          state={dialogState.archive}
          actions={{ onOpenChange: actions.onArchiveOpenChange, onRestore: actions.onRestore }}
        />
      {/if}

      <DialogFooter>
        {#if editing}
          <div class="sm:mr-auto">
            <ActionButton
              data={{ label: 'Arquivar situação' }}
              ui={{ variant: 'danger' }}
              state={{ isDisabled: dialogState.isSaving }}
              actions={{ onClick: () => (isConfirmingRemove = true) }}
            />
          </div>
        {/if}
        <ActionButton
          data={{ label: 'Cancelar' }}
          ui={{ variant: 'secondary' }}
          state={{ isDisabled: dialogState.isSaving }}
          actions={{ onClick: actions.onClose }}
        />
        <ActionButton
          data={editing ? { label: 'Salvar', loadingLabel: 'Salvando…' } : { label: 'Criar situação', loadingLabel: 'Criando…' }}
          state={{ isLoading: dialogState.isSaving }}
          actions={{ onClick: () => void submit() }}
        />
      </DialogFooter>
    </form>

    {#if editing && isConfirmingRemove}
      <ConfirmDialog
        data={{
          title: `Arquivar a situação "${editing.label}"?`,
          description:
            'As tarefas que estão nela voltam para Aberta ou Reaberta. A situação fica guardada e pode ser desarquivada em "Nova situação", mas volta vazia.',
          confirmLabel: 'Arquivar situação',
        }}
        ui={{ tone: 'danger' }}
        state={{ isOpen: true, isConfirming: dialogState.isSaving }}
        actions={{ onConfirm: () => void remove(), onCancel: () => (isConfirmingRemove = false) }}
      />
    {/if}
  </DialogContent>
</Dialog>
