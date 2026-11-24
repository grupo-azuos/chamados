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

  import { type AzuosCardHue, cardToneClasses } from '$lib/utils/card-tone.util';
  import { cn } from '$lib/utils/cn';
  import { GIT_CATEGORY_HUES, initialsOf } from '$lib/utils/git-graph.util';
  import { GIT_ROW_HEIGHT, type ProjectMapGitData } from '$lib/utils/project-map.util';

  let { data }: { data: ProjectMapGitData } = $props();

  /* A largura de cada lane e o meio da linha: o desenho é feito nessa grade. */
  const LANE = 14;
  const MID = GIT_ROW_HEIGHT / 2;
  const x = (lane: number) => lane * LANE + LANE / 2;
  const stroke = (hue: AzuosCardHue) => cardToneClasses(hue).color;
  const lanes = $derived(Math.min(Math.max(1, ...data.rows.map((row) => row.width)), 10));
</script>

<div class="rounded-box bg-card shadow-card flex h-full w-full flex-col overflow-hidden">
  <div class="flex items-center gap-2 border-b px-4 py-2.5">
    <span aria-hidden="true" class={cn('rounded-icon inline-flex size-6 items-center justify-center', cardToneClasses('plum').dot)}>
      <GitBranch class="size-3.5" />
    </span>
    <span class="text-foreground text-sm font-semibold">Commits</span>
  </div>
  {#if data.rows.length === 0}
    <p class="text-muted-foreground px-4 py-1 text-sm" style:height="{GIT_ROW_HEIGHT}px">Nenhum commit no recorte.</p>
  {:else}
    <ol class="px-2">
      {#each data.rows as row (row.commit.sha)}
        <li class="flex items-center gap-2 font-mono text-xs" style:height="{GIT_ROW_HEIGHT}px" title={row.commit.message}>
          <span class="text-hue-steel w-14 shrink-0">{row.commit.sha.slice(0, 8)}</span>
          <span class="text-hue-blue w-5 shrink-0 font-semibold">{initialsOf(row.commit.authorName)}</span>
          <svg aria-hidden="true" class="shrink-0 overflow-visible" width={lanes * LANE} height={GIT_ROW_HEIGHT}>
            {#each row.above as link, index (index)}
              {#if link.from < lanes && link.to < lanes}
                <line x1={x(link.from)} y1="0" x2={x(link.to)} y2={MID} stroke={stroke(link.hue)} stroke-width="2" />
              {/if}
            {/each}
            {#each row.below as link, index (index)}
              {#if link.from < lanes && link.to < lanes}
                <line x1={x(link.from)} y1={MID} x2={x(link.to)} y2={GIT_ROW_HEIGHT} stroke={stroke(link.hue)} stroke-width="2" />
              {/if}
            {/each}
            {#if row.lane < lanes}
              <circle
                cx={x(row.lane)}
                cy={MID}
                r={row.isMerge ? 4.5 : 3.5}
                stroke={stroke(row.hue)}
                stroke-width="2"
                fill={row.isMerge ? 'var(--card)' : stroke(row.hue)}
              />
            {/if}
          </svg>
          {#each row.heads as head (head.name)}
            <span
              class={cn(
                'rounded-chip shrink-0 px-1.5 py-px font-sans text-xs font-medium',
                cardToneClasses(GIT_CATEGORY_HUES[head.category]).dot,
                head.isNew && 'outline-foreground outline-2 outline-offset-1 outline-dashed motion-safe:animate-pulse',
              )}
              title={head.isNew ? `Branch nova: ${head.name}` : head.name}
            >
              {head.name}
            </span>
          {/each}
          <span class="text-foreground min-w-0 truncate font-sans">{row.commit.message}</span>
        </li>
      {/each}
    </ol>
  {/if}
  <p class="text-muted-foreground mt-auto border-t px-4 py-1.5 text-right text-xs tabular-nums">
    {data.rows.length} de {data.total}
  </p>
  <Handle type="source" position={Position.Right} class="opacity-0" isConnectable={false} />
</div>
