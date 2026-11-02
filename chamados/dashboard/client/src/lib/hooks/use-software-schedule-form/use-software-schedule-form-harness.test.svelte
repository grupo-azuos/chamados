<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { type SoftwareScheduleEvent } from '@template/shared/schemas/software-schedule.schema';

  import {
    useSoftwareScheduleFormModel,
    type SoftwareScheduleFormModel,
  } from './use-software-schedule-form.svelte';

  /** Mesma razão do apoio da lista: o model precisa de um componente para existir. */
  let {
    event = null,
    defaultDate,
    defaultStartTime,
    onSaved = () => {},
    onReady,
  }: {
    event?: SoftwareScheduleEvent | null;
    defaultDate?: string;
    defaultStartTime?: string;
    onSaved?: () => void;
    onReady: (model: SoftwareScheduleFormModel) => void;
  } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  // svelte-ignore state_referenced_locally
  onReady(useSoftwareScheduleFormModel({ event, defaultDate, defaultStartTime, onSaved }));
</script>
