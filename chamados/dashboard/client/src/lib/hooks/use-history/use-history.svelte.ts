import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
import { type RoleContext } from '@template/shared/domain/role-context.util';
import {
  type HistoryEntry,
  type HistoryKind,
  type HistoryQuery,
} from '@template/shared/schemas/history.schema';
import { DEFAULT_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import { derived, writable } from 'svelte/store';

import { historyApi } from '$lib/api/history.api';
import { readError } from '$lib/api/http-client';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';

/**
 * O HISTÓRICO de um módulo — quem mudou o quê e quando. Zero marcação.
 *
 * Filtra por tipo do registro, pelo que a ação fez, "só o que eu fiz", período e o nome do alvo, e
 * pagina: o histórico só cresce. O módulo vem da página (`/infra/history` é o da Infraestrutura) e
 * não muda enquanto a tela vive — trocar de módulo é trocar de rota.
 */
export type HistoryFilter = {
  who: 'all' | 'mine';
  targetType: string;
  kind: HistoryKind | '';
  search: string;
  from: string | null;
  to: string | null;
};

export type HistoryModel = {
  data: {
    module: RoleContext;
    entries: HistoryEntry[];
    filter: HistoryFilter;
    page: number;
    pageSize: number;
    total: number;
  };
  state: { isLoading: boolean; isFetching: boolean; error: string | null };
  actions: {
    onFilterChange: (patch: Partial<HistoryFilter>) => void;
    onClearFilters: () => void;
    onPageChange: (page: number) => void;
    onRetry: () => void;
  };
};

export const EMPTY_HISTORY_FILTER: HistoryFilter = {
  who: 'all',
  targetType: '',
  kind: '',
  search: '',
  from: null,
  to: null,
};

export const HISTORY_QUERY_KEY = ['history'] as const;

/** O filtro da tela na consulta da API: o que está vazio não vai. */
export function toHistoryQuery(
  module: RoleContext,
  filter: HistoryFilter,
  page: number,
): Partial<HistoryQuery> & Pick<HistoryQuery, 'module'> {
  return {
    module,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    actor: filter.who === 'mine' ? 'me' : undefined,
    targetType: filter.targetType || undefined,
    kind: filter.kind || undefined,
    search: filter.search.trim() || undefined,
    from: filter.from ?? undefined,
    to: filter.to ?? undefined,
  };
}

export function useHistoryModel(module: RoleContext): HistoryModel {
  /* O filtro e a página moram numa STORE: esta versão do @tanstack/svelte-query recebe as opções
     como store e é ela quem decide quando refazer a busca. */
  const scope = writable({ filter: { ...EMPTY_HISTORY_FILTER }, page: 1 });
  const current = mirrorStore(scope);

  const list = mirrorStore(
    createQuery(
      derived(scope, ({ filter, page }) => ({
        queryKey: [...HISTORY_QUERY_KEY, toHistoryQuery(module, filter, page)],
        queryFn: () => historyApi.list(toHistoryQuery(module, filter, page)),
        /* Trocar de página não pisca a lista vazia: a anterior fica até a nova chegar. */
        placeholderData: keepPreviousData,
      })),
    ),
  );

  return {
    get data() {
      return {
        module,
        entries: list.current.data?.items ?? [],
        filter: current.current.filter,
        page: current.current.page,
        pageSize: DEFAULT_PAGE_SIZE,
        total: list.current.data?.total ?? 0,
      };
    },
    get state() {
      return {
        isLoading: list.current.isPending,
        isFetching: list.current.isFetching,
        error: readError(list.current.error),
      };
    },
    actions: {
      /* Filtro novo volta para a primeira página: a página 4 do recorte antigo não existe no novo. */
      onFilterChange: (patch) =>
        scope.update((value) => ({ filter: { ...value.filter, ...patch }, page: 1 })),
      onClearFilters: () => scope.set({ filter: { ...EMPTY_HISTORY_FILTER }, page: 1 }),
      onPageChange: (page) => scope.update((value) => ({ ...value, page })),
      onRetry: () => {
        void list.current.refetch();
      },
    },
  };
}
