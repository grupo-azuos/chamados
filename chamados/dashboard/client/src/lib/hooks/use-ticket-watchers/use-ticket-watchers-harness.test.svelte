<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';

  import { useTicketWatchersModel, type TicketWatchersModel } from './use-ticket-watchers.svelte';

  /** Mesmo apoio dos demais view-models: o model precisa de um componente para existir. */
  let { ticketId, onReady }: { ticketId: number; onReady: (model: TicketWatchersModel) => void } =
    $props();

  setQueryClientContext(
    new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    }),
  );

  // svelte-ignore state_referenced_locally
  onReady(useTicketWatchersModel(ticketId));
</script>
