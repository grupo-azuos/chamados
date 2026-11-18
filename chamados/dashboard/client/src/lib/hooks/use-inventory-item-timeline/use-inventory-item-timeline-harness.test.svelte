<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';

  import {
    useInventoryItemTimelineModel,
    type InventoryItemTimelineModel,
  } from './use-inventory-item-timeline.svelte';

  let {
    itemId,
    onReady,
  }: { itemId: number | null; onReady: (model: InventoryItemTimelineModel) => void } = $props();

  setQueryClientContext(
    new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    }),
  );

  // svelte-ignore state_referenced_locally
  onReady(useInventoryItemTimelineModel(itemId));
</script>
