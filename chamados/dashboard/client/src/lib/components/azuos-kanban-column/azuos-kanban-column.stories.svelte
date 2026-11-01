<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import KanbanColumn from './azuos-kanban-column.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosKanbanColumn',
    component: KanbanColumn,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default">
  <KanbanColumn data={{ title: 'Em andamento', count: 2 }} ui={{ tone: 'info' }} actions={{ onAdd: () => {}, onDropItem: () => {} }}>
    <div class="bg-card border-border rounded-box border p-3 text-sm">Trocar fonte da impressora</div>
    <div class="bg-card border-border rounded-box border p-3 text-sm">Instalar o leitor de PDF</div>
  </KanbanColumn>
</Story>

<!-- As etapas lado a lado, cada uma na sua cor. -->
<Story name="Board">
  <div class="flex gap-4 overflow-x-auto">
    {#each [['A fazer', 'neutral'], ['Em andamento', 'info'], ['Aguardando', 'warning'], ['Feito', 'success']] as const as [title, tone] (title)}
      <KanbanColumn data={{ title, count: 0 }} ui={{ tone }} actions={{ onAdd: () => {} }} />
    {/each}
  </div>
</Story>

<!-- Caso limite: coluna vazia, sem botão de adicionar. -->
<Story name="EmptyReadOnly">
  <KanbanColumn data={{ title: 'Cancelados', count: 0 }} ui={{ tone: 'danger' }} />
</Story>
