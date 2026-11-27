<script lang="ts">
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import { useServiceOrderLookupModel } from '$lib/hooks/use-service-order-lookup/use-service-order-lookup.svelte';
  import ServiceOrderLookupForm from './components/azuos-service-order-lookup-form/azuos-service-order-lookup-form.svelte';

  /**
   * A ENTRADA da conferência de documentos por qualquer usuário autenticado.
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
  <main class="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-8 sm:px-6">
    <PageHeader
      data={{
        title: 'Conferir ordem de serviço',
        description: 'Digite o código do documento para ver se ele é o que o sistema emitiu.',
      }}
    />
    <ServiceOrderLookupForm data={lookup.data} state={lookup.state} actions={lookup.actions} />
  </main>
</div>
