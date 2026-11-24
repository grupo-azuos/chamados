<!--
  @component
  O GIT GRAPH de um sistema, dentro da ilha dele no mapa — o desenho do lazygit: cada commit uma
  linha (o hash curto, as iniciais de quem fez, o ponto na lane e a mensagem). A develop corre numa
  lane; cada branch sai dela noutra lane e volta no merge (o ponto vazado). A cor da lane é a do
  git-flow; a ponta de cada branch leva o nome dela, e a branch nova pulsa tracejada.
-->
<script lang="ts">
  import GitBranch from '@lucide/svelte/icons/git-branch';
  import { Handle, Position } from '@xyflow/svelte';

  import GitGraph from '$lib/components/azuos-git-graph/azuos-git-graph.svelte';
  import { cardToneClasses } from '$lib/utils/card-tone.util';
  import { cn } from '$lib/utils/cn';
  import { type ProjectMapGitData } from '$lib/utils/project-map.util';

  let { data }: { data: ProjectMapGitData } = $props();
</script>

<div class="rounded-box bg-card shadow-card flex h-full w-full flex-col overflow-hidden">
  <div class="flex items-center gap-2 border-b px-4 py-2.5">
    <span aria-hidden="true" class={cn('rounded-icon inline-flex size-6 items-center justify-center', cardToneClasses('plum').dot)}>
      <GitBranch class="size-3.5" />
    </span>
    <span class="text-foreground text-sm font-semibold">Commits</span>
  </div>
  <GitGraph data={{ rows: data.rows }} />
  <p class="text-muted-foreground mt-auto border-t px-4 py-1.5 text-right text-xs tabular-nums">
    {data.rows.length} de {data.total}
  </p>
  <Handle type="source" position={Position.Right} class="opacity-0" isConnectable={false} />
</div>
