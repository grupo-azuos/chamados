import { type TicketFormValues } from '@template/shared/schemas/ticket.schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./http-client', () => ({
  apiRequest: vi.fn().mockResolvedValue(undefined),
  apiDownload: vi.fn().mockResolvedValue(undefined),
  uploadFile: vi.fn(async (_path: string, file: File) => ({
    storageKey: `tmp/${file.name}`,
    fileName: file.name,
  })),
}));

const { apiDownload, apiRequest, uploadFile } = await import('./http-client');
const { ticketsApi } = await import('./tickets.api');

const FORM: TicketFormValues = {
  requesterName: 'Marta',
  area: 'infra',
  department: 'RECEPÇÃO',
  problemType: 'printer',
  priority: 'medium',
  contactPhone: '62999990001',
  description: 'A impressora não puxa papel.',
  notifyWhatsapp: false,
  anydeskId: '',
  projectId: '',
  customSystemName: '',
  assigneeId: '',
  watcherIds: [],
} as unknown as TicketFormValues;

const file = (name: string) => new File(['x'], name, { type: 'application/pdf' });

describe('ticketsApi', () => {
  beforeEach(() => vi.clearAllMocks());

  // feliz
  it('sends every filter of the queue to the server, the machine included', async () => {
    await ticketsApi.list({ page: 2, pageSize: 50, computerId: 7, statusGroup: 'waiting' });

    expect(apiRequest).toHaveBeenCalledWith('/tickets', {
      query: expect.objectContaining({ page: 2, pageSize: 50, computerId: 7, statusGroup: 'waiting' }),
    });
  });

  it('sends the same filters to the report, without the page', async () => {
    await ticketsApi.exportReport({ page: 3, area: 'sistema', projectId: 2 }, 'pdf');

    expect(apiDownload).toHaveBeenCalledWith('/tickets/export', {
      query: expect.objectContaining({ format: 'pdf', area: 'sistema', projectId: 2 }),
    });
    expect(vi.mocked(apiDownload).mock.calls[0]?.[1]?.query).not.toHaveProperty('page');
  });

  it('uploads the screenshot and the attachments before opening the ticket', async () => {
    await ticketsApi.create(FORM, file('print.png'), [file('nota.pdf')]);

    expect(uploadFile).toHaveBeenCalledTimes(2);
    expect(apiRequest).toHaveBeenCalledWith('/tickets', {
      method: 'POST',
      body: expect.objectContaining({
        requesterName: 'Marta',
        /* Vazio não vai: o servidor lê ausência, e não texto em branco. */
        anydeskId: undefined,
        projectId: undefined,
        assigneeId: undefined,
        watcherIds: [],
        screenshot: { storageKey: 'tmp/print.png', fileName: 'print.png' },
        attachments: [{ storageKey: 'tmp/nota.pdf', fileName: 'nota.pdf' }],
      }),
    });
  });

  it('opens a ticket without files, keeping what was filled', async () => {
    await ticketsApi.create(
      { ...FORM, anydeskId: '123 456 789', projectId: '4', assigneeId: 'u-1', watcherIds: ['u-2'] },
      null,
    );

    expect(uploadFile).not.toHaveBeenCalled();
    expect(apiRequest).toHaveBeenCalledWith('/tickets', {
      method: 'POST',
      body: expect.objectContaining({
        anydeskId: '123 456 789',
        projectId: '4',
        assigneeId: 'u-1',
        watcherIds: ['u-2'],
        screenshot: undefined,
        attachments: [],
      }),
    });
  });

  it('attaches files to an open ticket through the link of who attends', async () => {
    await ticketsApi.attach(9, [file('a.pdf')]);

    expect(uploadFile).toHaveBeenCalledWith('/tickets/9/attachments/upload-url', expect.any(File));
    expect(apiRequest).toHaveBeenCalledWith('/tickets/9/attachments', {
      method: 'POST',
      body: { attachments: [{ storageKey: 'tmp/a.pdf', fileName: 'a.pdf' }] },
    });
  });

  it('writes a history with its files and the minutes trimmed', async () => {
    await ticketsApi.createHistory(
      9,
      {
        type: 'start',
        description: 'Começando.',
        isVisibleToRequester: true,
        minutesSpent: ' 15 ',
        notifyUserIds: ['u-2'],
      } as never,
      [file('log.txt')],
    );

    expect(apiRequest).toHaveBeenCalledWith('/tickets/9/histories', {
      method: 'POST',
      body: expect.objectContaining({
        type: 'start',
        minutesSpent: '15',
        notifyUserIds: ['u-2'],
        attachments: [{ storageKey: 'tmp/log.txt', fileName: 'log.txt' }],
      }),
    });
  });

  it('lets the requester reply through the opening link', async () => {
    await ticketsApi.createRequesterHistory(
      9,
      'requester_reply',
      { description: 'Ainda não resolveu.', notifyUserIds: [] } as never,
      [file('foto.png')],
    );

    expect(uploadFile).toHaveBeenCalledWith('/tickets/upload-url', expect.any(File));
    expect(apiRequest).toHaveBeenCalledWith('/tickets/9/requester-histories', {
      method: 'POST',
      body: expect.objectContaining({ type: 'requester_reply', attachments: [expect.any(Object)] }),
    });
  });

  it('translates every other intention into its route', async () => {
    const calls: [() => Promise<unknown>, string, Record<string, unknown> | undefined][] = [
      [() => ticketsApi.findByAccessToken('a/b'), '/tickets/access/a%2Fb', undefined],
      [() => ticketsApi.requesterDefaults(), '/tickets/requester-defaults', undefined],
      [() => ticketsApi.mine(), '/tickets/mine', undefined],
      [() => ticketsApi.invite('t'), '/tickets/invites/t', undefined],
      [() => ticketsApi.assigneeOptions('infra'), '/tickets/assignee-options', { query: { area: 'infra' } }],
      [() => ticketsApi.notifyReady(1), '/tickets/1/whatsapp-notice', { method: 'POST' }],
      [() => ticketsApi.whatsappNotices(1), '/tickets/1/whatsapp-notices', undefined],
      [() => ticketsApi.retryWhatsappNotice(1, 2), '/tickets/1/whatsapp-notices/2/retry', { method: 'POST' }],
      [() => ticketsApi.systemProjectOptions(), '/tickets/system-project-options', undefined],
      [() => ticketsApi.dashboard('infra'), '/tickets/dashboard', { query: { area: 'infra' } }],
      [() => ticketsApi.myAreas(), '/tickets/areas/mine', undefined],
      [() => ticketsApi.findById(1), '/tickets/1', undefined],
      [() => ticketsApi.update(1, { priority: 'high' }), '/tickets/1', { method: 'PATCH', body: { priority: 'high' } }],
      [() => ticketsApi.addArea(1, 'sistema'), '/tickets/1/areas', { method: 'POST', body: { area: 'sistema' } }],
      [() => ticketsApi.removeArea(1, 'sistema'), '/tickets/1/areas/sistema', { method: 'DELETE' }],
      [() => ticketsApi.attachments(1), '/tickets/1/attachments', undefined],
      [() => ticketsApi.removeAttachment(1, 2), '/tickets/1/attachments/2', { method: 'DELETE' }],
      [() => ticketsApi.histories(1), '/tickets/1/histories', undefined],
      [() => ticketsApi.peopleOptions(), '/tickets/people-options', undefined],
      [() => ticketsApi.people(1), '/tickets/1/people', undefined],
      [() => ticketsApi.updateWatchers(1, ['u']), '/tickets/1/watchers', { method: 'PUT', body: { userIds: ['u'] } }],
      [() => ticketsApi.verifyServiceOrder('ab cd'), '/service-orders/ab%20cd', undefined],
      [() => ticketsApi.findByProtocol('CH-0001'), '/tickets/protocol/CH-0001', undefined],
    ];

    for (const [call, path, options] of calls) {
      vi.mocked(apiRequest).mockClear();
      await call();
      if (options) expect(apiRequest).toHaveBeenCalledWith(path, options);
      else expect(apiRequest).toHaveBeenCalledWith(path);
    }

    await ticketsApi.serviceOrder(1);
    expect(apiDownload).toHaveBeenCalledWith('/tickets/1/service-order', { method: 'POST' });
  });
});
