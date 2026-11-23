<!--
  @component
  AS SITUAÇÕES DAS TAREFAS (o diálogo "Situações" do Paralegal) — as colunas próprias da equipe,
  entre Reaberta e Finalizada: criar ("Aguardando peça"), renomear e trocar a cor, andar para a
  esquerda ou a direita, e arquivar (as tarefas dela voltam à coluna fixa de cada uma). As três
  fixas aparecem só para dizer onde as próprias ficam: elas não mudam.

  - `data`: `stages`.
  - `state`: `isOpen`, `isSaving`, `error`.
  - `actions`: `onCreate`, `onUpdate`, `onMove`, `onArchive`, `onClose`.
-->
<script lang="ts" module>
  import { type TaskStage } from '@template/shared/schemas/task-stage.schema';

  export type AzuosTaskStageDialogProps = {
    data: { stages: TaskStage[] };
    state: { isOpen: boolean; isSaving?: boolean; error?: string | null };
    actions: {
      onCreate: (label: string, color: string) => void;
      onUpdate: (id: number, change: { label: string; color: string }) => void;
      onMove: (id: number, direction: -1 | 1) => void;
      onArchive: (id: number) => void;
      onClose: () => void;
    };
  };
</script>

<script lang="ts">
  import Archive from '@lucide/svelte/icons/archive';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Plus from '@lucide/svelte/icons/plus';
  import { TASK_STATUS_LABELS } from '@template/shared/domain/task-flow.util';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ColorSwatchField from '$lib/components/azuos-color-swatch-field/azuos-color-swatch-field.svelte';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/azuos-dialog/azuos-dialog';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import { COMPANY_COLOR_PALETTE } from '$lib/utils/company-color.util';

  let { data, state: dialogState, actions }: AzuosTaskStageDialogProps = $props();

  let newLabel = $state('');
  let newColor = $state<string>(COMPANY_COLOR_PALETTE[0]);
  let editing = $state<{ id: number; label: string; color: string } | null>(null);

  function create() {
    const label = newLabel.trim();
    if (!label) return;
    actions.onCreate(label, newColor);
    newLabel = '';
  }

  function save() {
    if (!editing || !editing.label.trim()) return;
    actions.onUpdate(editing.id, { label: editing.label.trim(), color: editing.color });
    editing = null;
  }
</script>

{#snippet fixed(label: string)}
  <li class="text-muted-foreground flex items-center gap-2 px-2 py-1.5 text-sm">
    <span aria-hidden="true" class="bg-border size-2.5 shrink-0 rounded-full"></span>
    {label}
    <span class="text-xs">· fixa</span>
  </li>
{/snippet}

<Dialog open={dialogState.isOpen} onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onClose())}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Situações das tarefas</DialogTitle>
      <DialogDescription>
        As colunas da equipe ficam entre Reaberta e Finalizada. Arquivar devolve as tarefas à coluna delas.
      </DialogDescription>
    </DialogHeader>

    {#if dialogState.error}
      <ErrorState data={{ message: dialogState.error }} ui={{ variant: 'inline' }} />
    {/if}

    <ol aria-label="Ordem das colunas" class="flex flex-col gap-1">
      {@render fixed(TASK_STATUS_LABELS.open)}
      {@render fixed(TASK_STATUS_LABELS.reopened)}
      {#each data.stages as stage, index (stage.id)}
        <li class="rounded-control hover:bg-hover-veil flex flex-col gap-2 px-2 py-1.5">
          {#if editing?.id === stage.id}
            <TextField
              data={{ label: 'Nome da situação', name: `stage-label-${stage.id}`, value: editing.label }}
              actions={{ onChange: (label: string) => editing && (editing = { ...editing, label }) }}
            />
            <ColorSwatchField
              data={{ value: editing.color }}
              ui={{ allowRandom: false, ariaLabel: 'Cor da situação' }}
              actions={{ onChange: (color: string) => editing && (editing = { ...editing, color }) }}
            />
            <div class="flex justify-end gap-2">
              <ActionButton data={{ label: 'Cancelar' }} ui={{ variant: 'ghost', size: 'sm' }} actions={{ onClick: () => (editing = null) }} />
              <ActionButton
                data={{ label: 'Salvar' }}
                ui={{ size: 'sm' }}
                state={{ isLoading: dialogState.isSaving }}
                actions={{ onClick: save }}
              />
            </div>
          {:else}
            <div class="flex items-center gap-2">
              <span aria-hidden="true" class="size-2.5 shrink-0 rounded-full" style={`background-color: ${stage.color}`}></span>
              <span class="text-foreground min-w-0 flex-1 truncate text-sm font-medium">{stage.label}</span>
              <ActionButton
                data={{ label: `Levar ${stage.label} para a esquerda` }}
                ui={{ variant: 'ghost', size: 'sm', icon: ChevronLeft, isIconOnly: true }}
                state={{ isDisabled: dialogState.isSaving || index === 0 }}
                actions={{ onClick: () => actions.onMove(stage.id, -1) }}
              />
              <ActionButton
                data={{ label: `Levar ${stage.label} para a direita` }}
                ui={{ variant: 'ghost', size: 'sm', icon: ChevronRight, isIconOnly: true }}
                state={{ isDisabled: dialogState.isSaving || index === data.stages.length - 1 }}
                actions={{ onClick: () => actions.onMove(stage.id, 1) }}
              />
              <ActionButton
                data={{ label: `Editar ${stage.label}` }}
                ui={{ variant: 'ghost', size: 'sm', icon: Pencil, isIconOnly: true }}
                state={{ isDisabled: dialogState.isSaving }}
                actions={{ onClick: () => (editing = { id: stage.id, label: stage.label, color: stage.color }) }}
              />
              <ActionButton
                data={{ label: `Arquivar ${stage.label}` }}
                ui={{ variant: 'ghost', size: 'sm', icon: Archive, isIconOnly: true }}
                state={{ isDisabled: dialogState.isSaving }}
                actions={{ onClick: () => actions.onArchive(stage.id) }}
              />
            </div>
          {/if}
        </li>
      {/each}
      {@render fixed(TASK_STATUS_LABELS.done)}
    </ol>

    <form
      class="border-border flex flex-col gap-3 border-t pt-4"
      onsubmit={(event) => {
        event.preventDefault();
        create();
      }}
    >
      <TextField
        data={{ label: 'Nova situação', name: 'new-stage-label', value: newLabel, placeholder: 'Aguardando peça' }}
        actions={{ onChange: (label: string) => (newLabel = label) }}
      />
      <ColorSwatchField
        data={{ value: newColor }}
        ui={{ allowRandom: false, ariaLabel: 'Cor da nova situação' }}
        actions={{ onChange: (color: string) => (newColor = color) }}
      />
      <div class="flex justify-end">
        <ActionButton
          data={{ label: 'Criar situação', loadingLabel: 'Criando…' }}
          ui={{ variant: 'secondary', icon: Plus }}
          state={{ isLoading: dialogState.isSaving, isDisabled: !newLabel.trim() }}
          actions={{ onClick: create }}
        />
      </div>
    </form>

    <DialogFooter>
      <ActionButton data={{ label: 'Fechar' }} ui={{ variant: 'secondary' }} actions={{ onClick: actions.onClose }} />
    </DialogFooter>
  </DialogContent>
</Dialog>
