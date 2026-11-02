<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { type MaintenanceSchedule } from '@template/shared/schemas/maintenance.schema';

  import {
    useMaintenanceScheduleFormModel,
    type MaintenanceScheduleFormModel,
  } from './use-maintenance-schedule-form.svelte';

  /** Mesma razão do apoio da lista: o model precisa de um componente para existir. */
  let {
    computerId = 3,
    schedule = null,
    onSaved = () => {},
    onReady,
  }: {
    computerId?: number;
    schedule?: MaintenanceSchedule | null;
    onSaved?: () => void;
    onReady: (model: MaintenanceScheduleFormModel) => void;
  } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  // svelte-ignore state_referenced_locally
  onReady(useMaintenanceScheduleFormModel({ computerId, schedule, onSaved }));
</script>
