<script lang="ts">
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import { page } from '$app/state';

  import { useServiceOrderVerifyModel } from '$lib/hooks/use-service-order-verify/use-service-order-verify.svelte';
  import ServiceOrderVerifyView from '../components/azuos-service-order-verify-view/azuos-service-order-verify-view.svelte';

  /**
   * A CONFERÊNCIA de uma ordem de serviço por qualquer usuário autenticado.
   *
   * Mora fora do grupo `(app)` porque não utiliza a casca de navegação dos módulos internos.
   * É para cá que o link e o QR code do rodapé do PDF apontam.
   *
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   */
  const verify = useServiceOrderVerifyModel(page.params.code ?? '');
</script>

<svelte:head>
  <title>Conferir ordem de serviço</title>
</svelte:head>

<div class="bg-background flex min-h-screen flex-col">
  <!-- `flex-1` + `justify-center`: o conteúdo é curto, e sem isso ele nascia colado no topo com
       a tela inteira vazia embaixo — o mesmo cuidado da tela de abrir chamado. -->
  <main class="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-8 sm:px-6">
    <PageHeader
      data={{
        title: 'Conferir ordem de serviço',
        description: 'Veja se o documento que você recebeu é o que o sistema emitiu. Não precisa de senha.',
      }}
    />
    <ServiceOrderVerifyView data={verify.data} state={verify.state} actions={verify.actions} />
  </main>
</div>
