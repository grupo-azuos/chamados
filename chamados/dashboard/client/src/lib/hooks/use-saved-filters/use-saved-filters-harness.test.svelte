<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';

  import { type SavedFiltersModel, useSavedFiltersModel } from './use-saved-filters.svelte';

  /** O model precisa de um componente para existir (o svelte-query vive no contexto). */
  let { onReady }: { onReady: (model: SavedFiltersModel) => void } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  onReady(useSavedFiltersModel('infra'));
</script>
