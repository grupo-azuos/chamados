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
  import Collapsible from '$lib/components/azuos-collapsible/azuos-collapsible.svelte';
  import TicketDataForm from '$lib/components/azuos-ticket-data-form/azuos-ticket-data-form.svelte';
  import TicketStockItemsCard from '$lib/components/azuos-ticket-stock-items-card/azuos-ticket-stock-items-card.svelte';
  import TicketWatchersCard from '$lib/components/azuos-ticket-watchers-card/azuos-ticket-watchers-card.svelte';
  import { useTicketComputersModel } from '$lib/hooks/use-ticket-computers/use-ticket-computers.svelte';
  import { useTicketDataFormModel } from '$lib/hooks/use-ticket-data-form/use-ticket-data-form.svelte';
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
  /* Os itens do estoque saem do depósito DESTA área — Depósito da TI. */
  // svelte-ignore state_referenced_locally
  const stock = useTicketStockItemsModel(ticket.id, 'parts');
  /* As máquinas do chamado: o diálogo grande de escolha, e a lista que a ficha mostra. */
  // svelte-ignore state_referenced_locally
  const computers = useTicketComputersModel(ticket);
</script>

<div class="flex flex-col gap-3">
  <TicketDataForm
    data={{ ...form.data, linkedComputers: computers.data.linked }}
    state={form.state}
    actions={{ ...form.actions, onOpenComputers: computers.actions.onOpen }}
  />
  <!-- `{#key}` pela existência: os itens chegam depois de a seção nascer, e seção com
       conteúdo começa aberta. -->
  {#key stock.data.items.length > 0}
    <Collapsible
      data={{ title: `Itens do estoque (${stock.data.items.length})` }}
      state={{ isOpen: stock.data.items.length > 0 }}
    >
      <TicketStockItemsCard
        data={{
          ...stock.data,
          machines: computers.data.linked.map((computer) => ({
            value: String(computer.id),
            label: computer.name,
          })),
        }}
        ui={{ shelfLabel: 'Depósito da TI', isHeaderHidden: true }}
        state={{ ...stock.state, isClosed: isClosedTicketStatus(ticket.status) }}
        actions={stock.actions}
      />
    </Collapsible>
  {/key}
  {#key watchers.data.selectedIds.length > 0}
    <Collapsible
      data={{ title: `Pessoas vinculadas (${watchers.data.selectedIds.length})` }}
      state={{ isOpen: watchers.data.selectedIds.length > 0 }}
    >
      <TicketWatchersCard
        data={watchers.data}
        ui={{ isHeaderHidden: true }}
        state={watchers.state}
        actions={watchers.actions}
      />
    </Collapsible>
  {/key}
</div>

{#if computers.state.isOpen}
  <TicketComputersDialog data={computers.data} state={computers.state} actions={computers.actions} />
{/if}
