<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { type SessionUser } from '@template/shared/schemas/user.schema';

  import { useMyProfileModel } from './use-my-profile.svelte';

  /** O model só existe dentro de um componente: é dali que vêm o QueryClient e o ciclo de vida. */
  let {
    user,
    onReady,
  }: { user: SessionUser | undefined; onReady: (model: ReturnType<typeof useMyProfileModel>) => void } =
    $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  // svelte-ignore state_referenced_locally
  onReady(useMyProfileModel({ user }));
</script>
