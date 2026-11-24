<!--
  @component
  O PROJETO no mapa: o nome, o repositório e, quando sobrou história de fora, quantos eventos
  antigos não aparecem.
-->
<script lang="ts">
  import CodeXml from '@lucide/svelte/icons/code-xml';
  import { Handle, Position } from '@xyflow/svelte';

  import { cardToneClasses } from '$lib/utils/card-tone.util';
  import { cn } from '$lib/utils/cn';
  import { type ProjectMapProjectData } from '$lib/utils/project-map.util';

  let { data }: { data: ProjectMapProjectData } = $props();
</script>

<div class="rounded-box bg-card shadow-card flex h-full w-full items-center gap-3 px-3" title={data.name}>
  <span aria-hidden="true" class={cn('rounded-icon inline-flex size-9 shrink-0 items-center justify-center', cardToneClasses('blue').dot)}>
    <CodeXml class="size-4.5" />
  </span>
  <span class="flex min-w-0 flex-col">
    <span class="text-foreground truncate text-sm font-semibold">{data.name}</span>
    <span class="text-muted-foreground truncate font-mono text-xs">{data.repository}</span>
    {#if data.hidden > 0}
      <span class="text-muted-foreground text-xs">+{data.hidden} antigos fora do mapa</span>
    {/if}
  </span>
  <Handle type="target" position={Position.Left} class="opacity-0" isConnectable={false} />
  <Handle type="source" position={Position.Right} class="opacity-0" isConnectable={false} />
</div>
