<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import { fn } from 'storybook/test';

  import TableViewToggle from './azuos-table-view-toggle.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosTableViewToggle',
    component: TableViewToggle,
  });
</script>

<Story name="Default" />

<!-- Onde ele mora de verdade: ao lado do título de uma lista com modo cards. -->
<Story name="BesidePageHeader" asChild>
  <div class="flex w-80 items-center justify-between">
    <span class="text-sm font-semibold">Chamados</span>
    <TableViewToggle />
  </div>
</Story>

<!-- As filas de chamados: a terceira opção é o quadro, que a tela guarda (aparece em qualquer
     largura; abaixo de `xl`, sem o "Tabela"). -->
<Story
  name="WithKanban"
  args={{ ui: { hasKanban: true }, state: { isKanban: false }, actions: { onKanbanChange: fn() } }}
/>

<Story
  name="OnKanban"
  args={{ ui: { hasKanban: true }, state: { isKanban: true }, actions: { onKanbanChange: fn() } }}
/>
