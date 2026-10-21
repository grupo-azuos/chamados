import { localDayOf } from '@template/shared/domain/maintenance.util';
import { createForm } from '@tanstack/svelte-form';
import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import {
  type MaintenanceSchedule,
  type MaintenanceScheduleFormValues,
  maintenanceScheduleFormSchema,
  type SaveMaintenanceScheduleInput,
} from '@template/shared/schemas/maintenance.schema';

import { readError } from '$lib/api/http-client';
import { maintenancesApi } from '$lib/api/maintenances.api';
import { toFieldState } from '$lib/hooks/use-form-projection/use-form-projection.svelte';
import { invalidateSchedules } from '$lib/hooks/use-maintenance-schedule/use-maintenance-schedule.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { type FormFieldState } from '$lib/types/form-field.type';

export type MaintenanceScheduleField = 'scheduledFor' | 'note';

export type MaintenanceScheduleFormModel = {
  data: {
    mode: 'create' | 'edit';
    fields: Record<MaintenanceScheduleField, FormFieldState>;
  };
  state: { isSubmitting: boolean; error: string | null };
  actions: {
    onChange: (field: MaintenanceScheduleField, value: string) => void;
    onBlur: (field: MaintenanceScheduleField) => void;
    onSubmit: () => void;
  };
};

/**
 * O formulário de agendar (ou remarcar) a manutenção de uma máquina.
 *
 * Começa com o agendamento atual, quando há um: remarcar é mudar a data do que já existe, e
 * a pessoa não precisa redigitar o que ia ser feito.
 */
export function useMaintenanceScheduleFormModel({
  computerId,
  schedule,
  onSaved,
}: {
  computerId: number;
  schedule: MaintenanceSchedule | null;
  onSaved: () => void;
}): MaintenanceScheduleFormModel {
  const queryClient = useQueryClient();

  const save = mirrorStore(
    createMutation({
      mutationFn: (values: MaintenanceScheduleFormValues) =>
        maintenancesApi.saveSchedule(computerId, toScheduleInput(values)),
      onSuccess: async () => {
        await invalidateSchedules(queryClient);
        onSaved();
      },
    }),
  );

  const form = createForm(() => ({
    defaultValues: toScheduleFormValues(schedule),
    /* "Hoje" é o do relógio de quem está agendando — por isso o schema nasce aqui. */
    validators: { onChange: maintenanceScheduleFormSchema(localDayOf()) },
    onSubmit: ({ value }: { value: MaintenanceScheduleFormValues }) => {
      save.current.mutate(value);
    },
  }));

  const values = form.useSelector((state) => state.values);
  const fieldMeta = form.useSelector((state) => state.fieldMeta);
  const isSubmitted = form.useSelector((state) => state.submissionAttempts > 0);

  return {
    get data() {
      const field = (name: MaintenanceScheduleField): FormFieldState =>
        toFieldState(values.current[name], fieldMeta.current[name], isSubmitted.current);

      return {
        mode: schedule ? ('edit' as const) : ('create' as const),
        fields: { scheduledFor: field('scheduledFor'), note: field('note') },
      };
    },
    get state() {
      return { isSubmitting: save.current.isPending, error: readError(save.current.error) };
    },
    actions: {
      onChange: (field, value) => form.setFieldValue(field, value),
      /* Mesmo motivo de `use-maintenance-form`: sem `form.Field` montado, o "tocado" é marcado
         à mão, senão o erro nunca aparece ao sair do campo. */
      onBlur: (field) => {
        form.setFieldMeta(field, (prev) => ({ ...prev, isTouched: true }));
        void form.validateField(field, 'change');
      },
      onSubmit: () => void form.handleSubmit(),
    },
  };
}

/** O formulário aberto: com o agendamento atual, ou em branco. */
export function toScheduleFormValues(
  schedule: MaintenanceSchedule | null,
): MaintenanceScheduleFormValues {
  return { scheduledFor: schedule?.scheduledFor ?? '', note: schedule?.note ?? '' };
}

/** O que vai para a API: observação vazia vira nulo, e não um texto em branco guardado. */
export function toScheduleInput(values: MaintenanceScheduleFormValues): SaveMaintenanceScheduleInput {
  const note = values.note.trim();

  return { scheduledFor: values.scheduledFor, note: note === '' ? null : note };
}
