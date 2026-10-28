import { createMutation, createQuery } from '@tanstack/svelte-query';
import {
  requesterTicketHistoryType,
  type RequesterTicketHistoryType,
} from '@template/shared/domain/ticket-history.util';
import { requesterHistoryFormSchema } from '@template/shared/schemas/ticket-history.schema';
import { type TicketPerson } from '@template/shared/schemas/ticket-person.schema';
import { type PublicTicket } from '@template/shared/schemas/ticket.schema';
import { derived, writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { ticketsApi } from '$lib/api/tickets.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';

export const PEOPLE_OPTIONS_QUERY_KEY = ['tickets', 'people-options'] as const;

export type TicketReplyModel = {
  data: {
    /** Responder (chamado andando) ou reabrir (chamado encerrado) — decide o estágio. */
    type: RequesterTicketHistoryType;
    description: string;
    chosenFiles: File[];
    notifyIds: string[];
    /** Quem pode ser avisado: quem abriu, vinculados e responsável, menos quem escreve. */
    notifiable: TicketPerson[];
    watcherIds: string[];
    peopleOptions: TicketPerson[];
  };
  state: {
    /** Só quem abriu e quem está vinculado escrevem; o TI vê, mas escreve pelo painel. */
    canReply: boolean;
    isSubmitting: boolean;
    error: string | null;
    descriptionError: string | null;
    attachmentError: string | null;
    /** O que acabou de sair, para a tela confirmar. Some na próxima digitação. */
    sentMessage: string | null;
    isLoadingPeople: boolean;
    isSavingWatchers: boolean;
    watchersError: string | null;
  };
  actions: {
    onDescriptionChange: (value: string) => void;
    onChosenFilesChange: (files: File[]) => void;
    onAttachmentError: (message: string | null) => void;
    onNotifyChange: (ids: string[]) => void;
    onWatchersChange: (ids: string[]) => void;
    onSubmit: () => void;
  };
};

/**
 * O LADO DE QUEM PEDIU da ordem de serviço, na Central: escrever no chamado (com arquivos),
 * reabri-lo e cuidar de quem está vinculado — a "OS do Tasy" vista de quem abriu.
 *
 * Recebe o chamado por FUNÇÃO porque ele muda por fora: a consulta busca outro número, ou
 * relê o mesmo depois de um envio. `onSaved` é esse reler — a linha do tempo, o estágio e os
 * vinculados voltam do servidor, e não de uma cópia montada aqui.
 */
export function useTicketReplyModel(input: {
  ticket: () => PublicTicket | null;
  onSaved: () => void;
}): TicketReplyModel {
  let description = $state('');
  let chosenFiles = $state<File[]>([]);
  let notifyIds = $state<string[]>([]);
  let attachmentError = $state<string | null>(null);
  let descriptionError = $state<string | null>(null);
  let sentMessage = $state<string | null>(null);

  const canReply = $derived(input.ticket()?.canReply ?? false);
  const type = $derived(requesterTicketHistoryType(input.ticket()?.status ?? 'open'));

  /* A lista de pessoas só é pedida quando há chamado em que a pessoa escreve. */
  const isPeopleEnabled = writable(false);
  $effect.pre(() => {
    isPeopleEnabled.set(canReply);
  });
  const people = mirrorStore(
    createQuery(
      derived(isPeopleEnabled, (enabled) => ({
        queryKey: [...PEOPLE_OPTIONS_QUERY_KEY],
        queryFn: () => ticketsApi.peopleOptions(),
        enabled,
        staleTime: 5 * 60 * 1000,
      })),
    ),
  );

  const send = mirrorStore(
    createMutation({
      mutationFn: (payload: { ticketId: number; type: RequesterTicketHistoryType }) =>
        ticketsApi.createRequesterHistory(
          payload.ticketId,
          payload.type,
          { description, notifyUserIds: notifyIds },
          chosenFiles,
        ),
      onSuccess: (_saved, payload) => {
        sentMessage =
          payload.type === 'requester_reopening' ? 'Chamado reaberto.' : 'Retorno enviado ao TI.';
        description = '';
        chosenFiles = [];
        notifyIds = [];
        attachmentError = null;
        input.onSaved();
      },
    }),
  );

  const watchers = mirrorStore(
    createMutation({
      mutationFn: (payload: { ticketId: number; ids: string[] }) =>
        ticketsApi.updateWatchers(payload.ticketId, payload.ids),
      onSuccess: () => input.onSaved(),
    }),
  );

  return {
    get data() {
      const ticket = input.ticket();

      return {
        type,
        description,
        chosenFiles,
        notifyIds,
        notifiable: ticket?.notifiable ?? [],
        /* Enquanto a troca vai ao servidor, a tela já mostra a lista nova. */
        watcherIds: watchers.current.isPending
          ? (watchers.current.variables?.ids ?? [])
          : (ticket?.watchers.map((watcher) => watcher.id) ?? []),
        peopleOptions: people.current.data ?? [],
      };
    },
    get state() {
      return {
        canReply,
        isSubmitting: send.current.isPending,
        error: send.current.isError ? readError(send.current.error) : null,
        descriptionError,
        attachmentError,
        sentMessage,
        isLoadingPeople: people.current.isPending && canReply,
        isSavingWatchers: watchers.current.isPending,
        watchersError: watchers.current.isError ? readError(watchers.current.error) : null,
      };
    },
    actions: {
      onDescriptionChange: (value) => {
        description = value;
        descriptionError = null;
        sentMessage = null;
      },
      onChosenFilesChange: (files) => {
        chosenFiles = files;
        sentMessage = null;
      },
      onAttachmentError: (message) => {
        attachmentError = message;
      },
      onNotifyChange: (ids) => {
        notifyIds = ids;
      },
      onWatchersChange: (ids) => {
        const ticket = input.ticket();
        if (!ticket) return;
        watchers.current.mutate({ ticketId: ticket.id, ids });
      },
      onSubmit: () => {
        const ticket = input.ticket();
        if (!ticket || !canReply) return;

        /* O mesmo contrato da API: o erro embaixo do campo é o que o servidor devolveria. */
        const parsed = requesterHistoryFormSchema.safeParse({ description, notifyUserIds: notifyIds });
        if (!parsed.success) {
          descriptionError = parsed.error.issues[0]?.message ?? 'Descreva o que aconteceu';
          return;
        }
        send.current.mutate({ ticketId: ticket.id, type });
      },
    },
  };
}
