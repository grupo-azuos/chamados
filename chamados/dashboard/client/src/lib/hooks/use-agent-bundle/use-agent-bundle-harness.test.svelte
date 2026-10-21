<script lang="ts">
  import { useAgentBundleModel, type AgentBundleModel } from './use-agent-bundle.svelte';
  let { onReady }: { onReady: (model: AgentBundleModel) => void } = $props();
  onReady(useAgentBundleModel());
</script>
