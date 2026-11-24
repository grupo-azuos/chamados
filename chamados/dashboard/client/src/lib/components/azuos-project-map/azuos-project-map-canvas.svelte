<!--
  @component
  A ÁREA DO MAPA DOS PROJETOS (Svelte Flow): as ilhas, as caixas e as linhas. Soltar uma ilha
  avisa a tela (`onIslandMove`), que guarda o lugar. O mapa novo entra sem refazer a vista.
-->
<script lang="ts">
  import '@xyflow/svelte/dist/style.css';

  import { Background, type Edge, type Node, SvelteFlow, SvelteFlowProvider } from '@xyflow/svelte';

  import IslandNode from '$lib/components/azuos-task-map/azuos-task-map-island.svelte';
  import ZoomControls from '$lib/components/azuos-task-map/azuos-task-map-zoom.svelte';
  import { cn } from '$lib/utils/cn';
  import { type ProjectMapGraph, projectIdOfIsland } from '$lib/utils/project-map.util';
  import GitNode from './azuos-project-map-git.svelte';
  import HubNode from './azuos-project-map-hub.svelte';
  import ItemNode from './azuos-project-map-item.svelte';
  import ProjectNode from './azuos-project-map-project.svelte';

  let {
    data,
    ui,
    actions,
  }: {
    data: { map: ProjectMapGraph };
    ui: { isExpanded: boolean };
    actions: { onIslandMove: (projectId: string, position: { x: number; y: number }) => void; onExpand?: () => void };
  } = $props();

  const nodeTypes = { island: IslandNode, project: ProjectNode, hub: HubNode, item: ItemNode, git: GitNode };

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
  aria-label="Mapa dos projetos"
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
      onnodedragstop={({ targetNode }) => {
        const projectId = targetNode ? projectIdOfIsland(targetNode.id) : null;
        if (projectId && targetNode) actions.onIslandMove(projectId, targetNode.position);
      }}
    >
      <Background gap={24} />
      <ZoomControls actions={{ onExpand: actions.onExpand }} />
    </SvelteFlow>
  </SvelteFlowProvider>
</div>
