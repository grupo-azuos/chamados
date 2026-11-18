<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';

  import {
    useSoftwareProjectListModel,
    type SoftwareProjectListModel,
  } from './use-software-project-list.svelte';

  /** O model só existe dentro de um componente: é dali que vêm o QueryClient e o ciclo de vida. */
  let { onReady }: { onReady: (model: SoftwareProjectListModel) => void } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  // svelte-ignore state_referenced_locally
  onReady(useSoftwareProjectListModel());
</script>
