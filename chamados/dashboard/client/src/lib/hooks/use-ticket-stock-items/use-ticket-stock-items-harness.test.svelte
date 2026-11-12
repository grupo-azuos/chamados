<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';

  import {
    useTicketStockItemsModel,
    type TicketStockItemsModel,
  } from './use-ticket-stock-items.svelte';

  /** Mesmo apoio dos demais view-models: o model precisa de um componente para existir. */
  let { ticketId, onReady }: { ticketId: number; onReady: (model: TicketStockItemsModel) => void } =
    $props();

  setQueryClientContext(
    new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    }),
  );

  // svelte-ignore state_referenced_locally
  onReady(useTicketStockItemsModel(ticketId, 'parts'));
</script>
