<!--
  @component
  A ILHA DA TAREFA no mapa: o fundo que junta as caixas dela — e por onde ela se arrasta.
-->
<script lang="ts">
  import { type TaskMapIslandData } from '$lib/utils/task-map.util';

  let { data }: { data: TaskMapIslandData } = $props();
</script>

<div
  role="group"
  aria-label={`Vínculos da tarefa ${data.title}`}
  class="rounded-surface bg-muted h-full w-full cursor-grab active:cursor-grabbing"
></div>
