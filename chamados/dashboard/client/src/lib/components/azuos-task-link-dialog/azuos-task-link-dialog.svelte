<!--
  @component
  VINCULAR À TAREFA (o diálogo do Paralegal) — o que ela toca, escolhido no cadastro: chamados,
  computadores, peças e itens do inventário. Escolhe o tipo, busca e marca quantos quiser; "Vincular"
  grava todos de uma vez. Cada vínculo vira um atalho na tarefa e uma caixa no mapa.

  - `data`: `kind`, `term`, `options` (o que a busca achou), `selectedIds`.
  - `state`: `isOpen`, `isSaving`, `isSearching`, `error`.
  - `actions`: `onKindChange`, `onSearch`, `onToggle`, `onConfirm`, `onClose`.
-->
<script lang="ts" module>
  import { TASK_LINK_KIND_LABELS, type TaskLinkKind } from '@template/shared/domain/task-flow.util';

  export type AzuosTaskLinkDialogProps = {
    data: {
      kind: TaskLinkKind;
      term: string;
      options: { id: number; label: string }[];
      selectedIds: number[];
      /** Os tipos do módulo (em Sistema, só chamado). @default todos */
      kinds?: readonly TaskLinkKind[];
    };
    state: { isOpen: boolean; isSaving?: boolean; isSearching?: boolean; error?: string | null };
    actions: {
      onKindChange: (kind: TaskLinkKind) => void;
      onSearch: (term: string) => void;
      onToggle: (id: number) => void;
      onConfirm: () => void;
      onClose: () => void;
    };
  };

  export const TASK_LINK_KIND_OPTIONS = (['ticket', 'computer', 'part', 'inventory_item'] as const).map((kind) => ({
    value: kind,
    label: TASK_LINK_KIND_LABELS[kind],
  }));
</script>

<script lang="ts">
  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import CheckboxField from '$lib/components/azuos-checkbox-field/azuos-checkbox-field.svelte';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/azuos-dialog/azuos-dialog';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import SegmentedControl from '$lib/components/azuos-segmented-control/azuos-segmented-control.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';

  let { data, state: dialogState, actions }: AzuosTaskLinkDialogProps = $props();

  const count = $derived(data.selectedIds.length);
</script>

<Dialog
  open={dialogState.isOpen}
  onOpenChange={(open: boolean) => (open || dialogState.isSaving ? undefined : actions.onClose())}
>
  <DialogContent class="overflow-y-auto sm:max-w-2xl">
    <DialogHeader>
      <DialogTitle>Vincular à tarefa</DialogTitle>
      <DialogDescription>
        Cada vínculo vira um atalho na tarefa e uma caixa no mapa. Marque quantos precisar.
      </DialogDescription>
    </DialogHeader>

    <form
      class="flex flex-col gap-4"
      onsubmit={(event) => {
        event.preventDefault();
        if (count > 0) actions.onConfirm();
      }}
    >
      <SegmentedControl
        data={{
          value: data.kind,
          options: TASK_LINK_KIND_OPTIONS.filter((option) => !data.kinds || data.kinds.includes(option.value)),
        }}
        ui={{ ariaLabel: 'O que vincular' }}
        state={{ isDisabled: dialogState.isSaving }}
        actions={{ onChange: (kind: string) => actions.onKindChange(kind as TaskLinkKind) }}
      />
      <TextField
        data={{ label: 'Buscar', name: 'taskLinkSearch', value: data.term, placeholder: 'Nome, protocolo ou patrimônio' }}
        state={{ isDisabled: dialogState.isSaving, isAutoFocused: true }}
        actions={{ onChange: actions.onSearch }}
      />
      <fieldset class="flex max-h-72 flex-col gap-1 overflow-y-auto">
        <legend class="sr-only">{TASK_LINK_KIND_LABELS[data.kind]} para vincular</legend>
        {#if dialogState.isSearching}
          <p class="text-muted-foreground px-1 py-2 text-sm">Buscando…</p>
        {:else if data.options.length === 0}
          <p class="text-muted-foreground px-1 py-2 text-sm">Nada com esse nome.</p>
        {:else}
          {#each data.options as option (option.id)}
            <div class="rounded-control hover:bg-hover-veil px-2 py-1">
              <CheckboxField
                data={{ label: option.label, name: `link-${data.kind}-${option.id}`, isChecked: data.selectedIds.includes(option.id) }}
                state={{ isDisabled: dialogState.isSaving }}
                actions={{ onChange: () => actions.onToggle(option.id) }}
              />
            </div>
          {/each}
        {/if}
      </fieldset>

      {#if dialogState.error}
        <ErrorState data={{ message: dialogState.error }} ui={{ variant: 'inline' }} />
      {/if}

      <DialogFooter>
        <ActionButton
          data={{ label: 'Cancelar' }}
          ui={{ variant: 'secondary' }}
          state={{ isDisabled: dialogState.isSaving }}
          actions={{ onClick: actions.onClose }}
        />
        <ActionButton
          data={{ label: count > 0 ? `Vincular ${count}` : 'Vincular', loadingLabel: 'Vinculando…' }}
          state={{ isLoading: dialogState.isSaving, isDisabled: count === 0 }}
          actions={{ onClick: actions.onConfirm }}
        />
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
