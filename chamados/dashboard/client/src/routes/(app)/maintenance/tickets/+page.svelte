<script lang="ts">
  import { goto } from '$app/navigation';
  import { type Ticket } from '@template/shared/schemas/ticket.schema';

  import BoardDrillBanner from '$lib/components/azuos-board-drill-banner/azuos-board-drill-banner.svelte';
  import TicketListView from '$lib/components/azuos-ticket-list-view/azuos-ticket-list-view.svelte';
  import { useTicketListModel } from '$lib/hooks/use-ticket-list/use-ticket-list.svelte';

  /**
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   *
   * Abrir um chamado é NAVEGAR para a ficha dele (`/maintenance/tickets/7`), e não abrir um diálogo por
   * cima da fila: a ficha tem a linha do tempo inteira, e tem endereço para ser apontada.
   */
  const list = useTicketListModel({ area: 'manutencao' });
</script>

<svelte:head>
  <title>Chamados</title>
</svelte:head>

<!-- Vinda de um clique no Painel, a fila mostra no alto o recorte que a trouxe. -->
<div class="flex w-full flex-col">
  {#if list.data.drillBanner}
    <BoardDrillBanner
      data={list.data.drillBanner}
      actions={{ onClear: list.actions.onClearDrill, onBack: list.actions.onBackToBoard }}
    />
  {/if}
  <TicketListView
    data={list.data}
    state={list.state}
    actions={{ ...list.actions, onAnswer: (ticket: Ticket) => void goto(`/maintenance/tickets/${ticket.id}`) }}
  />
</div>
