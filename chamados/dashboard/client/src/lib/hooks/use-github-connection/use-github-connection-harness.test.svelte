<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { untrack } from 'svelte';
  import { useGithubConnectionModel } from './use-github-connection.svelte';

  type Model = ReturnType<typeof useGithubConnectionModel>;
  let { enabled = true, onReady }: { enabled?: boolean; onReady: (model: Model) => void } = $props();
  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  // svelte-ignore state_referenced_locally
  const model = useGithubConnectionModel('u-ana', enabled);
  untrack(() => onReady(model));
</script>

<p>{model.state.isLinked ? 'Vinculado' : 'Sem vínculo'}</p>
