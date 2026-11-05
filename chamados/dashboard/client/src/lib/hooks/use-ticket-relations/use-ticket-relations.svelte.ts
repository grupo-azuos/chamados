import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import {
  type RelatedTicketSummary,
  type TicketRelation,
} from '@template/shared/schemas/ticket-relation.schema';
import { SvelteSet } from 'svelte/reactivity';
import { writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { ticketsApi } from '$lib/api/tickets.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { TICKETS_QUERY_KEY } from '$lib/hooks/use-ticket-list/use-ticket-list.svelte';

export const ticketRelationsQueryKey = (ticketId: number) => [
  ...TICKETS_QUERY_KEY,
  ticketId,
  'relations',
];

export type TicketRelationsModel = {
  data: {
    relations: TicketRelation[];
    searchTerm: string;
    searchResults: RelatedTicketSummary[];
    currentTicketId: number;
  };
  state: {
    isLoading: boolean;
    isSearching: boolean;
    isAdding: boolean;
    removingId: number | null;
    error: string | null;
  };
  actions: {
    onSearchChange: (search: string) => void;
    onAddRelation: (relatedTicketId: number) => void;
    onRemoveRelation: (relatedTicketId: number) => void;
  };
};

/**
 * OS CHAMADOS VINCULADOS na ficha do chamado.
 *
 * Permite buscar chamados por id/protocolo/texto e relacioná-los entre si (relação N:N).
 * Adicionar ou desvincular salva na hora, atualizando a linha do tempo e a lista de vínculos.
 */
export function useTicketRelationsModel(ticketId: number): TicketRelationsModel {
  const queryClient = useQueryClient();

  const relations = mirrorStore(
    createQuery(
      writable({
        queryKey: ticketRelationsQueryKey(ticketId),
        queryFn: () => ticketsApi.relations(ticketId),
      }),
    ),
  );

  let searchTerm = $state('');
  let searchResults = $state<RelatedTicketSummary[]>([]);
  let isSearching = $state(false);
  let searchError = $state<string | null>(null);
  let removingId = $state<number | null>(null);
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  async function performSearch(term: string) {
    const trimmed = term.trim();
    if (!trimmed) {
      searchResults = [];
      isSearching = false;
      return;
    }

    isSearching = true;
    searchError = null;
    try {
      const response = await ticketsApi.list({ search: trimmed, pageSize: 8 });
      const currentRelations = relations.current.data ?? [];
      const linkedIds = new SvelteSet([ticketId, ...currentRelations.map((r) => r.relatedTicketId)]);

      searchResults = response.items
        .filter((item) => !linkedIds.has(item.id))
        .map((item) => ({
          id: item.id,
          protocol: item.protocol,
          description: item.description,
          status: item.status,
          priority: item.priority,
          area: item.area,
          requesterName: item.requesterName,
          createdAt: item.createdAt,
        }));
    } catch (err) {
      searchError = readError(err);
      searchResults = [];
    } finally {
      isSearching = false;
    }
  }

  function handleSearchChange(term: string) {
    searchTerm = term;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      void performSearch(term);
    }, 250);
  }

  const add = mirrorStore(
    createMutation({
      mutationFn: (relatedId: number) => ticketsApi.addRelation(ticketId, relatedId),
      onSuccess: async () => {
        searchTerm = '';
        searchResults = [];
        await queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
      },
    }),
  );

  const remove = mirrorStore(
    createMutation({
      mutationFn: async (relatedId: number) => {
        removingId = relatedId;
        try {
          await ticketsApi.removeRelation(ticketId, relatedId);
        } finally {
          removingId = null;
        }
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
      },
    }),
  );

  return {
    get data() {
      return {
        relations: relations.current.data ?? [],
        searchTerm,
        searchResults,
        currentTicketId: ticketId,
      };
    },
    get state() {
      return {
        isLoading: relations.current.isPending,
        isSearching,
        isAdding: add.current.isPending,
        removingId,
        error:
          readError(add.current.error) ??
          readError(remove.current.error) ??
          readError(relations.current.error) ??
          searchError,
      };
    },
    actions: {
      onSearchChange: handleSearchChange,
      onAddRelation: (relatedId) => add.current.mutate(relatedId),
      onRemoveRelation: (relatedId) => remove.current.mutate(relatedId),
    },
  };
}
