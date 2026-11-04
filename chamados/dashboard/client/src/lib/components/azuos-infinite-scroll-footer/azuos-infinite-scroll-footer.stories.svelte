<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import Footer from './azuos-infinite-scroll-footer.svelte';

  const noun = { singular: 'chamado', plural: 'chamados' };

  const { Story } = defineMeta({
    title: 'Components/AzuosInfiniteScrollFooter',
    component: Footer,
    parameters: { layout: 'padded' },
  });
</script>

<Story
  name="Default"
  args={{ data: { loaded: 50, totalItems: 566 }, ui: { itemNoun: noun }, state: { isLoading: false, hasMore: true }, actions: { onLoadMore: () => {} } }}
/>

<Story
  name="Loading"
  args={{ data: { loaded: 100, totalItems: 566 }, ui: { itemNoun: noun }, state: { isLoading: true, hasMore: true }, actions: { onLoadMore: () => {} } }}
/>

<!-- Caso limite: a última página — sem botão, "fim da lista". -->
<Story
  name="End"
  args={{ data: { loaded: 566, totalItems: 566 }, ui: { itemNoun: noun }, state: { isLoading: false, hasMore: false }, actions: { onLoadMore: () => {} } }}
/>
