<script lang="ts" module>
  import { type MaintenanceSchedule } from '@template/shared/schemas/maintenance.schema';

  /**
   * A ponte entre a ficha e o formulário de agendamento.
   *
   * Existe como componente separado pelo mesmo motivo do `maintenance-form-slot`: o
   * view-model do formulário nasce junto com o diálogo e morre com ele, e começa de novo, com
   * a data atual, cada vez que a pessoa abre.
   */
  export type ScheduleFormSlotProps = {
    computerId: number;
    machineName: string;
    schedule: MaintenanceSchedule | null;
    onClose: () => void;
  };
</script>

<script lang="ts">
  import MaintenanceScheduleDialog from '../components/azuos-maintenance-schedule-dialog/azuos-maintenance-schedule-dialog.svelte';
  import { useMaintenanceScheduleFormModel } from '$lib/hooks/use-maintenance-schedule-form/use-maintenance-schedule-form.svelte';

  let { computerId, machineName, schedule, onClose }: ScheduleFormSlotProps = $props();

  /* Lê as props uma vez só, de propósito: o formulário fotografa o agendamento na abertura e
     não apaga o que a pessoa está digitando se a ficha recarregar por trás. */
  // svelte-ignore state_referenced_locally
  const form = useMaintenanceScheduleFormModel({ computerId, schedule, onSaved: onClose });
</script>

<MaintenanceScheduleDialog
  data={{ ...form.data, machineName }}
  state={{ ...form.state, isOpen: true }}
  actions={{
    ...form.actions,
    onClose: () => (form.state.isSubmitting ? undefined : onClose()),
  }}
/>
