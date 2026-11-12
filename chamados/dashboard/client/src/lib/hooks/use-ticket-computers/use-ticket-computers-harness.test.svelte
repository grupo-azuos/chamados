<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { type Ticket } from '@template/shared/schemas/ticket.schema';

  import { useTicketComputersModel, type TicketComputersModel } from './use-ticket-computers.svelte';

  /** Mesmo apoio dos demais view-models: o model precisa de um componente para existir. */
  let { ticket, onReady }: { ticket: Ticket; onReady: (model: TicketComputersModel) => void } =
    $props();

  setQueryClientContext(
    new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    }),
  );

  // svelte-ignore state_referenced_locally
  onReady(useTicketComputersModel(ticket));
</script>
