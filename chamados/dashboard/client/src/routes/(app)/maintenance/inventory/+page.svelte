<script lang="ts">
  import ArchivedList from '$lib/components/azuos-archived-list/azuos-archived-list.svelte';
  import { useArchivedInventoryModel } from '$lib/hooks/use-archived-items/use-archived-items.svelte';
  import { type InventoryItem } from '@template/shared/schemas/inventory-item.schema';

  import InventoryListView from './components/azuos-inventory-list-view/azuos-inventory-list-view.svelte';
  import { useInventoryListModel } from '$lib/hooks/use-inventory-list/use-inventory-list.svelte';
  import InventoryFormSlot from './inventory-form-slot.svelte';

  /**
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   *
   * O que mora aqui não é dado, é QUAL PEÇA DA TELA ESTÁ NA FRENTE: o formulário de cadastro
   * ou o de correção. A exclusão não entra nessa conta — ela nasce na lista, e por isso o
   * produto que espera confirmação vive no model dela.
   */
  const list = useInventoryListModel();
  const archived = useArchivedInventoryModel();

  let editing = $state<{ item: InventoryItem | null } | null>(null);
</script>

<svelte:head>
  <title>Inventário</title>
</svelte:head>

<InventoryListView
  data={list.data}
  state={list.state}
  actions={{
    ...list.actions,
    onRegister: () => (editing = { item: null }),
    onEdit: (item: InventoryItem) => (editing = { item }),
  }}
/>

<!-- O que foi excluído some da lista e aparece aqui, fechado, com o "Desfazer". -->
<ArchivedList
  data={archived.data}
  ui={{ className: 'mt-6' }}
  state={archived.state}
  actions={archived.actions}
/>

<!-- `{#key}` pelo produto: trocar de produto monta um formulário NOVO, com os valores dele. -->
{#if editing}
  {#key editing.item?.id ?? 'new'}
    <InventoryFormSlot item={editing.item} onClose={() => (editing = null)} />
  {/key}
{/if}
