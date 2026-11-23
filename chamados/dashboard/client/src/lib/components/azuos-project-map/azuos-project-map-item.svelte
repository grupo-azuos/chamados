<!--
  @component
  UM ITEM no mapa do projeto: issue, PR, merge, versão, deploy, chamado ou tarefa — o ícone cheio
  na cor do tipo, o título e "número · situação · quem". O que está em aberto leva a bolinha que
  pulsa. O que é do GitHub abre em nova aba; o chamado e a tarefa, a tela deles.
-->
<script lang="ts" module>
  import CircleDot from '@lucide/svelte/icons/circle-dot';
  import GitMerge from '@lucide/svelte/icons/git-merge';
  import GitPullRequest from '@lucide/svelte/icons/git-pull-request';
  import LifeBuoy from '@lucide/svelte/icons/life-buoy';
  import ListChecks from '@lucide/svelte/icons/list-checks';
  import Package from '@lucide/svelte/icons/package';
  import Rocket from '@lucide/svelte/icons/rocket';
  import Wrench from '@lucide/svelte/icons/wrench';
  import type { LucideIcon } from '@lucide/svelte';

  import { type AzuosCardTone } from '$lib/utils/card-tone.util';
  import { type ProjectMapItemKind } from '$lib/utils/project-map.util';

  export const PROJECT_MAP_ITEM_LOOK: Record<ProjectMapItemKind, { icon: LucideIcon; tone: AzuosCardTone }> = {
    issue: { icon: CircleDot, tone: 'green' },
    pr: { icon: GitPullRequest, tone: 'plum' },
    merge: { icon: GitMerge, tone: 'blue' },
    release: { icon: Package, tone: 'copper' },
    deploy: { icon: Rocket, tone: 'steel' },
    maintenance: { icon: Wrench, tone: 'slate' },
    ticket: { icon: LifeBuoy, tone: 'red' },
    task: { icon: ListChecks, tone: 'yellow' },
  };
</script>

<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';

  import { cardToneClasses } from '$lib/utils/card-tone.util';
  import { cn } from '$lib/utils/cn';
  import { PROJECT_MAP_ITEM_LABELS, type ProjectMapItemData } from '$lib/utils/project-map.util';

  let { data }: { data: ProjectMapItemData } = $props();

  const look = $derived(PROJECT_MAP_ITEM_LOOK[data.kind]);
  const Icon = $derived(look.icon);
  const BOX =
    'rounded-box bg-card shadow-card relative flex h-full w-full items-center gap-2.5 px-3 text-left';
</script>

{#snippet body()}
  <Handle type="target" position={Position.Left} class="opacity-0" isConnectable={false} />
  <span aria-hidden="true" class={cn('rounded-icon inline-flex size-8 shrink-0 items-center justify-center', cardToneClasses(look.tone).dot)}>
    <Icon class="size-4" />
  </span>
  <span class="flex min-w-0 flex-col">
    <span class="text-foreground truncate text-sm font-semibold">{data.title}</span>
    <span class="text-muted-foreground truncate text-xs">{data.sublabel}</span>
  </span>
  {#if data.isPending}
    <span aria-hidden="true" class="absolute -top-1 -right-1 flex size-2.5">
      <span class="bg-primary absolute inline-flex size-full rounded-full motion-safe:animate-ping"></span>
      <span class="bg-primary relative inline-flex size-2.5 rounded-full"></span>
    </span>
  {/if}
  <Handle type="source" position={Position.Right} class="opacity-0" isConnectable={false} />
{/snippet}

{#if data.href}
  <a
    href={data.href}
    target={data.isExternal ? '_blank' : undefined}
    rel={data.isExternal ? 'noopener noreferrer' : undefined}
    aria-label={`${PROJECT_MAP_ITEM_LABELS[data.kind]}: ${data.title}`}
    title={data.title}
    class={cn(BOX, 'hover:bg-hover-veil focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none')}
  >
    {@render body()}
  </a>
{:else}
  <div class={BOX} title={data.title}>{@render body()}</div>
{/if}
