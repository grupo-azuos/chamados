<!--
  @component
  O QUE A TAREFA TOCA no mapa: chamado, computador, peça ou item do inventário. Leva à tela dele;
  o que saiu do cadastro fica, apagado, sem levar a lugar nenhum.
-->
<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';

  import { cn } from '$lib/utils/cn';
  import { type TaskMapTargetData } from '$lib/utils/task-map.util';

  let { data }: { data: TaskMapTargetData } = $props();

  const BOX = 'rounded-box bg-card shadow-card flex h-full w-full flex-col justify-center px-3 py-1.5 text-left';
</script>

{#snippet body()}
  <Handle type="target" position={Position.Left} class="opacity-0" isConnectable={false} />
  <span class="text-muted-foreground text-xs">{data.kindLabel}</span>
  <span class="text-foreground truncate text-sm font-medium">{data.label}</span>
  <Handle type="source" position={Position.Right} class="opacity-0" isConnectable={false} />
{/snippet}

{#if data.href}
  <a
    href={data.href}
    aria-label={`${data.kindLabel}: ${data.label}`}
    title={data.label}
    class={cn(BOX, 'hover:bg-hover-veil focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none')}
  >
    {@render body()}
  </a>
{:else}
  <span class={cn(BOX, 'text-muted-foreground')} title={data.label}>{@render body()}</span>
{/if}
