import { goto } from '$app/navigation';
import { page } from '$app/state';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { canAttendTicketIn } from '@template/shared/domain/module-access.util';
import {
  nextTicketStatus,
  type ManualTicketHistoryType,
} from '@template/shared/domain/ticket-history.util';
import {
  TICKET_KANBAN_COLUMNS,
  ticketKanbanMove,
  ticketKanbanTitle,
} from '@template/shared/domain/ticket-kanban.util';
import {
  ticketStatusPhase,
  type TicketPhase,
  type TicketStatus,
} from '@template/shared/domain/ticket-status.util';
import { type Ticket } from '@template/shared/schemas/ticket.schema';
import { writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { ticketsApi } from '$lib/api/tickets.api';
import { type AreaContext } from '$lib/hooks/use-area-context/use-area-context.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { TICKETS_QUERY_KEY } from '$lib/hooks/use-ticket-list/use-ticket-list.svelte';
import { contextPath } from '$lib/navigation/navigation';

/** A coluna do quadro É o momento do chamado (`TicketPhase`): fila, atendimento, espera, fim. */
export type KanbanColumnId = TicketPhase;

export type KanbanColumn = {
  id: KanbanColumnId;
  title: string;
  tickets: Ticket[];
};

/**
 * Um arrasto que precisa de texto ou de escolha (encerrar, reabrir, pôr em espera): o quadro
 * abre o formulário de histórico com só os tipos que levam à coluna, e o cartão só muda depois
 * de confirmar. Desistir devolve o cartão — ele nunca saiu do lugar.
 */
export type TicketKanbanPendingMove = {
  ticket: Ticket;
  target: KanbanColumnId;
  targetTitle: string;
  types: ManualTicketHistoryType[];
  initialType: ManualTicketHistoryType;
};

export type TicketKanbanModel = {
  data: {
    columns: KanbanColumn[];
    cardColors: Record<number, string>;
    /** A foto de cada responsável, pelo id dele — o cartão mostra quem cuida pelo rosto. */
    assigneePhotos: Record<string, string | null>;
    /** Os chamados que esta pessoa só CONSULTA: o cartão não se arrasta. */
    lockedTicketIds: number[];
    pendingMove: TicketKanbanPendingMove | null;
  };
  state: {
    isMoving: boolean;
    moveError: string | null;
  };
  actions: {
    onOpenTicket: (ticketId: number) => void;
    onMoveTicket: (ticketId: number, target: KanbanColumnId) => Promise<void>;
    onSetCardColor: (ticketId: number, color: string) => void;
    onClearMoveError: () => void;
    /** O diálogo do arrasto foi fechado sem confirmar: o cartão fica onde estava. */
    onCancelMove: () => void;
    /** O histórico do diálogo foi lançado: a fila já se refez, o diálogo sai. */
    onMoveRecorded: () => void;
  };
};

/* A etiqueta é preferência de quem olha o quadro, sem valor para o chamado: fica no navegador,
   uma só para as três áreas (o id do chamado é único no sistema). */
const COLOR_STORAGE_KEY = 'azuos_kanban_card_colors';

function loadStoredColors(): Record<number, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(COLOR_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<number, string>) : {};
  } catch {
    return {};
  }
}

function saveStoredColors(colors: Record<number, string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COLOR_STORAGE_KEY, JSON.stringify(colors));
  } catch {
    /* Navegador sem armazenamento (aba anônima cheia): a etiqueta vale só até o F5. */
  }
}

/** Os chamados em colunas, pelo momento de cada um, já com as mudanças a caminho do servidor. */
export function toKanbanColumns(
  tickets: readonly Ticket[],
  overrides: Record<number, TicketStatus> = {},
): KanbanColumn[] {
  const effective = tickets.map((ticket) => {
    const status = overrides[ticket.id] ?? ticket.status;

    return status === ticket.status ? ticket : { ...ticket, status };
  });

  return TICKET_KANBAN_COLUMNS.map((column) => ({
    id: column.phase,
    title: column.title,
    tickets: effective.filter((ticket) => ticketStatusPhase(ticket.status) === column.phase),
  }));
}

function withoutKey(record: Record<number, TicketStatus>, key: number): Record<number, TicketStatus> {
  const next = { ...record };
  delete next[key];

  return next;
}

/**
 * O QUADRO DA FILA DE CHAMADOS — o modo kanban da fila de Infraestrutura, Sistema e Manutenção.
 * Zero marcação.
 *
 * Não busca os chamados: quem busca é a fila (`use-ticket-list`), com os MESMOS filtros da
 * lista, e entrega aqui por `tickets`. Este model só sabe o que o quadro acrescenta: as colunas,
 * o arrasto (com o histórico que ele lança), as etiquetas, as fotos e quem só consulta.
 *
 * Mover é lançar histórico, como na ficha (`ticketKanbanMove`, do domínio): pegar da fila e
 * retomar vão direto; encerrar, reabrir e pôr em espera abrem o formulário (`pendingMove`).
 */
export function useTicketKanbanModel(input: {
  area: AreaContext;
  tickets: () => readonly Ticket[];
}): TicketKanbanModel {
  const { area } = input;
  const queryClient = useQueryClient();
  const cardColorsStore = writable<Record<number, string>>(loadStoredColors());
  const optimisticStatuses = writable<Record<number, TicketStatus>>({});
  const moveErrorStore = writable<string | null>(null);
  const pendingStore = writable<TicketKanbanPendingMove | null>(null);

  /* Quem atende a área muda pouco: a lista vale por 5 minutos, e o quadro funciona mesmo
     enquanto ela não chega (ou se o admin-console não responder) — só sem as fotos. */
  const assignees = mirrorStore(
    createQuery(
      writable({
        queryKey: [...TICKETS_QUERY_KEY, 'assignee-options', area],
        queryFn: () => ticketsApi.assigneeOptions(area),
        staleTime: 5 * 60 * 1000,
      }),
    ),
  );

  const move = mirrorStore(
    createMutation({
      mutationFn: (variables: { ticketId: number; type: ManualTicketHistoryType; description: string }) =>
        ticketsApi.createHistory(
          variables.ticketId,
          {
            type: variables.type,
            description: variables.description,
            isVisibleToRequester: true,
            minutesSpent: '0',
            /* Mover no quadro não avisa ninguém: avisar é escolha de quem escreve o andamento. */
            notifyUserIds: [],
          },
          [],
        ),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
        moveErrorStore.set(null);
      },
    }),
  );

  const colors = mirrorStore(cardColorsStore);
  const optimistic = mirrorStore(optimisticStatuses);
  const moveError = mirrorStore(moveErrorStore);
  const pending = mirrorStore(pendingStore);

  /* A régua do servidor (`TicketAccessService`): atende quem administra alguma área do chamado. */
  function canMove(ticket: Ticket): boolean {
    return canAttendTicketIn(page.data.user, [ticket.area, ...ticket.participantAreas]);
  }

  /* O cartão muda de coluna na hora; se o servidor recusar, volta, e o aviso diz por quê. */
  async function moveDirectly(
    ticket: Ticket,
    history: { type: ManualTicketHistoryType; description: string },
  ): Promise<void> {
    const ticketId = ticket.id;
    optimisticStatuses.update((previous) => ({
      ...previous,
      [ticketId]: nextTicketStatus(ticket.status, history.type),
    }));
    moveErrorStore.set(null);

    try {
      await move.current.mutateAsync({ ticketId, ...history });
    } catch (error) {
      moveErrorStore.set(
        readError(error) || 'Não foi possível movimentar o chamado. Verifique as permissões.',
      );
    } finally {
      optimisticStatuses.update((previous) => withoutKey(previous, ticketId));
    }
  }

  /* O que soltar pede (do domínio): nada, recusa com aviso, lançar direto ou abrir o diálogo. */
  async function dropOn(ticket: Ticket, target: KanbanColumnId): Promise<void> {
    const next = ticketKanbanMove(ticket.status, target);
    if (next.kind === 'none') return;
    if (next.kind === 'refused') return moveErrorStore.set(next.message);
    if (next.kind === 'direct') return moveDirectly(ticket, next);

    moveErrorStore.set(null);
    pendingStore.set({
      ticket,
      target,
      targetTitle: ticketKanbanTitle(target),
      types: next.types,
      initialType: next.initialType,
    });
  }

  return {
    get data() {
      const tickets = input.tickets();

      return {
        columns: toKanbanColumns(tickets, optimistic.current),
        cardColors: colors.current,
        assigneePhotos: Object.fromEntries(
          (assignees.current.data ?? []).map((person) => [person.id, person.avatarUrl ?? null]),
        ),
        lockedTicketIds: tickets.filter((ticket) => !canMove(ticket)).map((ticket) => ticket.id),
        pendingMove: pending.current,
      };
    },
    get state() {
      return { isMoving: move.current.isPending, moveError: moveError.current };
    },
    actions: {
      onOpenTicket: (ticketId) => void goto(contextPath(area, `/tickets/${ticketId}`)),
      onMoveTicket: async (ticketId, target) => {
        /* Um passo de cada vez: com um arrasto indo para o servidor (ou o diálogo aberto), o
           segundo não sai — dois históricos cruzados deixariam o cartão na coluna errada. */
        if (move.current.isPending || pending.current) return;
        const ticket = input.tickets().find((item) => item.id === ticketId);
        if (!ticket || !canMove(ticket)) return;

        await dropOn(ticket, target);
      },
      onSetCardColor: (ticketId, color) => {
        cardColorsStore.update((previous) => {
          const next = { ...previous, [ticketId]: color };
          saveStoredColors(next);
          return next;
        });
      },
      onClearMoveError: () => moveErrorStore.set(null),
      onCancelMove: () => pendingStore.set(null),
      onMoveRecorded: () => pendingStore.set(null),
    },
  };
}
