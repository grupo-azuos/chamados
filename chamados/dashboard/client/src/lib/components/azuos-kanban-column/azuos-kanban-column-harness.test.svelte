<!-- A coluna dentro de um quadro de arrastar, como na tela: o teste passa o gerente do arrasto
     para ver o que a coluna registrou nele. -->
<script lang="ts">
  import type { DragDropManager } from '@dnd-kit/dom';
  import { DragDropProvider } from '@dnd-kit/svelte';

  import KanbanColumn from './azuos-kanban-column.svelte';

  let { manager, dropId }: { manager: DragDropManager; dropId?: string } = $props();
</script>

<DragDropProvider {manager}>
  <KanbanColumn data={{ title: 'Em atendimento', count: 0 }} ui={{ dropId }} />
</DragDropProvider>
