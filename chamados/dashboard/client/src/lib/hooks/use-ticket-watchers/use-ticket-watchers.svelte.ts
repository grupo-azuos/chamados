import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { type TicketPerson } from '@template/shared/schemas/ticket-person.schema';
import { writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { ticketsApi } from '$lib/api/tickets.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { ticketPeopleQueryKey } from '$lib/hooks/use-ticket-history-form/use-ticket-history-form.svelte';
import { TICKETS_QUERY_KEY } from '$lib/hooks/use-ticket-list/use-ticket-list.svelte';

/* A lista do admin-console muda pouco: cinco minutos poupam uma ida a cada ficha aberta. */
const PEOPLE_OPTIONS_STALE_MS = 5 * 60 * 1000;

export type TicketWatchersModel = {
  data: { selectedIds: string[]; options: TicketPerson[] };
  state: { isLoading: boolean; isSaving: boolean; error: string | null };
  actions: { onChange: (ids: string[]) => void };
};

/**
 * AS PESSOAS VINCULADAS de um chamado, no painel — a "OS com envolvidos" do Tasy.
 *
 * Como as áreas participantes, é um pedido PRÓPRIO, fora do formulário de dados: marcar ou
 * tirar alguém salva na hora. Quem só consulta recebe a recusa do servidor, mostrada embaixo
 * do campo — a mesma regra das áreas, sem uma segunda cópia dela aqui.
 */
export function useTicketWatchersModel(ticketId: number): TicketWatchersModel {
  const queryClient = useQueryClient();

  const people = mirrorStore(
    createQuery(
      writable({
        queryKey: ticketPeopleQueryKey(ticketId),
        queryFn: () => ticketsApi.people(ticketId),
      }),
    ),
  );

  const options = mirrorStore(
    createQuery(
      writable({
        queryKey: [...TICKETS_QUERY_KEY, 'people-options'],
        queryFn: () => ticketsApi.peopleOptions(),
        staleTime: PEOPLE_OPTIONS_STALE_MS,
      }),
    ),
  );

  const save = mirrorStore(
    createMutation({
      mutationFn: (ids: string[]) => ticketsApi.updateWatchers(ticketId, ids),
      /* A chave inteira de chamados: a troca vira histórico na linha do tempo, e quem pode ser
         avisado (o formulário de andamento) muda junto. */
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
      },
    }),
  );

  return {
    get data() {
      /* Enquanto salva, a tela já mostra a escolha nova: esperar o servidor para a ficha
         aparecer faria parecer que o clique não pegou. */
      const pending = save.current.isPending ? save.current.variables : undefined;

      return {
        selectedIds: pending ?? (people.current.data?.watchers ?? []).map((person) => person.id),
        options: options.current.data ?? [],
      };
    },
    get state() {
      return {
        isLoading: people.current.isPending || options.current.isPending,
        isSaving: save.current.isPending,
        error: readError(save.current.error) ?? readError(people.current.error),
      };
    },
    actions: {
      onChange: (ids) => save.current.mutate(ids),
    },
  };
}
