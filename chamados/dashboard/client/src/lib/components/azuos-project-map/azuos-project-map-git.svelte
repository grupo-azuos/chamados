<!--
  @component
  O GIT GRAPH de um sistema, o EIXO da ilha dele no mapa — o desenho do lazygit (ver
  `AzuosGitGraph`). De cada commit onde algo fechou sai uma linha para a issue, o PR ou o chamado:
  a ponta dela fica na altura da linha do commit (`data.anchors`).
-->
<script lang="ts">
  import GitBranch from '@lucide/svelte/icons/git-branch';
  import { Handle, Position } from '@xyflow/svelte';

  import GitGraph from '$lib/components/azuos-git-graph/azuos-git-graph.svelte';
  import { cardToneClasses } from '$lib/utils/card-tone.util';
  import { cn } from '$lib/utils/cn';
  import { GIT_ROW_HEIGHT } from '$lib/utils/git-graph.util';
  import { GIT_BOX, type ProjectMapGitData } from '$lib/utils/project-map.util';

  let { data }: { data: ProjectMapGitData } = $props();

  /* A altura da ponta: o meio da linha do commit (o "topo" é o commit mais novo). */
  const handles = $derived(
    data.anchors.map((sha) => {
      const index = Math.max(
        data.rows.findIndex((row) => row.commit.sha === sha),
        0,
      );

      return { id: `row:${sha}`, top: GIT_BOX.header + index * GIT_ROW_HEIGHT + GIT_ROW_HEIGHT / 2 };
    }),
  );
</script>

<div class="rounded-box bg-card shadow-card relative flex h-full w-full flex-col overflow-hidden">
  <div class="flex shrink-0 items-center gap-2 border-b px-4" style:height="{GIT_BOX.header}px">
    <span aria-hidden="true" class={cn('rounded-icon inline-flex size-6 items-center justify-center', cardToneClasses('plum').dot)}>
      <GitBranch class="size-3.5" />
    </span>
    <span class="text-foreground text-sm font-semibold">Commits</span>
  </div>
  {#if data.rows.length === 0}
    <p class="text-muted-foreground px-4 text-sm" style:line-height="{GIT_ROW_HEIGHT}px">
      Sem commits ainda: sincronize o sistema para o grafo aparecer.
    </p>
  {:else}
    <GitGraph data={{ rows: data.rows }} />
  {/if}
  <p
    class="text-muted-foreground mt-auto flex shrink-0 items-center justify-end border-t px-4 text-xs tabular-nums"
    style:height="{GIT_BOX.footer}px"
  >
    {data.rows.length} de {data.total}
  </p>
  {#each handles as handle (handle.id)}
    <Handle
      type="source"
      id={handle.id}
      position={Position.Right}
      class="opacity-0"
      style="top: {handle.top}px"
      isConnectable={false}
    />
  {/each}
</div>
