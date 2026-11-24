<script lang="ts">
  import Network from '@lucide/svelte/icons/network';

  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import TraceabilityMap from '$lib/components/azuos-traceability-map/azuos-traceability-map.svelte';
  import { useTraceabilityModel } from '$lib/hooks/use-traceability/use-traceability.svelte';

  /** A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3). */
  const traceability = useTraceabilityModel();
</script>

<svelte:head>
  <title>Rastreabilidade</title>
</svelte:head>

<div class="flex flex-col gap-6">
  <PageHeader
    data={{
      title: 'Rastreabilidade',
      description: 'Quem usa cada computador, de que departamento, e o que passou por ele.',
    }}
    ui={{ icon: Network }}
  />
  <TraceabilityMap data={traceability.data} state={traceability.state} actions={traceability.actions} />
</div>
