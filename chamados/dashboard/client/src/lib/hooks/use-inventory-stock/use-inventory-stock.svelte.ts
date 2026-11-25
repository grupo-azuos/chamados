import { createQuery } from '@tanstack/svelte-query';
import { type InventoryCategory } from '@template/shared/domain/inventory-catalog.util';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import { derived, writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { inventoryItemsApi } from '$lib/api/inventory-items.api';
import { INVENTORY_QUERY_KEY } from '$lib/hooks/use-inventory-list/use-inventory-list.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { groupStock, type StockGroup } from '$lib/utils/inventory-stock-group.util';

export type InventoryStockFilter = {
  search: string;
  category: InventoryCategory | '';
  /** Só o que zerou — é a lista de compras da semana. */
  outOfStockOnly: boolean;
};

export type InventoryStockModel = {
  data: {
    /** Os produtos do depósito, um por NOME (sem diferença de maiúscula). */
    groups: StockGroup[];
    total: number;
    /** Quantos produtos da lista estão zerados — o número do atalho "Sem estoque". */
    outOfStock: number;
    filter: InventoryStockFilter;
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
    onSearchChange: (search: string) => void;
    onCategoryChange: (category: InventoryCategory | '') => void;
    onOutOfStockOnlyChange: (outOfStockOnly: boolean) => void;
    onClearFilters: () => void;
    onRetry: () => void;
  };
};

const EMPTY_FILTER: InventoryStockFilter = { search: '', category: '', outOfStockOnly: false };

function scopeOf(filter: InventoryStockFilter) {
  return {
    search: filter.search.trim() || undefined,
    category: filter.category || undefined,
  };
}

/**
 * Estado, consulta e handlers do DEPÓSITO da Manutenção: os mesmos produtos do inventário,
 * lidos pelo que importa aqui — quanto há de cada um.
 *
 * Usa a MESMA chave de consulta do inventário de propósito: é a mesma lista, e registrar uma
 * entrada precisa atualizar as duas telas. Movimentar NÃO está aqui: o formulário tem
 * view-model próprio (`use-inventory-movement-form`), porque morre com o diálogo que o abriu.
 */
export function useInventoryStockModel(): InventoryStockModel {
  /* O filtro mora numa STORE, e não num `$state`: esta versão do @tanstack/svelte-query
     recebe as opções como store e é ela quem decide quando refazer a busca. */
  const filterStore = writable<InventoryStockFilter>({ ...EMPTY_FILTER });
  const filter = mirrorStore(filterStore);

  /* Uma consulta só: o depósito agrupa os cadastros pelo nome AQUI, e "Sem estoque" é o grupo
     que somou zero — filtrar no SQL por cadastro esconderia a cadeira zerada de um nome que
     ainda tem estoque em outro cadastro. */
  const list = mirrorStore(
    createQuery(
      derived(filterStore, (current) => ({
        queryKey: [...INVENTORY_QUERY_KEY, 'list', scopeOf(current)],
        queryFn: () =>
          inventoryItemsApi.list({ ...scopeOf(current), page: 1, pageSize: MAX_PAGE_SIZE }),
      })),
    ),
  );

  const allGroups = $derived(groupStock(list.current.data?.items ?? []));
  const groups = $derived(
    filter.current.outOfStockOnly ? allGroups.filter((group) => group.balance === 0) : allGroups,
  );

  return {
    /* `get` em vez de valor: o objeto é montado uma vez e a tela lê dele a cada mudança. */
    get data() {
      return {
        groups,
        total: groups.length,
        outOfStock: allGroups.filter((group) => group.balance === 0).length,
        filter: filter.current,
      };
    },
    get state() {
      const loaded = list.current.data?.items ?? [];
      /* Vazio só é vazio DEPOIS que a consulta terminou. */
      const isSettledEmpty = list.current.isSuccess && groups.length === 0;
      const filtered = hasAnyFilter(filter.current);

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
      onSearchChange: (search) => filterStore.update((current) => ({ ...current, search })),
      onCategoryChange: (category) => filterStore.update((current) => ({ ...current, category })),
      onOutOfStockOnlyChange: (outOfStockOnly) =>
        filterStore.update((current) => ({ ...current, outOfStockOnly })),
      onClearFilters: () => filterStore.set({ ...EMPTY_FILTER }),
      onRetry: () => {
        void list.current.refetch();
      },
    },
  };
}

function hasAnyFilter(filter: InventoryStockFilter): boolean {
  if (filter.search.trim() !== '') return true;
  if (filter.outOfStockOnly) return true;

  return filter.category !== '';
}
