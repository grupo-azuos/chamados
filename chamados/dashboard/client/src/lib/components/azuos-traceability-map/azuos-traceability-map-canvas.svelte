<!--
  @component
  A ÁREA DO MAPA DE RASTREABILIDADE (Svelte Flow): as ilhas dos computadores, as pessoas e os
  departamentos ao lado, e as linhas. O mapa novo entra sem refazer a vista.
-->
<script lang="ts">
  import '@xyflow/svelte/dist/style.css';

  import { Background, type Edge, type Node, SvelteFlow, SvelteFlowProvider } from '@xyflow/svelte';

  import ZoomControls from '$lib/components/azuos-task-map/azuos-task-map-zoom.svelte';
  import { cn } from '$lib/utils/cn';
  import { type TraceabilityMap } from '$lib/utils/traceability-map.util';
  import IslandNode from './azuos-traceability-map-island.svelte';
  import ItemNode from './azuos-traceability-map-item.svelte';

  let {
    data,
    ui,
    actions,
  }: {
    data: { map: TraceabilityMap };
    ui: { isExpanded: boolean };
    actions: { onExpand?: () => void };
  } = $props();

  const nodeTypes = { island: IslandNode, item: ItemNode };

  let nodes = $state.raw<Node[]>([]);
  let edges = $state.raw<Edge[]>([]);

  $effect(() => {
    nodes = data.map.nodes;
    edges = data.map.edges;
  });
</script>

<!-- Altura FIXA: o Svelte Flow ocupa 100% dela; com só uma altura mínima, nasce com zero. -->
<div
  role="region"
  aria-label="Mapa de rastreabilidade"
  class={cn('rounded-surface bg-card shadow-card overflow-hidden', ui.isExpanded ? 'h-full' : 'h-160')}
  style="--xy-background-color: transparent; --xy-edge-stroke: var(--muted-foreground);"
>
  <SvelteFlowProvider>
    <SvelteFlow
      bind:nodes
      bind:edges
      {nodeTypes}
      nodesConnectable={false}
      elementsSelectable={false}
      fitView
      minZoom={0.1}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={24} />
      <ZoomControls actions={{ onExpand: actions.onExpand }} />
    </SvelteFlow>
  </SvelteFlowProvider>
</div>
