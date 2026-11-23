<!--
  @component
  A ÁREA DO MAPA (Svelte Flow): as ilhas, as caixas e as linhas. Soltar uma ilha avisa a tela
  (`onIslandMove`), que guarda o lugar. O mapa novo (outras pessoas, "Arrumar de novo") entra sem
  refazer a vista: o zoom e o enquadramento de quem está olhando ficam.
-->
<script lang="ts">
  import '@xyflow/svelte/dist/style.css';

  import { Background, type Edge, type Node, SvelteFlow, SvelteFlowProvider } from '@xyflow/svelte';

  import { cn } from '$lib/utils/cn';
  import { type TaskMap, taskIdOfIsland } from '$lib/utils/task-map.util';
  import IslandNode from './azuos-task-map-island.svelte';
  import PersonNode from './azuos-task-map-person.svelte';
  import TargetNode from './azuos-task-map-target.svelte';
  import TaskNode from './azuos-task-map-task.svelte';
  import ZoomControls from './azuos-task-map-zoom.svelte';

  let {
    data,
    ui,
    actions,
  }: {
    data: { map: TaskMap };
    ui: { isExpanded: boolean };
    actions: { onIslandMove: (taskId: string, position: { x: number; y: number }) => void; onExpand?: () => void };
  } = $props();

  const nodeTypes = { island: IslandNode, person: PersonNode, task: TaskNode, target: TargetNode };

  let nodes = $state.raw<Node[]>([]);
  let edges = $state.raw<Edge[]>([]);

  $effect(() => {
    nodes = data.map.nodes;
    edges = data.map.edges;
  });
</script>

<!-- A área tem altura FIXA: o Svelte Flow ocupa 100% dela, e com só uma altura mínima o mapa
     nasce com zero e não desenha nada. -->
<div
  role="region"
  aria-label="Mapa dos vínculos das tarefas"
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
      minZoom={0.2}
      proOptions={{ hideAttribution: true }}
      onnodedragstop={({ targetNode }) => {
        const taskId = targetNode ? taskIdOfIsland(targetNode.id) : null;
        if (taskId && targetNode) actions.onIslandMove(taskId, targetNode.position);
      }}
    >
      <Background gap={24} />
      <ZoomControls actions={{ onExpand: actions.onExpand }} />
    </SvelteFlow>
  </SvelteFlowProvider>
</div>
