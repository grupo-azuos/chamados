<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import Ticket from '@lucide/svelte/icons/ticket';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import { useTicketDetailModel } from '$lib/hooks/use-ticket-detail/use-ticket-detail.svelte';
  import TicketDetailView from '$lib/components/azuos-ticket-detail-view/azuos-ticket-detail-view.svelte';
  import WhatsappNoticeList from '$lib/components/azuos-whatsapp-notice-list/azuos-whatsapp-notice-list.svelte';
  import TicketDataFormSlot from './ticket-data-form-slot.svelte';
  import TicketHistoryFormSlot from './ticket-history-form-slot.svelte';

  /**
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   *
   * A ficha é uma ROTA, e não um diálogo sobre a fila, porque o chamado tem endereço próprio:
   * dá para colar `/system/tickets/7` numa conversa e dizer "é deste que estou falando".
   */
  const id = Number(page.params.id);

  const detail = useTicketDetailModel(id);

  const backToQueue = () => void goto('/system/tickets');
</script>

<svelte:head>
  <title>{detail.data.ticket ? `Chamado ${detail.data.ticket.protocol}` : 'Chamado'}</title>
</svelte:head>

<!-- Estados na frente, conteúdo por último e sem aninhamento (CONTRIBUTING §2). -->
{#if detail.state.isMissing}
  <div class="mx-auto w-full max-w-3xl py-10">
    <EmptyState
      data={{
        title: 'Não encontrei este chamado',
        description: 'Confira o número do protocolo, ou volte à fila para procurar por ele.',
      }}
      ui={{ icon: Ticket }}
    >
      <ActionButton data={{ label: 'Voltar aos chamados' }} actions={{ onClick: backToQueue }} />
    </EmptyState>
  </div>
{:else if detail.state.error}
  <div class="mx-auto w-full max-w-3xl py-10">
    <ErrorState
      data={{ title: 'Não consegui abrir este chamado', message: detail.state.error }}
      actions={{ onRetry: detail.actions.onRetry }}
    />
  </div>
{:else if detail.state.isLoading || !detail.data.ticket}
  <p class="text-ink-500 py-16 text-center text-sm">Carregando o chamado…</p>
{:else}
  {@const ticket = detail.data.ticket}
  <TicketDetailView
    data={{
      ticket,
      histories: detail.data.histories,
      attachments: detail.data.attachments,
      whatsAppLink: detail.data.whatsAppLink,
    }}
    state={detail.state}
    actions={{ ...detail.actions, onBack: backToQueue }}
  >
    {#snippet historyForm()}
      <!-- `{#key}` pelo ESTÁGIO: os tipos de histórico que cabem mudam com ele, e o formulário
           precisa nascer de novo com as opções certas (num chamado encerrado, só a reabertura). -->
      {#key `${ticket.id}:${ticket.status}`}
        <TicketHistoryFormSlot {ticket} />
      {/key}
    {/snippet}

    {#snippet dataForm()}
      <!-- `{#key}` só pelo id: salvar os dados não pode remontar o formulário e apagar o que
           a pessoa ainda está digitando no campo ao lado. -->
      {#key ticket.id}
        <TicketDataFormSlot {ticket} />
      {/key}
    {/snippet}

    {#snippet notices()}
      <WhatsappNoticeList
        data={{ notices: detail.data.notices }}
        state={{
          retryingId: detail.state.retryingNoticeId,
          error: detail.state.noticeError,
        }}
        actions={{ onRetry: detail.actions.onRetryNotice }}
      />
    {/snippet}
  </TicketDetailView>
{/if}
