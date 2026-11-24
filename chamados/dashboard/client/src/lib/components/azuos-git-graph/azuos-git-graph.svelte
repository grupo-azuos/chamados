<!--
  @component
  O GIT GRAPH — o desenho do lazygit: cada commit uma linha (o hash curto, as iniciais de quem fez,
  o ponto na lane e a mensagem). A develop corre numa lane; cada branch sai dela noutra lane e volta
  no merge (o ponto vazado). A cor da lane é a do git-flow; a ponta de cada branch leva o nome dela,
  e a branch nova pulsa tracejada. As linhas vêm prontas de `buildGitGraph`.

  - `data.rows`: as linhas do grafo.
-->
<script lang="ts">
  import { type AzuosCardHue, cardToneClasses } from '$lib/utils/card-tone.util';
  import { cn } from '$lib/utils/cn';
  import { GIT_CATEGORY_HUES, GIT_ROW_HEIGHT, type GitGraphRow, initialsOf } from '$lib/utils/git-graph.util';

  let { data }: { data: { rows: GitGraphRow[] } } = $props();

  /* A altura de uma linha de texto, a largura de cada lane e o meio da linha: a grade do desenho. */
  const ROW = GIT_ROW_HEIGHT;
  const LANE = 14;
  const MID = ROW / 2;
  const x = (lane: number) => lane * LANE + LANE / 2;
  const stroke = (hue: AzuosCardHue) => cardToneClasses(hue).color;
  const lanes = $derived(Math.min(Math.max(1, ...data.rows.map((row) => row.width)), 10));
</script>

{#if data.rows.length === 0}
  <p class="text-muted-foreground px-4 py-1 text-sm" style:height="{ROW}px">Nenhum commit no recorte.</p>
{:else}
  <ol class="px-2">
    {#each data.rows as row (row.commit.sha)}
      <li class="flex items-center gap-2 font-mono text-xs" style:height="{ROW}px" title={row.commit.message}>
        <span class="text-hue-steel w-14 shrink-0">{row.commit.sha.slice(0, 8)}</span>
        <span class="text-hue-blue w-5 shrink-0 font-semibold">{initialsOf(row.commit.authorName)}</span>
        <svg aria-hidden="true" class="shrink-0 overflow-visible" width={lanes * LANE} height={ROW}>
          {#each row.above as link, index (index)}
            {#if link.from < lanes && link.to < lanes}
              <line x1={x(link.from)} y1="0" x2={x(link.to)} y2={MID} stroke={stroke(link.hue)} stroke-width="2" />
            {/if}
          {/each}
          {#each row.below as link, index (index)}
            {#if link.from < lanes && link.to < lanes}
              <line x1={x(link.from)} y1={MID} x2={x(link.to)} y2={ROW} stroke={stroke(link.hue)} stroke-width="2" />
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
