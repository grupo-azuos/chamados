import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { ticketStatusLabel } from '@template/shared/domain/ticket-status.util';
import { buildWhatsAppLink } from '@template/shared/domain/ticket-whatsapp.util';
import { type TicketAttachment } from '@template/shared/schemas/ticket-attachment.schema';
import { type TicketHistory } from '@template/shared/schemas/ticket-history.schema';
import {
  type Ticket,
  TICKET_NOTICE_MESSAGES,
  type TicketNotice,
} from '@template/shared/schemas/ticket.schema';
import { type WhatsappNotice } from '@template/shared/schemas/whatsapp-notice.schema';
import { writable } from 'svelte/store';

import { ApiError, readError } from '$lib/api/http-client';
import { ticketsApi } from '$lib/api/tickets.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { TICKETS_QUERY_KEY } from '$lib/hooks/use-ticket-list/use-ticket-list.svelte';
import { triggerBrowserDownload } from '$lib/utils/download-file.util';

const NOT_FOUND = 404;
/* O entregador do servidor passa a cada 5 s; olhar com a mesma frequência basta. */
const NOTICE_REFRESH_MS = 5000;

/** Algum aviso ainda está na fila? É o que mantém a lista se atualizando sozinha. */
export function hasQueuedNotice(notices: readonly WhatsappNotice[]): boolean {
  return notices.some((queued) => queued.status === 'pending');
}

export type TicketDetailModel = {
  data: {
    ticket: Ticket | null;
    /** A linha do tempo, do mais antigo para o mais novo. */
    histories: TicketHistory[];
    /** Os arquivos do PRÓPRIO chamado — os que não entraram junto de um histórico. */
    attachments: TicketAttachment[];
    /** O link de aviso, pronto. Nulo quando a pessoa não pediu para ser avisada. */
    whatsAppLink: string | null;
    /** Os avisos de WhatsApp do chamado, do mais novo para o mais antigo. */
    notices: WhatsappNotice[];
  };
  state: {
    isLoading: boolean;
    isNotifying: boolean;
    /** Nulo enquanto ninguém clicou em avisar. */
    notice: TicketNoticeResult | null;
    /** O chamado não existe (ou não é de uma área que a pessoa atende). */
    isMissing: boolean;
    error: string | null;
    isTimelineLoading: boolean;
    timelineError: string | null;
    isAttachmentsLoading: boolean;
    /** Qual anexo está sendo excluído — trava a linha dele, não a lista. */
    removingAttachmentId: number | null;
    attachmentError: string | null;
    isDownloadingServiceOrder: boolean;
    serviceOrderError: string | null;
    /** Qual aviso está sendo reenviado — trava só a linha dele. */
    retryingNoticeId: number | null;
    noticeError: string | null;
  };
  actions: {
    /** Põe de volta na fila um aviso de WhatsApp que parou. */
    onRetryNotice: (notice: WhatsappNotice) => void;
    onRetry: () => void;
    onRemoveAttachment: (attachment: TicketAttachment) => void;
    onDownloadServiceOrder: () => void;
    /** Avisa pelo WhatsApp do responsável que o chamado ficou pronto. */
    onNotify: () => void;
  };
};

/** O que aconteceu com o aviso por WhatsApp: saiu, ou por que não saiu. */
export type TicketNoticeResult = { isSent: boolean; message: string };

export function toNoticeResult(notice: TicketNotice, assignee: string | null): TicketNoticeResult {
  if (notice.outcome === 'sent') {
    return {
      isSent: true,
      message: `Mensagem enviada pelo WhatsApp de ${assignee ?? 'quem atende'}.`,
    };
  }
  /* Na fila é o caminho feliz: o servidor entrega em seguida, e a lista de avisos acompanha. */
  if (notice.outcome === 'queued') {
    return {
      isSent: true,
      message: `Aviso na fila: sai pelo WhatsApp de ${assignee ?? 'quem atende'} em instantes.`,
    };
  }

  return { isSent: false, message: TICKET_NOTICE_MESSAGES[notice.outcome] };
}

/**
 * A FICHA de um chamado: os dados dele, a linha do tempo e os arquivos.
 *
 * Só LEITURA mora aqui (mais excluir anexo e baixar o PDF). Lançar histórico e corrigir os
 * dados têm o próprio view-model cada um (`use-ticket-history-form`, `use-ticket-data-form`):
 * são formulários, e formulário nasce e morre com o chamado que está na tela.
 *
 * As três consultas ficam embaixo da chave de chamados: qualquer gravação invalida
 * `TICKETS_QUERY_KEY` e a ficha inteira se refaz — estágio, linha do tempo e anexos juntos,
 * sem o risco de um deles ficar mostrando o passo anterior.
 */
export function useTicketDetailModel(id: number): TicketDetailModel {
  const queryClient = useQueryClient();

  const ticket = mirrorStore(
    createQuery(
      writable({
        queryKey: [...TICKETS_QUERY_KEY, 'detail', id],
        queryFn: () => ticketsApi.findById(id),
        /* 404 e 403 não mudam tentando de novo: repetir só atrasa o aviso. */
        retry: false,
      }),
    ),
  );

  const histories = mirrorStore(
    createQuery(
      writable({
        queryKey: [...TICKETS_QUERY_KEY, 'histories', id],
        queryFn: () => ticketsApi.histories(id),
        retry: false,
      }),
    ),
  );

  const attachments = mirrorStore(
    createQuery(
      writable({
        queryKey: [...TICKETS_QUERY_KEY, 'attachments', id],
        queryFn: () => ticketsApi.attachments(id),
        retry: false,
      }),
    ),
  );

  const noticesKey = [...TICKETS_QUERY_KEY, 'whatsapp-notices', id];
  const notices = mirrorStore(
    createQuery(
      writable({
        queryKey: noticesKey,
        queryFn: () => ticketsApi.whatsappNotices(id),
        retry: false,
        /* Enquanto algum aviso está na fila, a lista se atualiza sozinha: quem clicou em avisar
           vê o "Na fila" virar "Enviado" sem recarregar a página. */
        refetchInterval: (query: { state: { data?: WhatsappNotice[] } }) =>
          hasQueuedNotice(query.state.data ?? []) ? NOTICE_REFRESH_MS : false,
      }),
    ),
  );

  let retryingNoticeId = $state<number | null>(null);
  const retryNotice = mirrorStore(
    createMutation({
      mutationFn: (noticeId: number) => ticketsApi.retryWhatsappNotice(id, noticeId),
      onSettled: async () => {
        retryingNoticeId = null;
        await queryClient.invalidateQueries({ queryKey: noticesKey });
      },
    }),
  );

  let removingAttachmentId = $state<number | null>(null);
  let isDownloadingServiceOrder = $state(false);
  let serviceOrderError = $state<string | null>(null);

  const removeAttachment = mirrorStore(
    createMutation({
      mutationFn: (attachmentId: number) => ticketsApi.removeAttachment(id, attachmentId),
      onSettled: async () => {
        removingAttachmentId = null;
        await queryClient.invalidateQueries({
          queryKey: [...TICKETS_QUERY_KEY, 'attachments', id],
        });
      },
    }),
  );

  /* O resultado do último aviso. Fica na tela até a pessoa sair do chamado: é a confirmação
     de que a mensagem saiu — ou o motivo de não ter saído, ao lado do link manual. */
  let notice = $state<TicketNoticeResult | null>(null);
  const notify = mirrorStore(
    createMutation({
      mutationFn: () => ticketsApi.notifyReady(id),
      onSuccess: async (result: TicketNotice) => {
        notice = toNoticeResult(result, ticket.current.data?.assignee ?? null);
        await queryClient.invalidateQueries({ queryKey: noticesKey });
      },
      /* Falha de rede também cai no link manual: o que importa é a pessoa conseguir avisar. */
      onError: () => {
        notice = { isSent: false, message: TICKET_NOTICE_MESSAGES.failed };
      },
    }),
  );

  return {
    /* `get` em vez de valor: o model é montado uma vez e a tela lê dele a cada mudança. */
    get data() {
      const current = ticket.current.data ?? null;

      return {
        ticket: current,
        histories: histories.current.data ?? [],
        attachments: ownFilesOf(attachments.current.data ?? []),
        whatsAppLink: current ? buildNotice(current) : null,
        notices: notices.current.data ?? [],
      };
    },
    get state() {
      const isMissing = statusOf(ticket.current.error) === NOT_FOUND;

      return {
        isLoading: ticket.current.isPending,
        isNotifying: notify.current.isPending,
        notice,
        isMissing,
        error: isMissing ? null : readError(ticket.current.error),
        isTimelineLoading: histories.current.isPending,
        timelineError: readError(histories.current.error),
        isAttachmentsLoading: attachments.current.isPending,
        removingAttachmentId,
        attachmentError: readError(removeAttachment.current.error),
        isDownloadingServiceOrder,
        serviceOrderError,
        retryingNoticeId,
        noticeError: readError(retryNotice.current.error),
      };
    },
    actions: {
      onRetryNotice: (stopped) => {
        retryingNoticeId = stopped.id;
        retryNotice.current.mutate(stopped.id);
      },
      onNotify: () => {
        if (!notify.current.isPending) notify.current.mutate();
      },
      onRetry: () => {
        void ticket.current.refetch();
        void histories.current.refetch();
        void attachments.current.refetch();
      },
      onRemoveAttachment: (attachment) => {
        removingAttachmentId = attachment.id;
        removeAttachment.current.mutate(attachment.id);
      },
      onDownloadServiceOrder: () => {
        serviceOrderError = null;
        isDownloadingServiceOrder = true;

        ticketsApi
          .serviceOrder(id)
          .then(({ blob, fileName }) => triggerBrowserDownload(blob, fileName))
          .catch((error: unknown) => {
            serviceOrderError = readError(error) ?? 'Não consegui gerar a ordem de serviço.';
          })
          .finally(() => {
            isDownloadingServiceOrder = false;
          });
      },
    },
  };
}

/**
 * Os arquivos do PRÓPRIO chamado. Os que entraram junto de um histórico aparecem dentro dele,
 * na linha do tempo — mostrá-los também aqui seria o mesmo arquivo duas vezes na tela.
 */
export function ownFilesOf(attachments: readonly TicketAttachment[]): TicketAttachment[] {
  return attachments.filter((attachment) => attachment.historyId === null);
}

/**
 * O aviso de WhatsApp, com o texto já escrito.
 *
 * Nulo quando a pessoa NÃO pediu para ser avisada — ter o telefone dela no chamado não é
 * autorização para usá-lo.
 */
export function buildNotice(ticket: Ticket): string | null {
  if (!ticket.notifyWhatsapp) return null;

  return buildWhatsAppLink(
    ticket.contactPhone,
    `Olá! Seu chamado ${ticket.protocol} está: ${ticketStatusLabel(ticket.status)}.`,
  );
}

function statusOf(error: unknown): number | null {
  return error instanceof ApiError ? error.status : null;
}
