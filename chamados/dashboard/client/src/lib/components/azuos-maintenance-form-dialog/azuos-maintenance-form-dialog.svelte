<!--
  @component
  O formulário de registrar (e corrigir) uma manutenção, num modal.

  Função pura de props: o valor e o erro de cada campo chegam prontos (`FormFieldState`), e a lista
  de máquinas vem de fora. Por isso o modal abre no Storybook preenchido, com erro ou enviando — sem
  servidor e sem biblioteca de formulário no meio.

  **O campo de equipamento à mão só aparece quando nenhuma máquina foi escolhida.** Os dois juntos
  deixariam o registro dizendo duas coisas diferentes sobre o mesmo serviço.

  Props: `data` traz o modo, os campos e as máquinas; `state` diz se está aberto, enviando,
  carregando as máquinas ou com erro; `actions` recebe a digitação (`onChange`, `onBlur`), o envio e
  o fechar.
-->
<script lang="ts" module>
  import {
    MAINTENANCE_TYPES,
    MAINTENANCE_TYPE_LABELS,
    PREVENTIVE_INTERVAL_MONTHS,
    type MaintenanceType,
    resetsPreventiveClock,
  } from '@template/shared/domain/maintenance.util';
  import { DESCRIPTION_MAX_LENGTH } from '@template/shared/schemas/maintenance.schema';

  import { type AzuosPersonPickerPerson } from '$lib/components/azuos-person-picker-field/azuos-person-picker-field.svelte';
  import { type FormFieldState } from '$lib/types/form-field.type';

  export type MaintenanceFormField =
    | 'computerId'
    | 'otherMachine'
    | 'type'
    | 'description'
    | 'performedByIds'
    | 'performedAt';

  export type MachineOption = { value: string; label: string };

  export type AzuosMaintenanceFormDialogProps = {
    data: {
      mode: 'create' | 'edit';
      fields: Record<MaintenanceFormField, FormFieldState>;
      machines: MachineOption[];
      /** As pessoas para "Quem fez", com a foto. */
      people?: AzuosPersonPickerPerson[];
    };
    state: {
      isOpen: boolean;
      isSubmitting?: boolean;
      isMachinesLoading?: boolean;
      error?: string | null;
    };
    actions: {
      onChange: (field: MaintenanceFormField, value: string) => void;
      onBlur: (field: MaintenanceFormField) => void;
      onSubmit: () => void;
      onClose: () => void;
    };
  };

  const TYPE_OPTIONS = MAINTENANCE_TYPES.map((type) => ({
    value: type,
    label: MAINTENANCE_TYPE_LABELS[type],
  }));

  /**
   * As frases que a equipe mais escreve. Um toque põe a frase em "O que foi feito" — no fim do que
   * já estiver escrito, separada por ponto — e a pessoa completa o que faltar.
   */
  export const DESCRIPTION_SUGGESTIONS = [
    'Limpeza interna',
    'Troca da pasta térmica',
    'Troca de SSD',
    'Troca de memória',
    'Formatação e reinstalação',
    'Atualização do sistema',
  ] as const;

  /** O texto com a frase pronta no fim, sem repetir a que já está lá. */
  export function withSuggestion(current: string, phrase: string): string {
    const text = current.trim();
    if (text.toLocaleLowerCase('pt-BR').includes(phrase.toLocaleLowerCase('pt-BR'))) return text;
    if (!text) return `${phrase}.`;

    return `${text.replace(/[.\s]+$/, '')}. ${phrase}.`;
  }

  /** O que o tipo escolhido faz com o prazo da preventiva — a pessoa sabe antes de salvar. */
  export function preventiveHintOf(type: string): string {
    if (!MAINTENANCE_TYPES.includes(type as MaintenanceType)) return '';
    if (resetsPreventiveClock(type as MaintenanceType)) {
      return `Conta como preventiva: a máquina fica em dia por mais ${PREVENTIVE_INTERVAL_MONTHS} meses.`;
    }

    return 'Não conta como preventiva: o prazo da máquina continua o mesmo.';
  }

  /** A bolinha de cada tipo, na cor do status dele (a mesma do selo do card). */

  /** A opção que libera o campo de texto: equipamento que não está no inventário. */
  export const OTHER_MACHINE_OPTION = {
    value: '',
    label: 'Outro equipamento (fora do inventário)',
  };
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
  import DatePicker from '$lib/components/azuos-date-picker/azuos-date-picker.svelte';
  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import SegmentedControl from '$lib/components/azuos-segmented-control/azuos-segmented-control.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import PersonMultiPickerField from '$lib/components/azuos-person-multi-picker-field/azuos-person-multi-picker-field.svelte';
  import SubmitButton from '$lib/components/azuos-submit-button/azuos-submit-button.svelte';
  import TextAreaField from '$lib/components/azuos-text-area-field/azuos-text-area-field.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import CalendarClock from '@lucide/svelte/icons/calendar-clock';
  import Info from '@lucide/svelte/icons/info';
  import Monitor from '@lucide/svelte/icons/monitor';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import Wrench from '@lucide/svelte/icons/wrench';
  import SectionTitle from '$lib/components/azuos-section-title/azuos-section-title.svelte';

  let { data, state: dialogState, actions }: AzuosMaintenanceFormDialogProps = $props();

  const isEdit = $derived(data.mode === 'edit');
  const fields = $derived(data.fields);

  const machineOptions = $derived([OTHER_MACHINE_OPTION, ...data.machines]);
  const isOtherMachine = $derived(fields.computerId.value === '');
  const preventiveHint = $derived(preventiveHintOf(fields.type.value));

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
    <form novalidate class="flex flex-col gap-6" onsubmit={handleSubmit}>
      <!-- O cabeçalho da casa: título e descrição, sem selo de ícone desenhado à mão. -->
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Corrigir manutenção' : 'Registrar manutenção'}</DialogTitle>
        <DialogDescription>
          {isEdit
          ? 'Altere o que ficou errado e salve. O histórico guarda o antes e o depois.'
          : 'Em qual equipamento, o que foi feito, quem fez e quando.'}
        </DialogDescription>
      </DialogHeader>

      <!-- 1. O EQUIPAMENTO -->
      <fieldset class="flex flex-col gap-3">
        <legend class="contents">
          <SectionTitle
            data={{ title: 'Equipamento', description: 'Uma máquina do inventário, ou outro equipamento.' }}
            ui={{ icon: Monitor, className: 'mb-1' }}
          />
        </legend>
        <OptionPicker
          data={{ value: fields.computerId.value, options: machineOptions }}
          ui={{ ariaLabel: 'Equipamento', fullWidth: true, searchPlaceholder: 'Buscar máquina…' }}
          state={{ isDisabled: dialogState.isSubmitting || dialogState.isMachinesLoading }}
          actions={{ onChange: (value: string) => actions.onChange('computerId', value) }}
        />
        {#if dialogState.isMachinesLoading}
          <span class="text-muted-foreground text-xs">Carregando as máquinas do inventário…</span>
        {/if}
        <!-- Só quando nenhuma máquina foi escolhida: é a saída para o que não está no inventário. -->
        {#if isOtherMachine}
          <TextField
            data={{
              label: 'Qual equipamento',
              name: 'otherMachine',
              value: fields.otherMachine.value,
              placeholder: 'Ex: impressora da recepção, notebook antigo',
            }}
            state={{ error: fields.otherMachine.error, isDisabled: dialogState.isSubmitting }}
            actions={{
              onChange: (value: string) => actions.onChange('otherMachine', value),
              onBlur: () => actions.onBlur('otherMachine'),
            }}
          />
        {/if}
      </fieldset>

      <!-- 2. O SERVIÇO -->
      <fieldset class="flex flex-col gap-3 border-t border-border/70 pt-5">
        <legend class="contents">
          <SectionTitle
            data={{ title: 'O serviço', description: 'O tipo decide se a máquina fica em dia com a preventiva.' }}
            ui={{ icon: Wrench, className: 'mb-1' }}
          />
        </legend>
        <!-- Uma escolha entre poucas, à vista: o controle segmentado da casa (pílula cinza com a
             escolhida em branco), e não pastilhas pintadas de azul. -->
        <SegmentedControl
          data={{ value: fields.type.value, options: TYPE_OPTIONS }}
          ui={{ ariaLabel: 'Tipo de manutenção' }}
          state={{ isDisabled: dialogState.isSubmitting }}
          actions={{ onChange: (value: string) => actions.onChange('type', value) }}
        />
        {#if preventiveHint}
          <p class="text-muted-foreground flex items-start gap-1.5 text-xs">
            <Info class="mt-px size-3.5 shrink-0" aria-hidden="true" />
            {preventiveHint}
          </p>
        {/if}

        <TextAreaField
          data={{
            label: 'O que foi feito',
            name: 'description',
            value: fields.description.value,
            placeholder: 'Ex: troca de SSD, limpeza interna, troca de memória',
            maxLength: DESCRIPTION_MAX_LENGTH,
          }}
          state={{ error: fields.description.error, isDisabled: dialogState.isSubmitting }}
          actions={{
            onChange: (value: string) => actions.onChange('description', value),
            onBlur: () => actions.onBlur('description'),
          }}
        />
        <div class="flex flex-wrap items-center gap-1.5" role="group" aria-label="Frases prontas">
          <span class="text-muted-foreground inline-flex items-center gap-1 text-xs">
            <Sparkles class="size-3.5" aria-hidden="true" />
            Frases prontas:
          </span>
          {#each DESCRIPTION_SUGGESTIONS as phrase (phrase)}
            <ActionButton
              data={{ label: phrase }}
              ui={{ variant: 'secondary', size: 'sm' }}
              state={{ isDisabled: dialogState.isSubmitting }}
              actions={{ onClick: () => actions.onChange('description', withSuggestion(fields.description.value, phrase)) }}
            />
          {/each}
        </div>
      </fieldset>

      <!-- 3. QUEM E QUANDO -->
      <fieldset class="flex flex-col gap-3 border-t border-border/70 pt-5">
        <legend class="contents">
          <SectionTitle
            data={{ title: 'Quem e quando', description: 'Só a equipe do sistema: gestores e administradores.' }}
            ui={{ icon: CalendarClock, className: 'mb-1' }}
          />
        </legend>
        <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <!-- Uma manutenção pode ter mais de um responsável: o campo de VÁRIAS pessoas, com a foto. -->
          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <span class="text-sm font-medium text-muted-foreground">Quem fez</span>
            <PersonMultiPickerField
              data={{
                values: fields.performedByIds.value ? fields.performedByIds.value.split(',') : [],
                people: data.people ?? [],
                placeholder: 'Escolha quem fez o serviço',
              }}
              ui={{ ariaLabel: 'Quem fez' }}
              state={{ isDisabled: dialogState.isSubmitting }}
              actions={{ onChange: (ids: string[]) => actions.onChange('performedByIds', ids.join(',')) }}
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <span class="text-sm font-medium text-muted-foreground">Data do serviço</span>
            <DatePicker
              name="performedAt"
              ariaLabel="Data do serviço"
              value={fields.performedAt.value}
              disabled={dialogState.isSubmitting}
              placeholder="Selecione a data"
              onValueChange={(val) => {
                actions.onChange('performedAt', val ?? '');
                actions.onBlur('performedAt');
              }}
            />
            {#if fields.performedAt.error}
              <span class="text-xs text-destructive">{fields.performedAt.error}</span>
            {/if}
          </div>
        </div>
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
          data={{
            label: isEdit ? 'Salvar correção' : 'Registrar manutenção',
            loadingLabel: 'Salvando…',
          }}
          ui={{ className: 'sm:w-auto' }}
          state={{ isLoading: dialogState.isSubmitting }}
        />
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
