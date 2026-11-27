<!--
  @component
  O formulário de cadastrar máquina e o de corrigir a identificação dela, num modal.

  Função pura de props: o valor e o erro de cada campo chegam prontos (`FormFieldState`), e por isso
  o modal abre no Storybook preenchido, com erro ou enviando — sem servidor e sem biblioteca de
  formulário no meio.

  **O nome da máquina só é editável no cadastro.** Depois, quem o informa é a própria máquina, a
  cada leitura do agente: digitá-lo aqui faria a ficha discordar do que o agente manda, e a pessoa
  procuraria no inventário um nome que não existe em lugar nenhum.

  A recusa do servidor aparece DENTRO do modal, e ele continua aberto: fechar jogaria fora o que foi
  digitado.

  **O responsável é uma pessoa da lista do escritório, escolhida pelo campo de pessoa (com foto) —
  nunca um nome digitado.** O departamento é só um dos OFICIAIS do RH (o valor é o id). Não há
  campo de local: o local antigo ficou escrito na observação ("Local anterior: …").

  Props: `data` traz o modo (`create`/`edit`), os campos, os responsáveis e os departamentos;
  `state` diz se está aberto, enviando, com erro, carregando os responsáveis ou sem o RH;
  `actions` recebe a digitação (`onChange`, `onBlur`), o envio e o fechar.
-->
<script lang="ts" module>
  import { COMPUTER_KINDS, COMPUTER_KIND_LABELS } from '@template/shared/domain/computer-kind.util';

  import type { ComputerResponsible } from '@template/shared/schemas/computer.schema';

  import { type OptionPickerOption } from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import { type FormFieldState } from '$lib/types/form-field.type';

  export type ComputerFormField =
    | 'name'
    | 'kind'
    | 'displayName'
    | 'responsibleId'
    | 'departmentId'
    | 'notes';

  export type AzuosComputerFormDialogProps = {
    data: {
      mode: 'create' | 'edit';
      responsibles?: ComputerResponsible[];
      /** Só os departamentos OFICIAIS do RH; o valor é o id (`'12'`). */
      departmentOptions?: OptionPickerOption[];
      fields: Record<ComputerFormField, FormFieldState>;
    };
    state: {
      isOpen: boolean;
      isSubmitting?: boolean;
      error?: string | null;
      isLoadingResponsibles?: boolean;
      responsiblesError?: string | null;
      /** O RH não respondeu: a lista de departamentos oficiais está vazia. */
      isRhUnavailable?: boolean;
    };
    actions: {
      onChange: (field: ComputerFormField, value: string) => void;
      onBlur: (field: ComputerFormField) => void;
      onSubmit: () => void;
      onClose: () => void;
    };
  };

  const KIND_OPTIONS = COMPUTER_KINDS.map((kind) => ({ value: kind, label: COMPUTER_KIND_LABELS[kind] }));

  const NO_DEPARTMENT = { value: '', label: '(Sem departamento)' };

  const NO_RESPONSIBLE = { value: '', label: '(Sem responsável)' };
</script>

<script lang="ts">
  import DialogContent from '$lib/components/azuos-responsive-dialog-content/azuos-responsive-dialog-content.svelte';
  import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog';
  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import SubmitButton from '$lib/components/azuos-submit-button/azuos-submit-button.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import TextAreaField from '$lib/components/azuos-text-area-field/azuos-text-area-field.svelte';
  import PersonPickerField from '$lib/components/azuos-person-picker-field/azuos-person-picker-field.svelte';
  import { COMPUTER_NOTES_MAX_LENGTH } from '@template/shared/schemas/computer.schema';

  let { data, state, actions }: AzuosComputerFormDialogProps = $props();

  const isEdit = $derived(data.mode === 'edit');
  const fields = $derived(data.fields);
  const people = $derived(
    (data.responsibles ?? []).map((person) => ({ id: person.id, name: person.name, photo: person.avatarUrl })),
  );

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    actions.onSubmit();
  }
</script>

<Dialog
  open={state.isOpen}
  onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onClose())}
>
  <DialogContent>
    <form novalidate class="flex flex-col gap-4" onsubmit={handleSubmit}>
      <!-- O cabeçalho da casa: título e descrição, sem selo de ícone desenhado à mão. -->
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Identificação da máquina' : 'Cadastrar computador'}</DialogTitle>
        <DialogDescription>
          {isEdit
          ? 'Apelido, responsável, departamento e observação. O resto a própria máquina informa.'
          : 'Só o nome e o tipo são obrigatórios. Ao salvar, você recebe o token para instalar o agente nela.'}
        </DialogDescription>
      </DialogHeader>

      <!-- Identificação do equipamento na rede -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {#if isEdit}
          <div class="flex flex-col gap-1 rounded-box bg-muted p-3 sm:col-span-2">
            <span class="text-muted-foreground text-xs font-medium">Nome informado pela máquina</span>
            <span class="font-mono text-sm font-medium text-foreground">{fields.name.value}</span>
          </div>
        {:else}
          <TextField
            data={{
              label: 'Nome da máquina',
              name: 'name',
              value: fields.name.value,
              placeholder: 'Ex: RECEPCAO-01',
            }}
            state={{
              error: fields.name.error,
              isDisabled: state.isSubmitting,
              isAutoFocused: true,
            }}
            actions={{
              onChange: (value: string) => actions.onChange('name', value),
              onBlur: () => actions.onBlur('name'),
            }}
          />
        {/if}

        <!-- Ao EDITAR, o bloco de cima (o nome informado pela máquina) ocupa as duas colunas, e
             o apelido sobrava sozinho em meia largura, com o texto de exemplo cortado. Ali ele
             ocupa a linha inteira também; ao CADASTRAR, divide a linha com o nome. -->
        <TextField
          data={{
            label: 'Nome do dispositivo',
            name: 'displayName',
            value: fields.displayName.value,
            placeholder: 'Ex: Computador da recepção',
          }}
          ui={{ className: isEdit ? 'sm:col-span-2' : undefined }}
          state={{
            error: fields.displayName.error,
            isDisabled: state.isSubmitting,
            isAutoFocused: isEdit,
          }}
          actions={{
            onChange: (value: string) => actions.onChange('displayName', value),
            onBlur: () => actions.onBlur('displayName'),
          }}
        />
      </div>

      <!-- Desktop ou notebook: obrigatório no cadastro, e corrigível depois. -->
      <div class="flex flex-col gap-1.5">
        <span class="text-ink-700 text-sm font-medium">Tipo</span>
        <OptionPicker
          data={{ value: fields.kind.value, options: KIND_OPTIONS }}
          ui={{ ariaLabel: 'Tipo', fullWidth: true, placeholder: 'Desktop ou notebook' }}
          state={{ isDisabled: state.isSubmitting, error: fields.kind.error }}
          actions={{
            onChange: (value: string) => {
              actions.onChange('kind', value);
              actions.onBlur('kind');
            },
          }}
        />
      </div>

      <!-- Atribuição: a pessoa vem da lista do escritório, pelo id — não há como digitar um nome. -->
      <div class="flex min-w-0 flex-col gap-1.5">
        <span class="text-ink-700 text-sm font-medium">Responsável</span>
        <PersonPickerField
          data={{ value: fields.responsibleId.value, people, leading: [NO_RESPONSIBLE] }}
          ui={{ ariaLabel: 'Responsável', placeholder: 'Escolha a pessoa' }}
          state={{ isDisabled: state.isSubmitting || Boolean(state.responsiblesError), isInvalid: Boolean(fields.responsibleId.error) }}
          actions={{
            onChange: (id: string) => {
              actions.onChange('responsibleId', id);
              actions.onBlur('responsibleId');
            },
          }}
        />
        {#if fields.responsibleId.error}
          <p class="text-destructive text-xs">{fields.responsibleId.error}</p>
        {:else if state.isLoadingResponsibles}
          <p class="text-ink-500 text-xs">Carregando pessoas…</p>
        {:else if state.responsiblesError}
          <p role="status" class="text-warning-ink text-xs">A lista de pessoas não carregou. Não dá para escolher o responsável agora — tente de novo em instantes.</p>
        {/if}
      </div>

      <!-- Onde a máquina está: só o departamento oficial (do RH), pelo id. -->
      <div class="flex min-w-0 flex-col gap-1.5">
        <span class="text-ink-700 text-sm font-medium">Departamento</span>
        <OptionPicker
          data={{ value: fields.departmentId.value, options: [NO_DEPARTMENT, ...(data.departmentOptions ?? [])] }}
          ui={{ ariaLabel: 'Departamento', fullWidth: true, mode: 'combobox' }}
          state={{ isDisabled: state.isSubmitting, error: fields.departmentId.error }}
          actions={{ onChange: (value: string) => actions.onChange('departmentId', value) }}
        />
        {#if state.isRhUnavailable}
          <p role="status" class="text-warning-ink text-xs">A lista do RH não carregou. Não dá para escolher o departamento agora.</p>
        {/if}
      </div>

      <TextAreaField
        data={{
          label: 'Observação',
          name: 'notes',
          value: fields.notes.value,
          placeholder: 'Ex: monitor emprestado do financeiro',
          maxLength: COMPUTER_NOTES_MAX_LENGTH,
        }}
        ui={{ rows: 3 }}
        state={{ error: fields.notes.error, isDisabled: state.isSubmitting }}
        actions={{
          onChange: (value: string) => actions.onChange('notes', value),
          onBlur: () => actions.onBlur('notes'),
        }}
      />

      {#if state.error}
        <ErrorState data={{ message: state.error }} ui={{ variant: 'inline' }} />
      {/if}

      <DialogFooter>
        <ActionButton
          data={{ label: 'Cancelar' }}
          ui={{ variant: 'secondary' }}
          state={{ isDisabled: state.isSubmitting }}
          actions={{ onClick: actions.onClose }}
        />
        <SubmitButton
          data={{
            label: isEdit ? 'Salvar' : 'Cadastrar computador',
            loadingLabel: 'Salvando…',
          }}
          ui={{ className: 'sm:w-auto' }}
          state={{ isLoading: state.isSubmitting }}
        />
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
