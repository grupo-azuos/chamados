<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { untrack } from 'svelte';
  import {
    useSoftwareDashboardModel,
    type SoftwareDashboardModel,
  } from './use-software-dashboard.svelte';
  let { onReady }: { onReady: (model: SoftwareDashboardModel) => void } = $props();
  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  const model = useSoftwareDashboardModel();
  untrack(() => onReady(model));
</script>

<p>{model.state.isLoading ? 'Carregando' : 'Pronto'}</p>
