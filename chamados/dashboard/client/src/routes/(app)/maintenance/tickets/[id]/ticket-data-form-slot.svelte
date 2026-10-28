<script lang="ts" module>
  import { type Ticket } from '@template/shared/schemas/ticket.schema';

  /**
   * A ponte entre a ficha do chamado e o formulário de dados — pelo mesmo motivo do
   * `ticket-history-form-slot`: o view-model nasce e morre com o formulário.
   */
  export type TicketDataFormSlotProps = { ticket: Ticket };
</script>

<script lang="ts">
  import TicketDataForm from '$lib/components/azuos-ticket-data-form/azuos-ticket-data-form.svelte';
  import TicketWatchersCard from '$lib/components/azuos-ticket-watchers-card/azuos-ticket-watchers-card.svelte';
  import { useTicketDataFormModel } from '$lib/hooks/use-ticket-data-form/use-ticket-data-form.svelte';
  import { useTicketWatchersModel } from '$lib/hooks/use-ticket-watchers/use-ticket-watchers.svelte';

  let { ticket }: TicketDataFormSlotProps = $props();

  /* Lê `ticket` só uma vez, de propósito: o formulário fotografa o chamado na montagem. Quem
     troca de chamado é o `{#key}` da rota. */
  // svelte-ignore state_referenced_locally
  const form = useTicketDataFormModel({ ticket });
  /* As pessoas vinculadas moram junto dos dados: são do chamado, e se salvam na hora. */
  // svelte-ignore state_referenced_locally
  const watchers = useTicketWatchersModel(ticket.id);
</script>

<div class="flex flex-col gap-4">
  <TicketDataForm data={form.data} state={form.state} actions={form.actions} />
  <TicketWatchersCard data={watchers.data} state={watchers.state} actions={watchers.actions} />
</div>
