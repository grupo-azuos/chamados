import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import {
  type BoardModule,
  type SavedFilter,
  type SaveFilterInput,
} from '@template/shared/schemas/dashboard-board.schema';
import { writable } from 'svelte/store';

import { dashboardBoardsApi } from '$lib/api/dashboard-boards.api';
import { readError } from '$lib/api/http-client';
import { BOARD_QUERY_KEY } from '$lib/hooks/use-dashboard-board/use-dashboard-board.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';

/**
 * OS FILTROS SALVOS DE UM MÓDULO — montados uma vez, servem a qualquer bloco. O pessoal só quem
 * criou vê; o compartilhado o módulo vê. Nenhum se apaga: arquivar tira da lista, e "Desfazer"
 * devolve. Zero marcação.
 */
export function useSavedFiltersModel(module: BoardModule) {
  const queryClient = useQueryClient();
  const key = [...BOARD_QUERY_KEY, module, 'filters'] as const;

  let isOpen = $state(false);
  let editing = $state<SavedFilter | 'new' | null>(null);

  const active = mirrorStore(
    createQuery(writable({ queryKey: [...key, 'active'], queryFn: () => dashboardBoardsApi.filters(module) })),
  );
  const archived = mirrorStore(
    createQuery(
      writable({ queryKey: [...key, 'archived'], queryFn: () => dashboardBoardsApi.filters(module, 'only') }),
    ),
  );

  /* Mudar um filtro muda os números dos blocos que o usam: o painel inteiro relê. */
  const refresh = () => queryClient.invalidateQueries({ queryKey: [...BOARD_QUERY_KEY, module] });

  const save = mirrorStore(
    createMutation({
      mutationFn: (input: { id: string | null; body: SaveFilterInput }) =>
        input.id
          ? dashboardBoardsApi.updateFilter(module, input.id, input.body)
          : dashboardBoardsApi.createFilter(module, input.body),
      onSuccess: async () => {
        editing = null;
        await refresh();
      },
    }),
  );

  const toggleArchive = mirrorStore(
    createMutation({
      mutationFn: (input: { id: string; archived: boolean }) =>
        input.archived ? dashboardBoardsApi.archiveFilter(module, input.id) : dashboardBoardsApi.restoreFilter(module, input.id),
      onSuccess: refresh,
    }),
  );

  return {
    get data() {
      return {
        filters: active.current.data ?? [],
        archived: archived.current.data ?? [],
        editing,
      };
    },
    get state() {
      return {
        isOpen,
        isLoading: active.current.isPending,
        isSaving: save.current.isPending,
        isArchiving: toggleArchive.current.isPending,
        error: readError(active.current.error) ?? readError(save.current.error) ?? readError(toggleArchive.current.error),
      };
    },
    actions: {
      onOpen: () => {
        isOpen = true;
      },
      onClose: () => {
        isOpen = false;
        editing = null;
        save.current.reset();
      },
      onNew: () => {
        editing = 'new';
        save.current.reset();
      },
      onEdit: (filter: SavedFilter) => {
        editing = filter;
        save.current.reset();
      },
      onCancelEdit: () => {
        editing = null;
        save.current.reset();
      },
      onSave: (id: string | null, body: SaveFilterInput) => save.current.mutate({ id, body }),
      onArchive: (id: string) => toggleArchive.current.mutate({ id, archived: true }),
      onRestore: (id: string) => toggleArchive.current.mutate({ id, archived: false }),
    },
  };
}

export type SavedFiltersModel = ReturnType<typeof useSavedFiltersModel>;
