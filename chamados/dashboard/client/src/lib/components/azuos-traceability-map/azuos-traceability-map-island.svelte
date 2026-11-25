<!--
  @component
  A ILHA DO COMPUTADOR no mapa de rastreabilidade: o fundo que junta a máquina e o que passou por
  ela — e por onde ela se arrasta.
-->
<script lang="ts">
  import { type TraceabilityIslandData } from '$lib/utils/traceability-map.util';

  let { data }: { data: TraceabilityIslandData } = $props();
</script>

<div
  role="group"
  aria-label={`O que passou pelo computador ${data.title}`}
  class="rounded-surface bg-muted h-full w-full cursor-grab active:cursor-grabbing"
></div>
