<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';

  import {
    useTicketRelationsModel,
    type TicketRelationsModel,
  } from './use-ticket-relations.svelte';

  let { ticketId, onReady }: { ticketId: number; onReady: (model: TicketRelationsModel) => void } =
    $props();

  setQueryClientContext(
    new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    }),
  );

  // svelte-ignore state_referenced_locally
  onReady(useTicketRelationsModel(ticketId));
</script>
