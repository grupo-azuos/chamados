<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';

  import {
    useSoftwareProjectDetailModel,
    type SoftwareProjectDetailModel,
  } from './use-software-project-detail.svelte';

  /** O model só existe dentro de um componente: é dali que vêm o QueryClient e o ciclo de vida. */
  let { id, onReady }: { id: number; onReady: (model: SoftwareProjectDetailModel) => void } =
    $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  // svelte-ignore state_referenced_locally
  onReady(useSoftwareProjectDetailModel(id));
</script>
