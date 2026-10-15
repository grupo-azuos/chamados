import { type TicketAttachment } from '@template/shared/schemas/ticket-attachment.schema';
import { type TicketHistory } from '@template/shared/schemas/ticket-history.schema';
import { type Ticket } from '@template/shared/schemas/ticket.schema';
import { type WhatsappNotice } from '@template/shared/schemas/whatsapp-notice.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-ticket-detail-harness.test.svelte';
import {
  buildNotice,
  hasQueuedNotice,
  ownFilesOf,
  type TicketDetailModel,
  toNoticeResult,
} from './use-ticket-detail.svelte';

vi.mock('$lib/api/tickets.api', () => ({
  ticketsApi: {
    findById: vi.fn(),
    histories: vi.fn(),
    attachments: vi.fn(),
    removeAttachment: vi.fn(),
    serviceOrder: vi.fn(),
    whatsappNotices: vi.fn(),
    retryWhatsappNotice: vi.fn(),
  },
}));

vi.mock('$lib/utils/download-file.util', () => ({ triggerBrowserDownload: vi.fn() }));

const { ticketsApi } = await import('$lib/api/tickets.api');
const { triggerBrowserDownload } = await import('$lib/utils/download-file.util');

function ticket(over: Partial<Ticket> = {}): Ticket {
  return {
    id: 22,
    protocol: 'CH-0022',
    status: 'waiting_third_party',
    priority: 'high',
    requesterName: 'Ana Souza',
    area: 'infra',
    department: 'contabil',
    problemType: 'network',
    participantAreas: [],
    computerId: null,
    computerName: null,
    anydeskId: null,
    contactPhone: '62999990022',
    notifyWhatsapp: true,
    description: 'A internet caiu na minha sala.',
    screenshotUrl: null,
    assignee: 'Suporte TI',
    solution: null,
    createdAt: '2026-09-23T12:00:00.000Z',
    startedAt: '2026-09-23T12:30:00.000Z',
    resolvedAt: null,
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

function attachment(over: Partial<TicketAttachment> = {}): TicketAttachment {
  return {
    id: 5,
    ticketId: 22,
    historyId: null,
    kind: 'pdf',
    origin: 'requester',
    fileName: 'nota.pdf',
    contentType: 'application/pdf',
    sizeBytes: 1024,
    viewUrl: 'https://r2.example/abrir',
    downloadUrl: 'https://r2.example/baixar',
    createdAt: '2026-09-23T12:00:00.000Z',
    createdBy: null,
    ...over,
  };
}

const opening: TicketHistory = {
  id: 1,
  ticketId: 22,
  type: 'opening',
  description: 'Chamado aberto.',
  statusAfter: 'open',
  isVisibleToRequester: true,
  minutesSpent: null,
  authorName: 'Ana Souza',
  createdBy: null,
  createdAt: '2026-09-23T12:00:00.000Z',
  attachments: [],
};

function mountModel(id = 22): TicketDetailModel {
  let model!: TicketDetailModel;
  render(Harness, { props: { id, onReady: (ready: TicketDetailModel) => (model = ready) } });

  return model;
}

const failedNotice: WhatsappNotice = {
  id: 9,
  kind: 'ticket_ready',
  status: 'failed',
  attempts: 9,
  failureReason: 'not_connected',
  createdAt: '2026-09-23T12:00:00.000Z',
  sentAt: null,
};

describe('toNoticeResult', () => {
  // feliz
  /* Na fila é o caminho feliz: não oferece o link manual por cima. */
  it('treats a queued notice as on its way', () => {
    expect(toNoticeResult({ outcome: 'queued' }, 'Suporte TI')).toEqual({
      isSent: true,
      message: 'Aviso na fila: sai pelo WhatsApp de Suporte TI em instantes.',
    });
  });

  // triste
  it('tells why the notice did not even enter the queue', () => {
    expect(toNoticeResult({ outcome: 'not_linked' }, 'Suporte TI')).toEqual({
      isSent: false,
      message: 'O responsável ainda não vinculou o WhatsApp.',
    });
  });
});

describe('hasQueuedNotice', () => {
  // feliz
  it('keeps refreshing while a notice is in the queue', () => {
    expect(hasQueuedNotice([{ ...failedNotice, status: 'pending' }])).toBe(true);
  });

  // triste
  it('stops refreshing when every notice is settled', () => {
    expect(hasQueuedNotice([failedNotice, { ...failedNotice, id: 2, status: 'sent' }])).toBe(false);
    expect(hasQueuedNotice([])).toBe(false);
  });
});

describe('ownFilesOf', () => {
  // feliz
  it('keeps the files of the ticket itself', () => {
    expect(ownFilesOf([attachment({ id: 1 })]).map((file) => file.id)).toEqual([1]);
  });

  // triste
  /* O arquivo de um histórico aparece DENTRO dele, na linha do tempo: mostrá-lo também na
     lista do chamado seria o mesmo arquivo duas vezes na tela. */
  it('leaves out the files that came with a history', () => {
    const files = [attachment({ id: 1 }), attachment({ id: 2, historyId: 31 })];

    expect(ownFilesOf(files).map((file) => file.id)).toEqual([1]);
  });
});

describe('buildNotice', () => {
  // feliz
  it('writes the notice with the protocol and the stage in words', () => {
    const link = buildNotice(ticket());

    expect(decodeURIComponent(link ?? '')).toContain(
      'Seu chamado CH-0022 está: Aguardando terceiro.',
    );
  });

  // triste
  /* Ter o telefone no chamado não é autorização para usá-lo. */
  it('builds no notice for who did not ask to be told', () => {
    expect(buildNotice(ticket({ notifyWhatsapp: false }))).toBeNull();
  });
});

describe('useTicketDetailModel', () => {
  beforeEach(() => {
    vi.mocked(ticketsApi.findById).mockReset();
    vi.mocked(ticketsApi.findById).mockResolvedValue(ticket());
    vi.mocked(ticketsApi.histories).mockResolvedValue([opening]);
    vi.mocked(ticketsApi.attachments).mockResolvedValue([
      attachment({ id: 1 }),
      attachment({ id: 2, historyId: 31, origin: 'support' }),
    ]);
    vi.mocked(ticketsApi.removeAttachment).mockReset();
    vi.mocked(ticketsApi.removeAttachment).mockResolvedValue(undefined);
    vi.mocked(ticketsApi.serviceOrder).mockReset();
    vi.mocked(triggerBrowserDownload).mockReset();
    vi.mocked(ticketsApi.whatsappNotices).mockResolvedValue([failedNotice]);
    vi.mocked(ticketsApi.retryWhatsappNotice).mockReset();
    vi.mocked(ticketsApi.retryWhatsappNotice).mockResolvedValue({
      ...failedNotice,
      status: 'pending',
    });
  });

  // feliz
  it('loads the WhatsApp notices and puts a stopped one back in the queue', async () => {
    const model = mountModel();

    await waitFor(() => expect(model.data.notices).toEqual([failedNotice]));
    model.actions.onRetryNotice(failedNotice);

    await waitFor(() => expect(ticketsApi.retryWhatsappNotice).toHaveBeenCalledWith(22, 9));
    await waitFor(() => expect(model.state.retryingNoticeId).toBeNull());
  });

  // triste
  it('tells why a notice could not be sent again', async () => {
    vi.mocked(ticketsApi.retryWhatsappNotice).mockRejectedValue(
      new ApiError(409, 'Este aviso não pode ser reenviado: ele está na fila ou já saiu.'),
    );
    const model = mountModel();

    await waitFor(() => expect(model.data.notices).toHaveLength(1));
    model.actions.onRetryNotice(failedNotice);

    await waitFor(() =>
      expect(model.state.noticeError).toBe(
        'Este aviso não pode ser reenviado: ele está na fila ou já saiu.',
      ),
    );
  });

  // feliz
  it('loads the ticket, its timeline and its own files', async () => {
    const model = mountModel();

    expect(model.state.isLoading).toBe(true);

    await waitFor(() => expect(model.data.ticket?.protocol).toBe('CH-0022'));
    await waitFor(() => expect(model.data.histories).toHaveLength(1));
    await waitFor(() => expect(model.data.attachments.map((file) => file.id)).toEqual([1]));
    expect(model.data.whatsAppLink).not.toBeNull();
  });

  it('downloads the service order as a file', async () => {
    const blob = new Blob(['%PDF']);
    vi.mocked(ticketsApi.serviceOrder).mockResolvedValue({
      blob,
      fileName: 'ordem-de-servico-CH-0022.pdf',
    });
    const model = mountModel();

    model.actions.onDownloadServiceOrder();

    await waitFor(() =>
      expect(triggerBrowserDownload).toHaveBeenCalledWith(blob, 'ordem-de-servico-CH-0022.pdf'),
    );
    await waitFor(() => expect(model.state.isDownloadingServiceOrder).toBe(false));
  });

  it('removes a file and marks only its own row as busy', async () => {
    const model = mountModel();
    await waitFor(() => expect(model.data.attachments).toHaveLength(1));

    model.actions.onRemoveAttachment(attachment({ id: 1 }));

    expect(model.state.removingAttachmentId).toBe(1);
    await waitFor(() => expect(ticketsApi.removeAttachment).toHaveBeenCalledWith(22, 1));
    await waitFor(() => expect(model.state.removingAttachmentId).toBeNull());
  });

  // triste
  /* "Não existe" é resposta, não falha do site: a tela diz que não achou, sem vermelho. */
  it('says the ticket is missing instead of showing a failure', async () => {
    vi.mocked(ticketsApi.findById).mockRejectedValue(new ApiError(404, 'Chamado não encontrado.'));
    const model = mountModel(999);

    await waitFor(() => expect(model.state.isMissing).toBe(true));
    expect(model.state.error).toBeNull();
    expect(model.data.ticket).toBeNull();
  });

  it('shows why the ticket could not be opened when the person has no cargo in its area', async () => {
    vi.mocked(ticketsApi.findById).mockRejectedValue(
      new ApiError(403, 'Você não tem cargo em Infra nem nas áreas participantes deste chamado.'),
    );
    const model = mountModel();

    await waitFor(() => expect(model.state.error).toMatch(/não tem cargo/));
    expect(model.state.isMissing).toBe(false);
  });

  it('says why the service order could not be generated', async () => {
    vi.mocked(ticketsApi.serviceOrder).mockRejectedValue(
      new ApiError(500, 'Falha ao gerar o PDF.'),
    );
    const model = mountModel();

    model.actions.onDownloadServiceOrder();

    await waitFor(() => expect(model.state.serviceOrderError).toBe('Falha ao gerar o PDF.'));
    expect(triggerBrowserDownload).not.toHaveBeenCalled();
    expect(model.state.isDownloadingServiceOrder).toBe(false);
  });

  it('says why a file could not be removed', async () => {
    vi.mocked(ticketsApi.removeAttachment).mockRejectedValue(
      new ApiError(403, 'Este arquivo é de quem abriu o chamado.'),
    );
    const model = mountModel();

    model.actions.onRemoveAttachment(attachment({ id: 1 }));

    await waitFor(() =>
      expect(model.state.attachmentError).toBe('Este arquivo é de quem abriu o chamado.'),
    );
  });
});
