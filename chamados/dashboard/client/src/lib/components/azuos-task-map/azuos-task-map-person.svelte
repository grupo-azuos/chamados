<!--
  @component
  QUEM CUIDA DA TAREFA no mapa: o responsável ou um participante, com a FOTO.
-->
<script lang="ts">
  import Hint from '$lib/components/azuos-hint/azuos-hint.svelte';
  import { Handle, Position } from '@xyflow/svelte';

  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
  import { type TaskMapPersonData } from '$lib/utils/task-map.util';

  let { data }: { data: TaskMapPersonData } = $props();
</script>

<Hint data={{ text: data.name }}>
  {#snippet child(props)}
    <div
        {...props}
      aria-label={`${data.role}: ${data.name}`}
      class="rounded-box bg-card shadow-card flex h-full w-full items-center gap-2 px-3"
    >
      <PersonAvatar name={data.name} avatarUrl={data.photo} personId={data.id} ui={{ size: 'sm' }} />
      <span class="flex min-w-0 flex-col">
        <span class="text-muted-foreground text-xs">{data.role}</span>
        <span class="text-foreground truncate text-sm font-medium">{data.name}</span>
      </span>
      <!-- As pontas das linhas existem para o Svelte Flow saber de onde a linha sai; ninguém as usa. -->
      <Handle type="source" position={Position.Right} class="opacity-0" isConnectable={false} />
    </div>
  {/snippet}
</Hint>
