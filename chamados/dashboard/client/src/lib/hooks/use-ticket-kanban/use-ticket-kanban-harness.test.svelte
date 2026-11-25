<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { type Ticket } from '@template/shared/schemas/ticket.schema';

  import { type AreaContext } from '$lib/hooks/use-area-context/use-area-context.svelte';

  import { useTicketKanbanModel, type TicketKanbanModel } from './use-ticket-kanban.svelte';

  /** O model só existe dentro de um componente: é dali que vêm o QueryClient e o ciclo de vida. */
  let {
    onReady,
    area = 'sistema',
    tickets,
  }: {
    onReady: (model: TicketKanbanModel) => void;
    area?: AreaContext;
    /** Os chamados que a fila entregaria — o teste troca o que esta função devolve. */
    tickets: () => readonly Ticket[];
  } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  // svelte-ignore state_referenced_locally
  onReady(useTicketKanbanModel({ area, tickets }));
</script>
