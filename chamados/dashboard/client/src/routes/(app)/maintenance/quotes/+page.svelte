<script lang="ts">
  import BoardDrillBanner from '$lib/components/azuos-board-drill-banner/azuos-board-drill-banner.svelte';
  import ArchivedList from '$lib/components/azuos-archived-list/azuos-archived-list.svelte';
  import { useArchivedQuotesModel } from '$lib/hooks/use-archived-items/use-archived-items.svelte';
  import { type MaintenanceQuote } from '@template/shared/schemas/maintenance-quote.schema';

  import QuoteListView from './components/azuos-quote-list-view/azuos-quote-list-view.svelte';
  import { useMaintenanceQuoteListModel } from '$lib/hooks/use-maintenance-quote-list/use-maintenance-quote-list.svelte';
  import QuoteFormSlot from './quote-form-slot.svelte';

  /**
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   *
   * O que mora aqui não é dado, é QUAL PEÇA DA TELA ESTÁ NA FRENTE: o formulário de guardar ou
   * o de corrigir. A exclusão não entra nessa conta — ela nasce na lista, e por isso o
   * orçamento que espera confirmação vive no model dela.
   */
  const list = useMaintenanceQuoteListModel();
  const archived = useArchivedQuotesModel();

  let editing = $state<{ quote: MaintenanceQuote | null } | null>(null);
</script>

<svelte:head>
  <title>Orçamentos</title>
</svelte:head>

<!-- Vinda de um clique no Painel, a lista mostra no alto o recorte que a trouxe. -->
<div class="flex w-full flex-col">
  {#if list.data.drillBanner}
    <BoardDrillBanner
      data={list.data.drillBanner}
      actions={{ onClear: list.actions.onClearDrill, onBack: list.actions.onBackToBoard }}
    />
  {/if}
  <QuoteListView
    data={list.data}
    state={list.state}
    actions={{
      ...list.actions,
      onRegister: () => (editing = { quote: null }),
      onEdit: (quote: MaintenanceQuote) => (editing = { quote }),
    }}
  />
</div>

<!-- O que foi excluído some da lista e aparece aqui, fechado, com o "Desfazer". -->
<ArchivedList
  data={archived.data}
  ui={{ className: 'mt-6' }}
  state={archived.state}
  actions={archived.actions}
/>

<!-- `{#key}` pelo orçamento: trocar de orçamento monta um formulário NOVO, com os valores dele. -->
{#if editing}
  {#key editing.quote?.id ?? 'new'}
    <QuoteFormSlot quote={editing.quote} onClose={() => (editing = null)} />
  {/key}
{/if}
