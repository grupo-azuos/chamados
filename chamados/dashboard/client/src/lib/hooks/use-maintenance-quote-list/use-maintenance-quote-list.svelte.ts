import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { type QuoteKind, type QuoteStatus } from '@template/shared/domain/maintenance-quote.util';
import { type BoardDrill } from '@template/shared/schemas/board-drill.schema';
import { type MaintenanceQuote } from '@template/shared/schemas/maintenance-quote.schema';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import { derived, writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { maintenanceQuotesApi } from '$lib/api/maintenance-quotes.api';
import { type BoardDrillBanner, useBoardDrillModel } from '$lib/hooks/use-board-drill/use-board-drill.svelte';
import { MAINTENANCE_DASHBOARD_QUERY_KEY } from '$lib/hooks/use-inventory-movement-form/use-inventory-movement-form.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { contextPath } from '$lib/navigation/navigation';

export type MaintenanceQuoteListFilter = {
  search: string;
  status: QuoteStatus | '';
  kind: QuoteKind | '';
};

export type MaintenanceQuoteListModel = {
  data: {
    quotes: MaintenanceQuote[];
    total: number;
    /** Quanto somam os orçamentos à vista, em centavos. */
    amountCents: number;
    filter: MaintenanceQuoteListFilter;
    /** O orçamento que está esperando confirmação de exclusão — nulo quando não há. */
    deleting: MaintenanceQuote | null;
    /** A faixa do recorte do Painel, quando a lista veio de um clique num bloco. */
    drillBanner: BoardDrillBanner | null;
  };
  state: {
    isLoading: boolean;
    isRefetching: boolean;
    isEmpty: boolean;
    isFilteredOut: boolean;
    isTruncated: boolean;
    isDeleting: boolean;
    error: string | null;
    deleteError: string | null;
  };
  actions: {
    onSearchChange: (search: string) => void;
    onStatusChange: (status: QuoteStatus | '') => void;
    onKindChange: (kind: QuoteKind | '') => void;
    onClearFilters: () => void;
    onClearDrill: () => void;
    onBackToBoard: () => void;
    onRetry: () => void;
    onAskDelete: (quote: MaintenanceQuote) => void;
    onCancelDelete: () => void;
    onConfirmDelete: () => void;
  };
};

const EMPTY_FILTER: MaintenanceQuoteListFilter = { search: '', status: '', kind: '' };

export const MAINTENANCE_QUOTES_QUERY_KEY = ['maintenance-quotes'] as const;

function scopeOf(filter: MaintenanceQuoteListFilter, drill: BoardDrill | null = null) {
  return {
    drill: drill ?? undefined,
    search: filter.search.trim() || undefined,
    status: filter.status || undefined,
    kind: filter.kind || undefined,
  };
}

function hasAnyFilter(filter: MaintenanceQuoteListFilter): boolean {
  if (filter.search.trim() !== '') return true;
  if (filter.status !== '') return true;

  return filter.kind !== '';
}

/**
 * Estado, consultas e handlers dos orçamentos da Manutenção. ZERO marcação — a view recebe
 * tudo por props e não sabe de onde o dado veio (CONTRIBUTING §3).
 *
 * Guardar e alterar NÃO estão aqui: o formulário tem view-model próprio, porque formulário
 * morre junto com o diálogo que o abriu. A EXCLUSÃO está, porque ela nasce na lista.
 */
export function useMaintenanceQuoteListModel(): MaintenanceQuoteListModel {
  const queryClient = useQueryClient();

  /* O filtro mora numa STORE, e não num `$state`: esta versão do @tanstack/svelte-query
     recebe as opções como store e é ela quem decide quando refazer a busca. */
  const filterStore = writable<MaintenanceQuoteListFilter>({ ...EMPTY_FILTER });
  const filter = mirrorStore(filterStore);

  /* O recorte de um clique no Painel (`?drill=`): soma ao filtro da lista. */
  const drill = useBoardDrillModel({ module: 'manutencao', path: contextPath('manutencao', '/quotes') });

  let deleting = $state<MaintenanceQuote | null>(null);
  let deleteError = $state<string | null>(null);

  const list = mirrorStore(
    createQuery(
      derived([filterStore, drill.store], ([current, currentDrill]) => ({
        queryKey: [...MAINTENANCE_QUOTES_QUERY_KEY, 'list', scopeOf(current, currentDrill)],
        queryFn: () =>
          maintenanceQuotesApi.list({
            ...scopeOf(current, currentDrill),
            page: 1,
            pageSize: MAX_PAGE_SIZE,
          }),
      })),
    ),
  );

  const remove = mirrorStore(
    createMutation(
      writable({
        mutationFn: (id: number) => maintenanceQuotesApi.remove(id),
        onSuccess: () => {
          deleting = null;
          deleteError = null;
          void queryClient.invalidateQueries({ queryKey: MAINTENANCE_QUOTES_QUERY_KEY });
          void queryClient.invalidateQueries({ queryKey: MAINTENANCE_DASHBOARD_QUERY_KEY });
        },
        /* A falha fica NA TELA, com o motivo, até a pessoa resolver (CONTRIBUTING §15): o
           diálogo não fecha sozinho fingindo que excluiu. */
        onError: (error: unknown) => {
          deleteError = readError(error);
        },
      }),
    ),
  );

  return {
    /* `get` em vez de valor: o objeto é montado uma vez e a tela lê dele a cada mudança. */
    get data() {
      const quotes = list.current.data?.items ?? [];

      return {
        quotes,
        total: list.current.data?.total ?? 0,
        amountCents: quotes.reduce((sum, quote) => sum + quote.amountCents, 0),
        filter: filter.current,
        deleting,
        drillBanner: drill.banner,
      };
    },
    get state() {
      const count = list.current.data?.items.length ?? 0;
      /* Vazio só é vazio DEPOIS que a consulta terminou. */
      const isSettledEmpty = list.current.isSuccess && count === 0;
      /* Com recorte, a lista vazia é "nada casou", e não "não há orçamentos". */
      const filtered = drill.drill !== null || hasAnyFilter(filter.current);

      return {
        isLoading: list.current.isPending,
        isRefetching: list.current.isRefetching,
        isEmpty: isSettledEmpty && !filtered,
        isFilteredOut: isSettledEmpty && filtered,
        /* Veio menos do que casou: a tela precisa dizer, nunca truncar calada. */
        isTruncated: (list.current.data?.total ?? 0) > count,
        isDeleting: remove.current.isPending,
        error: readError(list.current.error),
        deleteError,
      };
    },
    actions: {
      onSearchChange: (search) => filterStore.update((current) => ({ ...current, search })),
      onStatusChange: (status) => filterStore.update((current) => ({ ...current, status })),
      onKindChange: (kind) => filterStore.update((current) => ({ ...current, kind })),
      onClearFilters: () => filterStore.set({ ...EMPTY_FILTER }),
      onClearDrill: drill.onClear,
      onBackToBoard: drill.onBack,
      onRetry: () => {
        void list.current.refetch();
      },
      onAskDelete: (quote) => {
        deleting = quote;
        deleteError = null;
      },
      onCancelDelete: () => {
        deleting = null;
        deleteError = null;
      },
      /* `mutate`, e não `await mutateAsync`: quem cuida do erro é o `onError` acima. */
      onConfirmDelete: () => {
        if (!deleting) return;

        remove.current.mutate(deleting.id);
      },
    },
  };
}
