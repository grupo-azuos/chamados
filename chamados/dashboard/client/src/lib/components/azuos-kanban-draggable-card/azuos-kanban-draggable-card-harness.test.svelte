<!-- O cartão dentro de um quadro de arrastar, como na tela: o teste passa o gerente do arrasto
     para ver o que o cartão registrou nele e o que o teclado fez. -->
<script lang="ts">
  import type { DragDropManager } from '@dnd-kit/dom';
  import { DragDropProvider } from '@dnd-kit/svelte';

  import DraggableCard from './azuos-kanban-draggable-card.svelte';

  let { manager, isDisabled = false }: { manager: DragDropManager; isDisabled?: boolean } = $props();
</script>

<DragDropProvider {manager}>
  <DraggableCard data={{ id: 10, label: 'Mover o chamado CH-0010' }} state={{ isDisabled }}>
    <span>Bug no login</span>
  </DraggableCard>
</DragDropProvider>
