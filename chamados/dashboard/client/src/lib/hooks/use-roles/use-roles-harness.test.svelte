<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';

  import { useRolesModel, type RolesModel } from './use-roles.svelte';

  let {
    onReady,
    isEnabled = true,
  }: { onReady: (model: RolesModel) => void; isEnabled?: boolean } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  // svelte-ignore state_referenced_locally
  onReady(useRolesModel({ isEnabled }));
</script>
