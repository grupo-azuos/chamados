import { createQuery } from '@tanstack/svelte-query';
import { type DisposalReason } from '@template/shared/domain/inventory-stock.util';
import { type InventoryMovement } from '@template/shared/schemas/inventory-movement.schema';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import { derived, writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { inventoryItemsApi } from '$lib/api/inventory-items.api';
import { INVENTORY_QUERY_KEY } from '$lib/hooks/use-inventory-list/use-inventory-list.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';

export type InventoryDisposalFilter = { reason: DisposalReason | '' };

export type InventoryDisposalListModel = {
  data: {
    disposals: InventoryMovement[];
    total: number;
    /** Quantas UNIDADES somam os descartes à vista — a soma das quantidades, não das linhas. */
    units: number;
    filter: InventoryDisposalFilter;
  };
  state: {
    isLoading: boolean;
    isRefetching: boolean;
    isEmpty: boolean;
    isFilteredOut: boolean;
    isTruncated: boolean;
    error: string | null;
  };
  actions: {
    onReasonChange: (reason: DisposalReason | '') => void;
    onClearFilters: () => void;
    onRetry: () => void;
  };
};

/**
 * Estado, consulta e handlers do DESCARTE da Manutenção: o que saiu de uso, e por quê.
 *
 * Descarte é um movimento do depósito com um motivo a mais — por isso a lista vem do mesmo
 * extrato, filtrado pelo tipo, e mora debaixo da mesma chave de consulta do inventário:
 * registrar um descarte muda o saldo do produto, e as três telas recarregam juntas.
 *
 * Registrar NÃO está aqui: o formulário tem view-model próprio
 * (`use-inventory-movement-form`), porque morre com o diálogo que o abriu.
 */
export function useInventoryDisposalListModel(): InventoryDisposalListModel {
  /* O filtro mora numa STORE: o motivo é filtrado no SQL, e mudar de motivo refaz a busca. */
  const filterStore = writable<InventoryDisposalFilter>({ reason: '' });
  const filterState = mirrorStore(filterStore);

  const list = mirrorStore(
    createQuery(
      derived(filterStore, (current) => ({
        queryKey: [...INVENTORY_QUERY_KEY, 'movements', 'disposal', current.reason],
        queryFn: () =>
          inventoryItemsApi.movements({
            type: 'disposal',
            reason: current.reason || undefined,
            page: 1,
            pageSize: MAX_PAGE_SIZE,
          }),
      })),
    ),
  );

  return {
    /* `get` em vez de valor: o objeto é montado uma vez e a tela lê dele a cada mudança. */
    get data() {
      const disposals = list.current.data?.items ?? [];

      return {
        disposals,
        total: list.current.data?.total ?? 0,
        units: disposals.reduce((sum, disposal) => sum + disposal.quantity, 0),
        filter: filterState.current,
      };
    },
    get state() {
      const loaded = list.current.data?.items ?? [];
      /* Vazio só é vazio DEPOIS que a consulta terminou. */
      const isSettledEmpty = list.current.isSuccess && loaded.length === 0;
      const filtered = filterState.current.reason !== '';

      return {
        isLoading: list.current.isPending,
        isRefetching: list.current.isRefetching,
        isEmpty: isSettledEmpty && !filtered,
        isFilteredOut: isSettledEmpty && filtered,
        /* Veio menos do que casou: a tela precisa dizer, nunca truncar calada. */
        isTruncated: (list.current.data?.total ?? 0) > loaded.length,
        error: readError(list.current.error),
      };
    },
    actions: {
      onReasonChange: (reason) => filterStore.set({ reason }),
      onClearFilters: () => filterStore.set({ reason: '' }),
      onRetry: () => {
        void list.current.refetch();
      },
    },
  };
}
