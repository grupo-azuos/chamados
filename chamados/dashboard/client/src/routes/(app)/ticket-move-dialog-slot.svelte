<script lang="ts" module>
  import { type TicketKanbanPendingMove } from '$lib/hooks/use-ticket-kanban/use-ticket-kanban.svelte';

  /**
   * A ponte entre o quadro da fila e o formulário de histórico, quando um arrasto pede texto.
   *
   * Existe como componente separado, e dentro de `routes/`, pelo mesmo motivo da ficha
   * (`[id]/ticket-history-form-slot.svelte`): o view-model do formulário precisa nascer junto
   * com ele (e morrer com ele) — um arrasto, um formulário novo —, e componente não pode buscar
   * o próprio dado. É uma só para as três áreas, porque o arrasto é o mesmo nas três.
   */
  export type TicketMoveDialogSlotProps = {
    move: TicketKanbanPendingMove;
    onRecorded: () => void;
    onCancel: () => void;
  };
</script>

<script lang="ts">
  import TicketMoveDialog from '$lib/components/azuos-ticket-move-dialog/azuos-ticket-move-dialog.svelte';
  import { useTicketHistoryFormModel } from '$lib/hooks/use-ticket-history-form/use-ticket-history-form.svelte';

  let { move, onRecorded, onCancel }: TicketMoveDialogSlotProps = $props();

  /* Lido uma vez, de propósito: cada arrasto monta este componente de novo (`{#key}` na tela). */
  // svelte-ignore state_referenced_locally
  const form = useTicketHistoryFormModel({
    ticket: move.ticket,
    types: move.types,
    initialType: move.initialType,
    onRecorded,
  });
</script>

<TicketMoveDialog
  data={{ protocol: move.ticket.protocol, targetTitle: move.targetTitle, form: form.data }}
  state={{ isOpen: true, form: form.state }}
  actions={{ onCancel, form: form.actions }}
/>
