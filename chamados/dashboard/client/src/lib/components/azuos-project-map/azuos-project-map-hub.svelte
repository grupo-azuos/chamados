<!--
  @component
  O GRUPO no mapa do projeto: "Issues", "Pull requests", "Merges e versões", "Chamados sem issue",
  com quantos tem.
-->
<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';

  import { type ProjectMapHubData } from '$lib/utils/project-map.util';

  let { data }: { data: ProjectMapHubData } = $props();
</script>

<div class="rounded-box bg-card shadow-card flex h-full w-full items-center justify-between gap-2 px-3">
  <Handle type="target" position={Position.Left} class="opacity-0" isConnectable={false} />
  <span class="text-foreground truncate text-sm font-semibold">{data.label}</span>
  <span class="text-muted-foreground text-xs tabular-nums">{data.count}</span>
  <Handle type="source" position={Position.Right} class="opacity-0" isConnectable={false} />
</div>
