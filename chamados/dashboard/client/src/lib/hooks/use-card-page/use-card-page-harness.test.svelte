<script lang="ts">
  import { useCardPage } from './use-card-page.svelte';

  let {
    onReady,
    getItems,
  }: { onReady: (model: ReturnType<typeof useCardPage<number>>) => void; getItems: () => number[] } =
    $props();

  // svelte-ignore state_referenced_locally
  onReady(useCardPage(getItems));
</script>
