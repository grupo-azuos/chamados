<script module lang="ts">
  import { DragDropProvider } from '@dnd-kit/svelte';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import DraggableCard from './azuos-kanban-draggable-card.svelte';

  const { Story } = defineMeta({
    title: 'Features/System/AzuosKanbanDraggableCard',
    component: DraggableCard,
    parameters: { layout: 'padded' },
  });
</script>

<!-- Arraste com o mouse, ou foco + Espaço + setas pelo teclado. Precisa do quadro em volta. -->
<Story name="Default" asChild>
  <DragDropProvider>
    <div class="w-80">
      <DraggableCard data={{ id: 1, label: 'Mover o cartão' }}>
        <div class="bg-card rounded-surface shadow-card p-4 text-sm">Trocar fonte da impressora</div>
      </DraggableCard>
    </div>
  </DragDropProvider>
</Story>

<!-- Enquanto uma mudança vai para o servidor: o cartão fica parado. -->
<Story name="Disabled" asChild>
  <DragDropProvider>
    <div class="w-80">
      <DraggableCard data={{ id: 2, label: 'Mover o cartão' }} state={{ isDisabled: true }}>
        <div class="bg-card rounded-surface shadow-card p-4 text-sm">Instalar o leitor de PDF</div>
      </DraggableCard>
    </div>
  </DragDropProvider>
</Story>
