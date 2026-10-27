<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { type PublicTicket } from '@template/shared/schemas/ticket.schema';

  import { useTicketReplyModel, type TicketReplyModel } from './use-ticket-reply.svelte';

  /** O model precisa de um componente para existir — mesmo apoio do `use-ticket-lookup`. */
  let {
    ticket,
    onSaved,
    onReady,
  }: {
    ticket: PublicTicket | null;
    onSaved: () => void;
    onReady: (model: TicketReplyModel) => void;
  } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { mutations: { retry: false } } }));

  onReady(useTicketReplyModel({ ticket: () => ticket, onSaved }));
</script>
