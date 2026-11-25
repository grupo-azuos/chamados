<!--
  @component
  CRIAR OU EDITAR UMA TAREFA, num modal — o mesmo formulário do Paralegal, com as peças do
  chamados.

  Título e descrição; responsável e participantes (sempre pelo seletor de pessoa, com foto —
  nunca texto solto); início, prazo e hora; as ETAPAS (o checklist, que se escreve uma a uma); e
  os VÍNCULOS a chamados, computadores, peças e itens do inventário, quantos forem (no editar,
  aqui só se acrescentam — tirar é na ficha).

  Função pura de props: valores e erros chegam prontos; a busca dos vínculos é uma função que a
  view chama (`searchLinkOptions`).

  - `data`: `mode`, `fields`, `people`, `peopleIds`, `steps`, `links`.
  - `state`: `isOpen`, `isSubmitting`, `error`.
  - `actions`: `onChange`, `onPeopleChange`, os de etapa e de vínculo, `searchLinkOptions`,
    `onSubmit`, `onClose`.
-->
<script lang="ts" module>
  import { type TaskLinkKind } from '@template/shared/domain/task-flow.util';

  import { type AzuosPersonPickerPerson } from '$lib/components/azuos-person-picker-field/azuos-person-picker-field.svelte';
  import { type FormFieldState } from '$lib/types/form-field.type';

  export type TaskDialogField = 'title' | 'description' | 'ownerId' | 'startDate' | 'dueDate' | 'dueTime';
  export type TaskDialogStep = { id?: number; label: string };
  export type TaskDialogLink = { kind: TaskLinkKind; targetId: number; label: string };

  export type AzuosTaskFormDialogProps = {
    data: {
      mode: 'create' | 'edit';
      fields: Record<TaskDialogField, FormFieldState>;
      people: AzuosPersonPickerPerson[];
      peopleIds: string[];
      steps: TaskDialogStep[];
      links: TaskDialogLink[];
      /** Os tipos de vínculo do módulo (em Sistema, só chamado). @default todos */
      kinds?: readonly TaskLinkKind[];
    };
    state: { isOpen: boolean; isSubmitting?: boolean; error?: string | null };
    actions: {
      onChange: (field: TaskDialogField, value: string) => void;
      onPeopleChange: (ids: string[]) => void;
      onAddStep: (label: string) => void;
      onRenameStep: (index: number, label: string) => void;
      onRemoveStep: (index: number) => void;
      onAddLink: (link: TaskDialogLink) => void;
      onRemoveLink: (index: number) => void;
      searchLinkOptions: (kind: TaskLinkKind, term: string) => Promise<{ id: number; label: string }[]>;
      onSubmit: () => void;
      onClose: () => void;
    };
  };
</script>

<script lang="ts">
  import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
  import Plus from '@lucide/svelte/icons/plus';
  import X from '@lucide/svelte/icons/x';
  import { TASK_LINK_KIND_LABELS, TASK_LINK_KINDS } from '@template/shared/domain/task-flow.util';
  import { TASK_DESCRIPTION_MAX } from '@template/shared/schemas/task.schema';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import DatePicker from '$lib/components/azuos-date-picker/azuos-date-picker.svelte';
  import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/azuos-dialog/azuos-dialog';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import PersonMultiPickerField from '$lib/components/azuos-person-multi-picker-field/azuos-person-multi-picker-field.svelte';
  import PersonPickerField from '$lib/components/azuos-person-picker-field/azuos-person-picker-field.svelte';
  import DialogContent from '$lib/components/azuos-responsive-dialog-content/azuos-responsive-dialog-content.svelte';
  import SubmitButton from '$lib/components/azuos-submit-button/azuos-submit-button.svelte';
  import TextAreaField from '$lib/components/azuos-text-area-field/azuos-text-area-field.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';

  let { data, state: dialogState, actions }: AzuosTaskFormDialogProps = $props();

  const isEdit = $derived(data.mode === 'edit');
  let newStep = $state('');
  let linkKind = $state<TaskLinkKind>('ticket');
  let linkTerm = $state('');
  let linkOptions = $state<{ id: number; label: string }[]>([]);
  let isSearching = $state(false);

  async function searchLinks(): Promise<void> {
    isSearching = true;
    try {
      linkOptions = await actions.searchLinkOptions(linkKind, linkTerm);
    } catch {
      linkOptions = [];
    } finally {
      isSearching = false;
    }
  }

  function addStep(): void {
    actions.onAddStep(newStep);
    newStep = '';
  }

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    actions.onSubmit();
  }
</script>

<Dialog
  open={dialogState.isOpen}
  onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onClose())}
>
  <DialogContent class="sm:max-w-2xl">
    <form novalidate class="flex flex-col gap-4" onsubmit={handleSubmit}>
      <DialogHeader class="gap-1.5">
        <div class="flex items-center gap-2.5">
          <span class="rounded-chip bg-muted text-primary flex size-7 shrink-0 items-center justify-center">
            <ClipboardCheck class="size-4" aria-hidden="true" />
          </span>
          <DialogTitle class="text-lg font-semibold tracking-tight">
            {isEdit ? 'Editar tarefa' : 'Nova tarefa'}
          </DialogTitle>
        </div>
        <DialogDescription class="text-muted-foreground text-xs">
          Vincule a quantos chamados, computadores, peças e itens precisar.
        </DialogDescription>
      </DialogHeader>

      <TextField
        data={{ label: 'Título', name: 'title', value: data.fields.title.value, isRequired: true }}
        state={{ error: data.fields.title.error, isDisabled: dialogState.isSubmitting, isAutoFocused: true }}
        actions={{ onChange: (value: string) => actions.onChange('title', value) }}
      />

      <TextAreaField
        data={{
          label: 'Descrição (opcional)',
          name: 'description',
          value: data.fields.description.value,
          maxLength: TASK_DESCRIPTION_MAX,
        }}
        state={{ error: data.fields.description.error, isDisabled: dialogState.isSubmitting }}
        actions={{ onChange: (value: string) => actions.onChange('description', value) }}
      />

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Responsável</span>
          <PersonPickerField
            data={{ value: data.fields.ownerId.value, people: data.people }}
            ui={{ ariaLabel: 'Responsável', placeholder: 'Escolha a pessoa' }}
            state={{ isDisabled: dialogState.isSubmitting, isInvalid: Boolean(data.fields.ownerId.error) }}
            actions={{ onChange: (id: string) => actions.onChange('ownerId', id) }}
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Participantes</span>
          <PersonMultiPickerField
            data={{ values: data.peopleIds, people: data.people, placeholder: 'Ninguém além do responsável' }}
            ui={{ ariaLabel: 'Participantes' }}
            state={{ isDisabled: dialogState.isSubmitting }}
            actions={{ onChange: actions.onPeopleChange }}
          />
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <div class="flex flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Início</span>
          <DatePicker
            name="startDate"
            ariaLabel="Início"
            value={data.fields.startDate.value}
            disabled={dialogState.isSubmitting}
            onValueChange={(value) => actions.onChange('startDate', value ?? '')}
          />
          {#if data.fields.startDate.error}
            <span class="text-destructive text-xs">{data.fields.startDate.error}</span>
          {/if}
        </div>
        <div class="flex flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Prazo (opcional)</span>
          <DatePicker
            name="dueDate"
            ariaLabel="Prazo"
            value={data.fields.dueDate.value || null}
            disabled={dialogState.isSubmitting}
            placeholder="Sem prazo"
            onValueChange={(value) => actions.onChange('dueDate', value ?? '')}
          />
          {#if data.fields.dueDate.error}
            <span class="text-destructive text-xs">{data.fields.dueDate.error}</span>
          {/if}
        </div>
        <TextField
          data={{ label: 'Hora do prazo', name: 'dueTime', value: data.fields.dueTime.value }}
          ui={{ type: 'time' }}
          state={{ error: data.fields.dueTime.error, isDisabled: dialogState.isSubmitting }}
          actions={{ onChange: (value: string) => actions.onChange('dueTime', value) }}
        />
      </div>

      <fieldset class="flex flex-col gap-2">
        <legend class="text-ink-700 mb-1 text-sm font-medium">Etapas</legend>
        {#each data.steps as step, index (step.id ?? `new-${index}`)}
          <div class="flex items-center gap-2">
            <span class="text-muted-foreground w-5 text-right text-xs tabular-nums">{index + 1}.</span>
            <input
              aria-label={`Etapa ${index + 1}`}
              class="rounded-control bg-muted control-md text-foreground focus-visible:ring-ring/50 min-w-0 flex-1 border-transparent px-3 text-sm outline-none focus-visible:ring-3"
              value={step.label}
              disabled={dialogState.isSubmitting}
              oninput={(event) => actions.onRenameStep(index, event.currentTarget.value)}
            />
            <ActionButton
              data={{ label: `Tirar a etapa ${index + 1}` }}
              ui={{ variant: 'ghost', icon: X, isIconOnly: true, size: 'sm' }}
              actions={{ onClick: () => actions.onRemoveStep(index) }}
            />
          </div>
        {/each}
        <div class="flex items-center gap-2">
          <input
            aria-label="Nova etapa"
            placeholder="Escreva uma etapa e aperte Enter"
            class="rounded-control bg-muted control-md text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/50 min-w-0 flex-1 border-transparent px-3 text-sm outline-none focus-visible:ring-3"
            bind:value={newStep}
            disabled={dialogState.isSubmitting}
            onkeydown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              addStep();
            }}
          />
          <ActionButton
            data={{ label: 'Adicionar etapa' }}
            ui={{ variant: 'secondary', icon: Plus, size: 'sm' }}
            state={{ isDisabled: !newStep.trim() }}
            actions={{ onClick: addStep }}
          />
        </div>
      </fieldset>

      <fieldset class="flex flex-col gap-2">
        <legend class="text-ink-700 mb-1 text-sm font-medium">Vínculos</legend>
        {#if data.links.length}
          <ul class="flex flex-wrap gap-1.5" aria-label="Vínculos escolhidos">
            {#each data.links as link, index (`${link.kind}-${link.targetId}`)}
              <li class="rounded-chip bg-muted text-foreground flex items-center gap-1 py-0.5 pr-1 pl-2.5 text-xs">
                <span class="text-muted-foreground">{TASK_LINK_KIND_LABELS[link.kind]}:</span>
                <span class="max-w-48 truncate">{link.label}</span>
                <button
                  type="button"
                  aria-label={`Tirar ${link.label}`}
                  class="hover:bg-hover-veil rounded-full p-0.5"
                  onclick={() => actions.onRemoveLink(index)}
                >
                  <X class="size-3" aria-hidden="true" />
                </button>
              </li>
            {/each}
          </ul>
        {/if}
        <div class="grid gap-2 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto]">
          <OptionPicker
            data={{
              value: linkKind,
              options: (data.kinds ?? TASK_LINK_KINDS).map((kind) => ({ value: kind, label: TASK_LINK_KIND_LABELS[kind] })),
            }}
            ui={{ ariaLabel: 'Tipo de vínculo', mode: 'combobox', fullWidth: true }}
            actions={{
              onChange: (value: string) => {
                linkKind = value as TaskLinkKind;
                linkOptions = [];
              },
            }}
          />
          <input
            aria-label="Buscar o item para vincular"
            placeholder="Nome, protocolo ou código"
            class="rounded-control bg-muted control-md text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/50 min-w-0 border-transparent px-3 text-sm outline-none focus-visible:ring-3"
            bind:value={linkTerm}
            onkeydown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              void searchLinks();
            }}
          />
          <ActionButton
            data={{ label: 'Buscar', loadingLabel: 'Buscando…' }}
            ui={{ variant: 'secondary', size: 'sm' }}
            state={{ isLoading: isSearching }}
            actions={{ onClick: () => void searchLinks() }}
          />
        </div>
        {#if linkOptions.length}
          <ul class="rounded-box bg-muted flex max-h-48 flex-col gap-0.5 overflow-y-auto p-1" aria-label="Resultados">
            {#each linkOptions as option (option.id)}
              <li>
                <button
                  type="button"
                  class="hover:bg-hover-veil rounded-control text-foreground flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm"
                  onclick={() => actions.onAddLink({ kind: linkKind, targetId: option.id, label: option.label })}
                >
                  <Plus class="text-primary size-3.5 shrink-0" aria-hidden="true" />
                  <span class="truncate">{option.label}</span>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </fieldset>

      {#if dialogState.error}
        <ErrorState data={{ message: dialogState.error }} ui={{ variant: 'inline' }} />
      {/if}

      <DialogFooter>
        <ActionButton
          data={{ label: 'Cancelar' }}
          ui={{ variant: 'secondary' }}
          state={{ isDisabled: dialogState.isSubmitting }}
          actions={{ onClick: actions.onClose }}
        />
        <SubmitButton
          data={{ label: isEdit ? 'Salvar' : 'Criar tarefa', loadingLabel: 'Salvando…' }}
          ui={{ className: 'sm:w-auto' }}
          state={{ isLoading: dialogState.isSubmitting }}
        />
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
