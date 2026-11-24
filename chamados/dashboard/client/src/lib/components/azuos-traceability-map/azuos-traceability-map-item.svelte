<!--
  @component
  UMA CAIXA no mapa de rastreabilidade: computador, departamento, pessoa (com a foto), chamado, peça
  ou tarefa — o ícone cheio na cor do tipo, o nome e o detalhe. O que está em aberto leva a bolinha
  que pulsa; o que é de antes (o responsável que já passou a máquina) fica apagado. O computador, o
  chamado e a tarefa levam à tela deles.
-->
<script lang="ts" module>
  import Building2 from '@lucide/svelte/icons/building-2';
  import LifeBuoy from '@lucide/svelte/icons/life-buoy';
  import ListChecks from '@lucide/svelte/icons/list-checks';
  import Monitor from '@lucide/svelte/icons/monitor';
  import Package from '@lucide/svelte/icons/package';
  import User from '@lucide/svelte/icons/user';
  import type { LucideIcon } from '@lucide/svelte';
  import { type TraceabilityNodeKind } from '@template/shared/schemas/traceability.schema';

  import { type AzuosCardTone } from '$lib/utils/card-tone.util';

  export const TRACEABILITY_ITEM_LOOK: Record<TraceabilityNodeKind, { icon: LucideIcon; tone: AzuosCardTone }> = {
    computer: { icon: Monitor, tone: 'blue' },
    department: { icon: Building2, tone: 'steel' },
    person: { icon: User, tone: 'plum' },
    ticket: { icon: LifeBuoy, tone: 'red' },
    part: { icon: Package, tone: 'copper' },
    task: { icon: ListChecks, tone: 'yellow' },
  };
</script>

<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';

  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
  import { cardToneClasses } from '$lib/utils/card-tone.util';
  import { cn } from '$lib/utils/cn';
  import { TRACEABILITY_KIND_LABELS, type TraceabilityItemData } from '$lib/utils/traceability-map.util';

  let { data }: { data: TraceabilityItemData } = $props();

  const look = $derived(TRACEABILITY_ITEM_LOOK[data.kind]);
  const Icon = $derived(look.icon);
  const personId = $derived(data.kind === 'person' ? data.id.slice('person:'.length) : null);
  const BOX = 'rounded-box bg-card shadow-card relative flex h-full w-full items-center gap-2.5 px-3 text-left';
</script>

{#snippet body()}
  <Handle type="target" position={Position.Left} class="opacity-0" isConnectable={false} />
  {#if data.kind === 'person'}
    <PersonAvatar name={data.label} avatarUrl={data.avatarUrl} {personId} ui={{ size: 'md' }} />
  {:else}
    <span aria-hidden="true" class={cn('rounded-icon inline-flex size-8 shrink-0 items-center justify-center', cardToneClasses(look.tone).dot)}>
      <Icon class="size-4" />
    </span>
  {/if}
  <span class="flex min-w-0 flex-col">
    <span class="text-foreground truncate text-sm font-semibold">{data.label}</span>
    <span class="text-muted-foreground truncate text-xs">
      {data.isPast ? 'Antes' : (data.sublabel ?? TRACEABILITY_KIND_LABELS[data.kind])}
    </span>
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
    aria-label={`${TRACEABILITY_KIND_LABELS[data.kind]}: ${data.label}`}
    title={data.label}
    class={cn(BOX, data.isPast && 'opacity-60', 'hover:bg-hover-veil focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none')}
  >
    {@render body()}
  </a>
{:else}
  <div class={cn(BOX, data.isPast && 'opacity-60')} title={data.label}>{@render body()}</div>
{/if}
