<script lang="ts">
  import { page } from '$app/state';
  import { TICKET_ACCESS_PARAM } from '@template/shared/domain/ticket-invite.util';
  import TicketLookupView from '../components/azuos-ticket-lookup-view/azuos-ticket-lookup-view.svelte';
  import TicketReplyForm from '../components/azuos-ticket-reply-form/azuos-ticket-reply-form.svelte';
  import { useTicketLookupModel } from '$lib/hooks/use-ticket-lookup/use-ticket-lookup.svelte';
  import { useTicketReplyModel } from '$lib/hooks/use-ticket-reply/use-ticket-reply.svelte';

  /**
   * CONSULTAR CHAMADO — os chamados da pessoa e o que ela faz em cada um (responder, reabrir,
   * vincular). Tela própria, e não mais um drawer em cima do formulário de abrir: quem volta
   * à Central para acompanhar não precisa passar pelo formulário.
   *
   * A rota só compõe: chama os models e entrega para as views (CONTRIBUTING §3).
   */
  const lookup = useTicketLookupModel();
  /* O lado de quem pediu da OS: responder, reabrir, vincular — sobre o chamado aberto. */
  const reply = useTicketReplyModel({
    ticket: () => lookup.data.ticket,
    onSaved: lookup.actions.onRefresh,
  });

  /* Quem chega pelo link de consulta (`?ticket=…`, o das mensagens de WhatsApp) já cai com o
     chamado aberto, sem digitar número. Lido uma vez, na chegada. */
  const accessToken = page.url.searchParams.get(TICKET_ACCESS_PARAM);
  if (accessToken) lookup.actions.onOpenLink(accessToken);
</script>

<svelte:head>
  <title>Consultar chamado — Central de Chamados TI</title>
</svelte:head>

{#snippet ticketActions()}
  {#if reply.state.canReply}
    <TicketReplyForm data={reply.data} state={reply.state} actions={reply.actions} />
  {/if}
{/snippet}

<main class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
  <TicketLookupView
    data={lookup.data}
    state={lookup.state}
    actions={lookup.actions}
    slots={{ ticketActions }}
  />
</main>
