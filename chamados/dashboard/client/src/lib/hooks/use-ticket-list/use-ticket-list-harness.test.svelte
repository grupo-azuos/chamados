<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';

  import { type AreaContext } from '$lib/hooks/use-area-context/use-area-context.svelte';

  import { useTicketListModel, type TicketListModel } from './use-ticket-list.svelte';

  /**
   * View-model com consulta só existe dentro de um componente: é dali que vêm o QueryClient e
   * o ciclo de vida da busca. Este apoio monta o model e o entrega ao teste, que então
   * trabalha com ele como a tela trabalharia.
   */
  let {
    onReady,
    area = 'infra',
  }: { onReady: (model: TicketListModel) => void; area?: AreaContext } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  // svelte-ignore state_referenced_locally
  onReady(useTicketListModel({ area }));
</script>
