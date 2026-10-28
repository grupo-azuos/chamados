<script lang="ts">
  import OpenTicketForm from './components/azuos-open-ticket-form/azuos-open-ticket-form.svelte';
  import { useOpenTicketModel } from '$lib/hooks/use-open-ticket/use-open-ticket.svelte';

  /**
   * ABRIR CHAMADO — a tela de entrada da Central, para qualquer pessoa autenticada (usuário,
   * gestor ou administrador), mesmo sem módulo atribuído.
   *
   * Fica fora do grupo `(app)` de propósito: não usa o menu lateral dos módulos, e sim a barra
   * da Central (no layout). A consulta tem tela própria (`/support/tickets`), e o link antigo
   * de consulta (`?ticket=…`) é desviado para lá no `+page.ts`.
   *
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   */
  const open = useOpenTicketModel();
</script>

<svelte:head>
  <title>Abrir chamado — Central de Chamados TI</title>
</svelte:head>

<!-- `flex-1` + `justify-center`: a etapa do formulário é curta, e sem isso ela nascia colada
     no topo com uma sobra vazia enorme embaixo. -->
<main class="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-5 px-4 py-10 sm:px-6">
  <OpenTicketForm data={open.data} state={open.state} actions={open.actions} />

  <!-- Para a raiz: se for do time com módulo, cai nos chamados do módulo.
       data-sveltekit-reload garante navegação completa pelo proxy. -->
  <p class="text-ink-500 text-center text-xs">
    É do time de TI? <a class="text-primary underline" data-sveltekit-reload href="/">Abrir o painel</a>
  </p>
</main>
