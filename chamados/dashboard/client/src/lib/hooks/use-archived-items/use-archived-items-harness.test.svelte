<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';

  import {
    type ArchivedItemsModel,
    type ArchivedItemsOptions,
    useArchivedItemsModel,
  } from './use-archived-items.svelte';

  /** O model precisa de um componente para existir (o svelte-query vive no contexto). */
  let {
    options,
    onReady,
  }: {
    options: ArchivedItemsOptions<{ id: number; name: string }>;
    onReady: (model: ArchivedItemsModel) => void;
  } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  // svelte-ignore state_referenced_locally
  onReady(useArchivedItemsModel(options));
</script>
