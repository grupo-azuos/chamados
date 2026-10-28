<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';

  import { useSupportShellModel, type SupportShellModel } from './use-support-shell.svelte';

  /** O model precisa de um componente para existir — mesmo apoio dos outros hooks. */
  let { onReady }: { onReady: (model: SupportShellModel) => void } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { mutations: { retry: false } } }));

  onReady(useSupportShellModel());
</script>
