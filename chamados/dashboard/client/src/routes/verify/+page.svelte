<script lang="ts">
  import { useServiceOrderLookupModel } from '$lib/hooks/use-service-order-lookup/use-service-order-lookup.svelte';
  import ServiceOrderLookupForm from './components/azuos-service-order-lookup-form/azuos-service-order-lookup-form.svelte';

  /**
   * A ENTRADA da conferência de documentos — PÚBLICA, sem login.
   *
   * O QR code e o link do PDF já levam direto a `/verify/<código>`. Esta tela é para quem tem
   * só o papel: digita o código do rodapé e cai na mesma conferência. É também para onde
   * aponta o "Validar documento" da barra lateral do painel.
   *
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   */
  const lookup = useServiceOrderLookupModel();
</script>

<svelte:head>
  <title>Conferir ordem de serviço</title>
</svelte:head>

<div class="bg-background flex min-h-screen flex-col">
  <header class="border-b">
    <div class="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <h1 class="text-ink-900 text-2xl font-bold">Conferir ordem de serviço</h1>
      <p class="text-ink-500 mt-1 text-sm">
        Digite o código do documento para ver se ele é o que o sistema emitiu. Não precisa de
        senha.
      </p>
    </div>
  </header>

  <main class="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-8 sm:px-6">
    <ServiceOrderLookupForm data={lookup.data} state={lookup.state} actions={lookup.actions} />
  </main>
</div>
