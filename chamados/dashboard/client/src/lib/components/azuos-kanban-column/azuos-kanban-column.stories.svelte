<script module lang="ts">
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import CircleDot from '@lucide/svelte/icons/circle-dot';
  import Hourglass from '@lucide/svelte/icons/hourglass';
  import Wrench from '@lucide/svelte/icons/wrench';
  import { DragDropProvider } from '@dnd-kit/svelte';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import KanbanColumn from './azuos-kanban-column.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosKanbanColumn',
    component: KanbanColumn,
    parameters: { layout: 'padded' },
  });

  const STAGES = [
    { title: 'A fazer', tone: 'neutral', icon: CircleDot },
    { title: 'Em andamento', tone: 'info', icon: Wrench },
    { title: 'Aguardando', tone: 'warning', icon: Hourglass },
    { title: 'Feito', tone: 'success', icon: CircleCheck },
  ] as const;
</script>

<Story name="Default" asChild>
  <KanbanColumn
    data={{ title: 'Em andamento', count: 2 }}
    ui={{ tone: 'info', icon: Wrench }}
    actions={{ onAdd: () => {} }}
  >
    <div class="bg-card rounded-surface shadow-card p-4 text-sm">Trocar fonte da impressora</div>
    <div class="bg-card rounded-surface shadow-card p-4 text-sm">Instalar o leitor de PDF</div>
  </KanbanColumn>
</Story>

<!-- As etapas lado a lado, cada uma na sua cor e no seu ícone, como áreas de soltar de um quadro
     (o `DragDropProvider` em volta, como na tela). -->
<Story name="Board" asChild>
  <DragDropProvider>
    <div class="flex gap-4 overflow-x-auto">
      {#each STAGES as stage (stage.title)}
        <KanbanColumn data={{ title: stage.title, count: 0 }} ui={{ tone: stage.tone, icon: stage.icon, dropId: stage.title }}>
          <p class="text-muted-foreground py-6 text-center text-xs">Arraste para cá.</p>
        </KanbanColumn>
      {/each}
    </div>
  </DragDropProvider>
</Story>

<!-- A etapa cadastrável: o lápis no cabeçalho abre a edição dela. -->
<Story name="Editable" asChild>
  <KanbanColumn
    data={{ title: 'Aguardando cliente', count: 0 }}
    ui={{ tone: 'plum', icon: Hourglass }}
    actions={{ onEdit: () => {} }}
  />
</Story>

<!-- Caso limite: coluna vazia, sem ícone, sem botão de adicionar e fora de um quadro. -->
<Story name="EmptyReadOnly" asChild>
  <KanbanColumn data={{ title: 'Cancelados', count: 0 }} ui={{ tone: 'danger' }} />
</Story>
