<script lang="ts" module>
  import { DEPARTMENTS, DEPARTMENT_LABELS } from '@template/shared/domain/department.util';

  import type { ComputerResponsible } from '@template/shared/schemas/computer.schema';

  import { type FormFieldState } from '$lib/types/form-field.type';

  export type ComputerFormField = 'name' | 'displayName' | 'responsibleName' | 'department';

  /**
   * O formulário de cadastrar máquina e o de corrigir a identificação dela, num modal.
   *
   * Função pura de props: o valor e o erro de cada campo chegam prontos (`FormFieldState`), e
   * por isso o modal abre no Storybook preenchido, com erro ou enviando — sem servidor e sem
   * biblioteca de formulário no meio.
   *
   * **O nome da máquina só é editável no cadastro.** Depois, quem o informa é a própria
   * máquina, a cada leitura do agente: digitá-lo aqui faria a ficha discordar do que o agente
   * manda, e a pessoa procuraria no inventário um nome que não existe em lugar nenhum.
   *
   * A recusa do servidor aparece DENTRO do modal, e ele continua aberto: fechar jogaria fora
   * o que foi digitado.
   */
  export type AzuosComputerFormDialogProps = {
    data: {
      mode: 'create' | 'edit';
      responsibles?: ComputerResponsible[];
      fields: Record<ComputerFormField, FormFieldState>;
    };
    state: { isOpen: boolean; isSubmitting?: boolean; error?: string | null; isLoadingResponsibles?: boolean; responsiblesError?: string | null };
    actions: {
      onChange: (field: ComputerFormField, value: string) => void;
      onBlur: (field: ComputerFormField) => void;
      onSubmit: () => void;
      onClose: () => void;
    };
  };

  const DEPARTMENT_OPTIONS = [
    { value: '', label: 'Sem departamento' },
    ...DEPARTMENTS.map((department) => ({
      value: department,
      label: DEPARTMENT_LABELS[department],
    })),
  ];
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
  import Monitor from '@lucide/svelte/icons/monitor';

  let { data, state, actions }: AzuosComputerFormDialogProps = $props();

  const isEdit = $derived(data.mode === 'edit');
  const fields = $derived(data.fields);

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
      <DialogHeader class="gap-1.5">
        <div class="flex items-center gap-2.5">
          <span class="flex size-7 shrink-0 items-center justify-center rounded-chip bg-primary/10 text-primary">
            <Monitor class="size-4" aria-hidden="true" />
          </span>
          <DialogTitle class="text-lg font-semibold tracking-tight">{isEdit ? 'Identificação da máquina' : 'Cadastrar computador'}</DialogTitle>
        </div>
        <DialogDescription class="text-xs text-muted-foreground">
          {isEdit
            ? 'Apelido, responsável e departamento. O resto a própria máquina informa.'
            : 'Só o nome é obrigatório. Ao salvar, você recebe o token para instalar o agente nela.'}
        </DialogDescription>
      </DialogHeader>

      <!-- Identificação do equipamento na rede -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {#if isEdit}
          <div class="flex flex-col gap-1 rounded-box border border-border/70 bg-muted/40 p-3 sm:col-span-2">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome informado pela máquina</span>
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

      <!-- Atribuição e departamento -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div class="flex min-w-0 flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Responsável</span>
          <OptionPicker
            data={{ value: fields.responsibleName.value,
              options: [
                { value: '', label: 'Sem responsável' },
                ...(data.responsibles ?? []).map((person) => ({ value: person.id, label: person.name })),
              ] }}
            ui={{ ariaLabel: 'Responsável', mode: 'combobox', fullWidth: true,
              placeholder: 'Selecione ou informe um nome', searchPlaceholder: 'Buscar pessoa ou digitar nome…',
              allowCustomValue: true, selectedLabel: fields.responsibleName.value || 'Sem responsável', showSelectedTooltip: true }}
            state={{ isDisabled: state.isSubmitting, error: fields.responsibleName.error }}
            actions={{
              onChange: (id) => actions.onChange('responsibleName', data.responsibles?.find((person) => person.id === id)?.name ?? ''),
              onCustomValue: (name) => actions.onChange('responsibleName', name),
            }}
          />
          {#if state.isLoadingResponsibles}
            <p class="text-ink-500 text-xs">Carregando pessoas… Você também pode digitar um nome.</p>
          {:else if state.responsiblesError}
            <p role="status" class="text-warning text-xs">A lista de pessoas não carregou. Digite o nome do responsável na busca.</p>
          {:else}
            <p class="text-ink-500 text-xs">Não encontrou a pessoa? Digite o nome e escolha “Usar”.</p>
          {/if}
        </div>

        <div class="flex flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Departamento</span>
          <OptionPicker
            data={{ value: fields.department.value, options: DEPARTMENT_OPTIONS }}
            ui={{ ariaLabel: 'Departamento', fullWidth: true }}
            state={{ isDisabled: state.isSubmitting }}
            actions={{ onChange: (value: string) => actions.onChange('department', value) }}
          />
        </div>
      </div>

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
