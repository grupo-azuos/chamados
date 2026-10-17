<script lang="ts">
  import { page } from '$app/state';
  import { TICKET_ACCESS_PARAM } from '@template/shared/domain/ticket-invite.util';
  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import OpenTicketForm from './components/azuos-open-ticket-form/azuos-open-ticket-form.svelte';
  import TicketLookupDrawer from './components/azuos-ticket-lookup-drawer/azuos-ticket-lookup-drawer.svelte';
  import { useOpenTicketModel } from '$lib/hooks/use-open-ticket/use-open-ticket.svelte';
  import { useTicketLookupModel } from '$lib/hooks/use-ticket-lookup/use-ticket-lookup.svelte';

  /**
   * Central de chamados: abrir e acompanhar chamado por qualquer usuário autenticado
   * (usuário, gestor ou administrador), mesmo sem módulo atribuído.
   *
   * Fica fora do grupo `(app)` de propósito porque não usa o menu lateral dos módulos
   * internos (Infra/Sistema/Manutenção), sendo a tela de entrada para usuários
   * sem módulo atribuído e ponto central de suporte.
   *
   * A rota só compõe: chama os dois models e entrega para as views (CONTRIBUTING §3).
   */
  const open = useOpenTicketModel();
  const lookup = useTicketLookupModel();

  /* Se o drawer de consulta está aberto é qual peça da tela está na frente, não dado do
     chamado — por isso mora aqui, igual ao `answering` da tela interna de Chamados. */
  /* Quem chega pelo link de consulta (`?ticket=…`, o das mensagens de WhatsApp) já cai com o
     chamado aberto na consulta, sem digitar protocolo. Lido uma vez, na chegada. */
  const accessToken = page.url.searchParams.get(TICKET_ACCESS_PARAM);
  let isLookupOpen = $state(accessToken !== null);
  if (accessToken) lookup.actions.onOpenLink(accessToken);
</script>

<svelte:head>
  <title>Central de Chamados TI</title>
</svelte:head>

<div class="bg-background flex min-h-screen flex-col">
  <header class="border-b">
    <div class="mx-auto flex w-full max-w-3xl items-start justify-between gap-4 px-4 py-6 sm:px-6">
      <div>
        <h1 class="text-ink-900 text-2xl font-bold">Central de Chamados TI</h1>
        <p class="text-ink-500 mt-1 text-sm">
          Abra e acompanhe as suas solicitações de suporte técnico.
        </p>
      </div>

      <ActionButton
        data={{ label: 'Meus chamados' }}
        ui={{ variant: 'secondary', className: 'shrink-0' }}
        actions={{ onClick: () => (isLookupOpen = true) }}
      />
    </div>
  </header>

  <!-- `flex-1` + `justify-center`: a etapa do formulário é curta, e sem isso ela nascia
       colada no topo com uma sobra vazia enorme embaixo — o resto da tela sem função
       nenhuma. Centralizado no espaço que sobra do cabeçalho, a tela para de parecer
       cortada pela metade em telas altas. -->
  <main class="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-5 px-4 py-10 sm:px-6">
    <OpenTicketForm data={open.data} state={open.state} actions={open.actions} />

    <!-- Para a raiz: se for do time com módulo, cai nos chamados do módulo.
         data-sveltekit-reload garante navegação completa pelo proxy. -->
    <p class="text-ink-500 text-center text-xs">
      É do time de TI? <a class="text-primary underline" data-sveltekit-reload href="/">Abrir o painel</a>
    </p>
  </main>
</div>

<TicketLookupDrawer
  data={lookup.data}
  state={{ ...lookup.state, isOpen: isLookupOpen }}
  actions={{ ...lookup.actions, onClose: () => (isLookupOpen = false) }}
/>
