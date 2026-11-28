<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import ListToolbar from './azuos-list-toolbar.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosListToolbar',
    component: ListToolbar,
    parameters: { layout: 'padded' },
  });

  const actions = { onPageChange: () => {} };
  const base = {
    scroll: { loaded: 30, totalItems: 605 },
    pages: { page: 1, pageSize: 12, totalItems: 605 },
    noun: ['peça', 'peças'] as [string, string],
  };
</script>

<!-- Nos cartões: o toggle à esquerda, as páginas à direita. -->
<Story name="Default" args={{ data: { ...base, layout: 'card' }, actions }} />

<!-- Na tabela, que rola: só a contagem à direita. -->
<Story name="Tabela" args={{ data: { ...base, layout: 'table' }, actions }} />

<!-- O pé dos cartões, sem o toggle. -->
<Story name="Pé dos cartões" args={{ data: { ...base, layout: 'card' }, ui: { position: 'bottom' }, actions }} />

<!-- Caso limite: lista vazia. -->
<Story
  name="Vazia"
  args={{
    data: { ...base, layout: 'card', pages: { page: 1, pageSize: 12, totalItems: 0 } },
    actions,
  }}
/>
