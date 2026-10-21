<script lang="ts" module>
  import { SCHEDULE_NOTE_MAX_LENGTH } from '@template/shared/schemas/maintenance.schema';

  import { type FormFieldState } from '$lib/types/form-field.type';

  export type MaintenanceScheduleField = 'scheduledFor' | 'note';

  /**
   * AGENDAR (ou remarcar) a manutenção de uma máquina, num modal: o dia e, se quiser, o que
   * vai ser feito.
   *
   * Função pura de props: valor e erro de cada campo chegam prontos, e o modal abre no
   * Storybook preenchido, com erro ou salvando — sem servidor no meio.
   */
  export type AzuosMaintenanceScheduleDialogProps = {
    data: {
      mode: 'create' | 'edit';
      /** O nome da máquina, para quem agenda ter certeza de qual está marcando. */
      machineName: string;
      fields: Record<MaintenanceScheduleField, FormFieldState>;
    };
    state: { isOpen: boolean; isSubmitting?: boolean; error?: string | null };
    actions: {
      onChange: (field: MaintenanceScheduleField, value: string) => void;
      onBlur: (field: MaintenanceScheduleField) => void;
      onSubmit: () => void;
      onClose: () => void;
    };
  };
</script>

<script lang="ts">
  import CalendarClock from '@lucide/svelte/icons/calendar-clock';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import DatePicker from '$lib/components/azuos-date-picker/azuos-date-picker.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import DialogContent from '$lib/components/azuos-responsive-dialog-content/azuos-responsive-dialog-content.svelte';
  import SubmitButton from '$lib/components/azuos-submit-button/azuos-submit-button.svelte';
  import TextAreaField from '$lib/components/azuos-text-area-field/azuos-text-area-field.svelte';
  import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog';

  let { data, state: dialogState, actions }: AzuosMaintenanceScheduleDialogProps = $props();

  const isEdit = $derived(data.mode === 'edit');

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    actions.onSubmit();
  }
</script>

<Dialog
  open={dialogState.isOpen}
  onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onClose())}
>
  <DialogContent>
    <form novalidate class="flex flex-col gap-4" onsubmit={handleSubmit}>
      <DialogHeader class="gap-1.5">
        <div class="flex items-center gap-2.5">
          <span class="flex size-7 shrink-0 items-center justify-center rounded-chip bg-primary/10 text-primary">
            <CalendarClock class="size-4" aria-hidden="true" />
          </span>
          <DialogTitle class="text-lg font-semibold tracking-tight">
            {isEdit ? 'Remarcar manutenção' : 'Agendar manutenção'}
          </DialogTitle>
        </div>
        <DialogDescription class="text-xs text-muted-foreground break-words">
          {data.machineName} — quando registrarem a manutenção desta máquina, o agendamento é
          dado como cumprido.
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-1.5">
        <span class="text-ink-700 text-sm font-medium">Dia da manutenção</span>
        <DatePicker
          name="scheduledFor"
          ariaLabel="Dia da manutenção"
          value={data.fields.scheduledFor.value}
          disabled={dialogState.isSubmitting}
          placeholder="Selecione o dia"
          onValueChange={(value) => {
            actions.onChange('scheduledFor', value ?? '');
            actions.onBlur('scheduledFor');
          }}
        />
        {#if data.fields.scheduledFor.error}
          <span class="text-xs text-destructive">{data.fields.scheduledFor.error}</span>
        {/if}
      </div>

      <TextAreaField
        data={{
          label: 'O que vai ser feito (opcional)',
          name: 'note',
          value: data.fields.note.value,
          placeholder: 'Ex: limpeza interna e troca de pasta térmica',
          maxLength: SCHEDULE_NOTE_MAX_LENGTH,
        }}
        state={{ error: data.fields.note.error, isDisabled: dialogState.isSubmitting }}
        actions={{
          onChange: (value: string) => actions.onChange('note', value),
          onBlur: () => actions.onBlur('note'),
        }}
      />

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
          data={{ label: isEdit ? 'Remarcar' : 'Agendar', loadingLabel: 'Salvando…' }}
          ui={{ className: 'sm:w-auto' }}
          state={{ isLoading: dialogState.isSubmitting }}
        />
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
