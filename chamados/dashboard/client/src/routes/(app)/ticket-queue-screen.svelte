<script lang="ts" module>
  import { type AreaContext } from '$lib/hooks/use-area-context/use-area-context.svelte';

  /**
   * A FILA DE CHAMADOS de uma área — a mesma composição nas três (`/infra/tickets`,
   * `/system/tickets`, `/maintenance/tickets`), que só mudam a área. Mora aqui, uma vez, para o
   * quadro, o diálogo do arrasto e a faixa do Painel não serem copiados três vezes.
   */
  export type TicketQueueScreenProps = { area: AreaContext };
</script>

<script lang="ts">
  import { type Ticket } from '@template/shared/schemas/ticket.schema';

  import BoardDrillBanner from '$lib/components/azuos-board-drill-banner/azuos-board-drill-banner.svelte';
  import TicketKanbanBoard from '$lib/components/azuos-ticket-kanban-board/azuos-ticket-kanban-board.svelte';
  import TicketListView from '$lib/components/azuos-ticket-list-view/azuos-ticket-list-view.svelte';
  import { useTicketKanbanModel } from '$lib/hooks/use-ticket-kanban/use-ticket-kanban.svelte';
  import { useTicketListModel } from '$lib/hooks/use-ticket-list/use-ticket-list.svelte';

  import TicketMoveDialogSlot from './ticket-move-dialog-slot.svelte';

  let { area }: TicketQueueScreenProps = $props();

  /**
   * Só compõe: os models e as views (CONTRIBUTING §3). A área não muda enquanto a tela vive —
   * trocar de área é trocar de rota.
   *
   * Abrir um chamado é NAVEGAR para a ficha dele (`/<área>/tickets/7`), e não abrir um diálogo
   * por cima da fila: a ficha tem a linha do tempo inteira, e tem endereço para ser apontada.
   */
  // svelte-ignore state_referenced_locally
  const list = useTicketListModel({ area });
  // svelte-ignore state_referenced_locally
  const kanban = useTicketKanbanModel({ area, tickets: () => list.data.tickets });
</script>

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
    actions={{ ...list.actions, onAnswer: (ticket: Ticket) => kanban.actions.onOpenTicket(ticket.id) }}
  >
    {#snippet board()}
      <TicketKanbanBoard data={kanban.data} state={kanban.state} actions={kanban.actions} />
    {/snippet}
  </TicketListView>
</div>

{#if kanban.data.pendingMove}
  {#key kanban.data.pendingMove}
    <TicketMoveDialogSlot
      move={kanban.data.pendingMove}
      onRecorded={kanban.actions.onMoveRecorded}
      onCancel={kanban.actions.onCancelMove}
    />
  {/key}
{/if}
