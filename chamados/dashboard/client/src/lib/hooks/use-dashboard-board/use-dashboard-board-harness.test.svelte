<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { type BoardModule } from '@template/shared/schemas/dashboard-board.schema';

  import { type DashboardBoardModel, useDashboardBoardModel } from './use-dashboard-board.svelte';

  /** O model precisa de um componente para existir (o svelte-query vive no contexto). */
  let { module, onReady }: { module: BoardModule; onReady: (model: DashboardBoardModel) => void } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  // svelte-ignore state_referenced_locally
  onReady(useDashboardBoardModel(module));
</script>
