<script lang="ts" module>
  import { isClosedTicketStatus } from '@template/shared/domain/ticket-status.util';
  import { type Ticket } from '@template/shared/schemas/ticket.schema';

  /**
   * A ponte entre a ficha do chamado e o formulário de dados — pelo mesmo motivo do
   * `ticket-history-form-slot`: o view-model nasce e morre com o formulário.
   */
  export type TicketDataFormSlotProps = { ticket: Ticket };
</script>

<script lang="ts">
  import TicketComputersDialog from '$lib/components/azuos-ticket-computers-dialog/azuos-ticket-computers-dialog.svelte';
  import TicketDataForm from '$lib/components/azuos-ticket-data-form/azuos-ticket-data-form.svelte';
  import TicketRelationsCard from '$lib/components/azuos-ticket-relations-card/azuos-ticket-relations-card.svelte';
  import TicketWatchersCard from '$lib/components/azuos-ticket-watchers-card/azuos-ticket-watchers-card.svelte';
  import { useTicketComputersModel } from '$lib/hooks/use-ticket-computers/use-ticket-computers.svelte';
  import { useTicketDataFormModel } from '$lib/hooks/use-ticket-data-form/use-ticket-data-form.svelte';
  import { useTicketRelationsModel } from '$lib/hooks/use-ticket-relations/use-ticket-relations.svelte';
  import TicketStockItemsCard from '$lib/components/azuos-ticket-stock-items-card/azuos-ticket-stock-items-card.svelte';
  import { useTicketStockItemsModel } from '$lib/hooks/use-ticket-stock-items/use-ticket-stock-items.svelte';
  import { useTicketWatchersModel } from '$lib/hooks/use-ticket-watchers/use-ticket-watchers.svelte';

  let { ticket }: TicketDataFormSlotProps = $props();

  /* Lê `ticket` só uma vez, de propósito: o formulário fotografa o chamado na montagem. Quem
     troca de chamado é o `{#key}` da rota. */
  // svelte-ignore state_referenced_locally
  const form = useTicketDataFormModel({ ticket });
  /* As pessoas vinculadas moram junto dos dados: são do chamado, e se salvam na hora. */
  // svelte-ignore state_referenced_locally
  const watchers = useTicketWatchersModel(ticket.id);
  /* Os chamados vinculados também moram aqui: relacionam chamados entre si na hora. */
  // svelte-ignore state_referenced_locally
  const relations = useTicketRelationsModel(ticket.id);
  /* Os itens do estoque saem do depósito DESTA área — Depósito da TI. */
  // svelte-ignore state_referenced_locally
  const stock = useTicketStockItemsModel(ticket.id, 'parts');
  /* As máquinas do chamado: o diálogo grande de escolha, e a lista que a ficha mostra. */
  // svelte-ignore state_referenced_locally
  const computers = useTicketComputersModel(ticket);
</script>

<div class="flex flex-col gap-4">
  <TicketDataForm
    data={{ ...form.data, linkedComputers: computers.data.linked }}
    state={form.state}
    actions={{ ...form.actions, onOpenComputers: computers.actions.onOpen }}
  />
  <!-- Lado a lado em tela larga: a ficha ocupa a largura toda agora. -->
  <div class="grid grid-cols-1 gap-x-6 lg:grid-cols-2">
    <TicketWatchersCard data={watchers.data} state={watchers.state} actions={watchers.actions} />
    <TicketRelationsCard data={relations.data} state={relations.state} actions={relations.actions} />
    <div class="lg:col-span-2">
      <TicketStockItemsCard
        data={{
          ...stock.data,
          machines: computers.data.linked.map((computer) => ({
            value: String(computer.id),
            label: computer.name,
          })),
        }}
        ui={{ shelfLabel: 'Depósito da TI' }}
        state={{ ...stock.state, isClosed: isClosedTicketStatus(ticket.status) }}
        actions={stock.actions}
      />
    </div>
  </div>
</div>

{#if computers.state.isOpen}
  <TicketComputersDialog data={computers.data} state={computers.state} actions={computers.actions} />
{/if}
