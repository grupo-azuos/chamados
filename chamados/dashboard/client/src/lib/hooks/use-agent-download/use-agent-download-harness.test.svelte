<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { useAgentDownloadModel, type AgentDownloadModel } from './use-agent-download.svelte';
  let { onReady }: { onReady: (model: AgentDownloadModel) => void } = $props();
  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  onReady(useAgentDownloadModel());
</script>
