<!--
  @component
  A TAREFA no mapa: a bolinha na cor dela (vermelha quando atrasada), o título e "situação ·
  responsável". O que está em aberto leva a bolinha que pulsa. Leva à página da tarefa.
-->
<script lang="ts">
  import Hint from '$lib/components/azuos-hint/azuos-hint.svelte';
  import { Handle, Position } from '@xyflow/svelte';

  import { cardToneClasses } from '$lib/utils/card-tone.util';
  import { cn } from '$lib/utils/cn';
  import { type TaskMapTaskData } from '$lib/utils/task-map.util';

  let { data }: { data: TaskMapTaskData } = $props();
</script>

<Hint data={{ text: data.title }}>
  {#snippet child(props)}
    <a
        {...props}
      href={data.href}
      aria-label={`Tarefa ${data.title}, ${data.status}, de ${data.ownerName}`}
      class="rounded-box bg-card shadow-card hover:bg-hover-veil focus-visible:ring-ring/50 relative flex h-full w-full flex-col justify-center gap-1 px-3 py-2 text-left focus-visible:ring-3 focus-visible:outline-none"
    >
      <Handle type="target" position={Position.Left} class="opacity-0" isConnectable={false} />
      <span class="flex items-center gap-2">
        <span aria-hidden="true" class={cn('size-2.5 shrink-0 rounded-full', cardToneClasses(data.hue).swatch)}></span>
        <span class="text-foreground truncate text-sm font-semibold">{data.title}</span>
      </span>
      <span class="text-muted-foreground truncate text-xs">{data.status} · {data.ownerName}</span>
      {#if data.isPending}
        <span aria-hidden="true" class="absolute -top-1 -right-1 flex size-2.5">
          <span class="bg-primary absolute inline-flex size-full rounded-full motion-safe:animate-ping"></span>
          <span class="bg-primary relative inline-flex size-2.5 rounded-full"></span>
        </span>
      {/if}
      <Handle type="source" position={Position.Right} class="opacity-0" isConnectable={false} />
    </a>
  {/snippet}
</Hint>
