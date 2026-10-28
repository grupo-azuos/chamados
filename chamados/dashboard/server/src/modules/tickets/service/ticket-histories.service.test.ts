import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { type ManualTicketHistoryType } from '@template/shared/domain/ticket-history.util';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type TicketHistoryRow } from '../../../lib/db/schema/ticket-histories.schema';
import { type TicketHistoriesRepository } from '../repository/ticket-histories.repository';
import { type TicketsRepository, type TicketWithComputer } from '../repository/tickets.repository';
import { TicketAccessService } from './ticket-access.service';
import { type TicketAttachmentsService } from './ticket-attachments.service';
import { type GithubService } from '../../software-projects/service/github.service';
import { issueCommentOf, TicketHistoriesService } from './ticket-histories.service';

const ana: RequestUser = { id: '1', email: 'ana@azuos.com.br', name: 'Ana Lima', role: 'user' };
const noRole = { ...ana, role: undefined } as unknown as RequestUser;

const CREATED_AT = new Date('2026-03-01T08:00:00.000Z');

function ticketRow(overrides: Partial<TicketWithComputer> = {}): TicketWithComputer {
  return {
    id: 7,
    status: 'in_progress',
    priority: 'medium',
    requesterId: null,
    requesterEmail: null,
    requesterName: 'Bia Costa',
    area: 'infra',
    department: 'financeiro',
    computerId: null,
    projectId: null,
    customSystemName: null,
    githubIssueNumber: null,
    githubIssueUrl: null,
    computerName: null,
    problemType: 'printer',
    anydeskId: null,
    contactPhone: '62999999999',
    notifyWhatsapp: false,
    description: 'A impressora não puxa papel.',
    screenshotKey: null,
    assignee: 'Ana Lima',
    assigneeId: null,
    solution: null,
    createdAt: CREATED_AT,
    startedAt: CREATED_AT,
    resolvedAt: null,
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

function historyRow(overrides: Partial<TicketHistoryRow> = {}): TicketHistoryRow {
  return {
    id: 31,
    ticketId: 7,
    type: 'note',
    description: 'Liguei para o fornecedor.',
    statusAfter: 'in_progress',
    isVisibleToRequester: true,
    minutesSpent: null,
    authorName: 'Ana Lima',
    createdBy: ana.email,
    createdAt: CREATED_AT,
    ...overrides,
  };
}

const entry = (type: ManualTicketHistoryType, description = 'Troquei o rolete.') => ({
  type,
  description,
  isVisibleToRequester: true,
});

type Setup = {
  ticket?: TicketWithComputer | null;
  /** O cargo de Ana em cada área. O padrão é ADMINISTRAR Infra: pode tudo no chamado. */
  roles?: Record<string, string>;
  record?: ReturnType<typeof vi.fn>;
  listByTicket?: ReturnType<typeof vi.fn>;
  attachments?: Partial<TicketAttachmentsService>;
  github?: { mirrorTicketToIssueInBackground: ReturnType<typeof vi.fn> };
};

function setup({
  ticket = ticketRow(),
  roles = { infra: 'admin' },
  record = vi.fn().mockImplementation(async (history) => historyRow(history)),
  listByTicket = vi.fn().mockResolvedValue([]),
  attachments = {},
  github = { mirrorTicketToIssueInBackground: vi.fn() },
}: Setup = {}) {
  const tickets = {
    findById: vi.fn().mockResolvedValue(ticket),
    listAreasOf: vi.fn().mockResolvedValue([]),
  } as unknown as TicketsRepository;

  const attachmentsStub = {
    accept: vi.fn().mockImplementation((files: unknown[]) => Promise.resolve(files)),
    store: vi.fn().mockResolvedValue([]),
    list: vi.fn().mockResolvedValue([]),
    ...attachments,
  };

  const service = new TicketHistoriesService(
    { record, listByTicket } as unknown as TicketHistoriesRepository,
    new TicketAccessService(tickets),
    attachmentsStub as unknown as TicketAttachmentsService,
    github as unknown as GithubService,
  );

  return {
    actor: { ...ana, roles } as RequestUser,
    service,
    record,
    listByTicket,
    attachments: attachmentsStub,
    github,
  };
}

describe('TicketHistoriesService.create', () => {
  // feliz
  it('records the history and moves the ticket in the same step', async () => {
    const { actor, service, record } = setup();

    const history = await service.create(actor, 7, entry('waiting_third_party', 'Pedi a fonte.'));

    expect(history.statusAfter).toBe('waiting_third_party');
    expect(record.mock.calls[0]?.[0]).toMatchObject({
      ticketId: 7,
      type: 'waiting_third_party',
      authorName: 'Ana Lima',
      createdBy: ana.email,
    });
    expect(record.mock.calls[0]?.[1]).toMatchObject({
      status: 'waiting_third_party',
      updatedBy: ana.email,
    });
  });

  it('closes the ticket with a closing history, keeping what was done', async () => {
    const { actor, service, record } = setup();

    await service.create(actor, 7, entry('resolution'));

    expect(record.mock.calls[0]?.[1]).toMatchObject({
      status: 'resolved',
      solution: 'Troquei o rolete.',
    });
    expect(record.mock.calls[0]?.[1].resolvedAt).toBeInstanceOf(Date);
  });

  it('attaches the files to the history it just recorded, on the support side', async () => {
    const file = {
      storageKey: 'tmp/00000000-0000-4000-8000-000000000001.pdf',
      fileName: 'nota.pdf',
    };
    const { actor, service, attachments } = setup();

    await service.create(actor, 7, entry('note'), [file]);

    /* Histórico novo não tem nada anexado: a cota dele começa vazia. */
    expect(attachments.accept).toHaveBeenCalledWith([file], []);
    expect(attachments.store).toHaveBeenCalledWith(7, [file], {
      author: ana.email,
      origin: 'support',
      historyId: 31,
    });
  });

  it('lets an admin of the area contribute with a history that does not close', async () => {
    const { actor, service } = setup({ roles: { infra: 'admin' } });

    await expect(service.create(actor, 7, entry('waiting_requester'))).resolves.toMatchObject({
      statusAfter: 'waiting_requester',
    });
  });

  it('lets an admin reopen a closed ticket', async () => {
    const { actor, service, record } = setup({ ticket: ticketRow({ status: 'resolved' }) });

    await service.create(actor, 7, entry('reopening', 'Voltou a falhar.'));

    expect(record.mock.calls[0]?.[1]).toMatchObject({ status: 'in_progress', solution: null });
  });

  // triste
  it('refuses an unidentified request without touching the repository', async () => {
    const { service, record } = setup();

    await expect(service.create(noRole, 7, entry('note'))).rejects.toThrow(ForbiddenException);
    expect(record).not.toHaveBeenCalled();
  });

  it('does not write when the ticket does not exist', async () => {
    const { actor, service, record } = setup({ ticket: null });

    await expect(service.create(actor, 99, entry('note'))).rejects.toThrow(NotFoundException);
    expect(record).not.toHaveBeenCalled();
  });

  it('refuses a "user" cargo to record anything at all', async () => {
    const { actor, service, record } = setup({ roles: { infra: 'user' } });

    await expect(service.create(actor, 7, entry('note'))).rejects.toThrow(ForbiddenException);
    expect(record).not.toHaveBeenCalled();
  });

  it('refuses someone with no cargo in any area of the ticket', async () => {
    const { actor, service, record } = setup({ roles: { manutencao: 'admin' } });

    await expect(service.create(actor, 7, entry('note'))).rejects.toThrow(ForbiddenException);
    expect(record).not.toHaveBeenCalled();
  });

  /* Gestor contribui, mas NUNCA encerra — tirar um chamado da fila é exclusivo de quem
     administra a área (#13). Vale para TODO tipo que encerra, inclusive os que vierem. */
  it.each(['resolution', 'closure_with_caveats', 'cancellation'] as const)(
    'refuses who only reads the area to close a ticket with %s',
    async (type) => {
      const { actor, service, record } = setup({ roles: { infra: 'user' } });

      await expect(service.create(actor, 7, entry(type))).rejects.toThrow(ForbiddenException);
      expect(record).not.toHaveBeenCalled();
    },
  );

  /* Reabrir desfaz um encerramento: pede o mesmo cargo de quem encerra. */
  it('refuses who only reads the area to reopen a closed ticket', async () => {
    const { actor, service, record } = setup({
      ticket: ticketRow({ status: 'resolved' }),
      roles: { infra: 'user' },
    });

    await expect(service.create(actor, 7, entry('reopening'))).rejects.toThrow(ForbiddenException);
    expect(record).not.toHaveBeenCalled();
  });

  it('refuses a history that does not fit the stage, with the reason from the domain', async () => {
    const { actor, service, record } = setup({ ticket: ticketRow({ status: 'resolved' }) });

    await expect(service.create(actor, 7, entry('note'))).rejects.toThrow(
      UnprocessableEntityException,
    );
    await expect(service.create(actor, 7, entry('note'))).rejects.toThrow(/Reabra-o/);
    expect(record).not.toHaveBeenCalled();
  });

  /* Recusar o arquivo DEPOIS de gravar deixaria na linha do tempo um "segue a nota em anexo"
     sem anexo nenhum. */
  it('records nothing when a file is out of the rules', async () => {
    const { actor, service, record } = setup({
      attachments: {
        accept: vi.fn().mockRejectedValue(new BadRequestException('Arquivo grande demais.')),
      },
    });

    await expect(service.create(actor, 7, entry('note'))).rejects.toThrow(BadRequestException);
    expect(record).not.toHaveBeenCalled();
  });
});

describe('TicketHistoriesService.create — the GitHub issue', () => {
  const systemTicket = ticketRow({ area: 'sistema', projectId: 3, githubIssueNumber: 12 });

  // feliz
  it('comments every history on the issue, and closes it when the ticket closes', async () => {
    const { actor, service, github } = setup({
      ticket: systemTicket,
      roles: { sistema: 'admin' },
    });

    await service.create(actor, 7, entry('resolution', 'Corrigi a consulta.'));

    expect(github.mirrorTicketToIssueInBackground).toHaveBeenCalledWith(systemTicket, {
      comment: expect.stringContaining('Corrigi a consulta.'),
      state: 'closed',
    });
  });

  it('only comments when the history does not cross the closing line', async () => {
    const { actor, service, github } = setup({
      ticket: systemTicket,
      roles: { sistema: 'admin' },
    });

    await service.create(actor, 7, entry('waiting_third_party', 'Aguardando o banco.'));

    expect(github.mirrorTicketToIssueInBackground).toHaveBeenCalledWith(systemTicket, {
      comment: expect.stringContaining('Ana Lima'),
      state: undefined,
    });
  });

  // triste
  it('touches no issue when the history is refused', async () => {
    const { actor, service, github } = setup({
      ticket: systemTicket,
      roles: { sistema: 'user' },
    });

    await expect(service.create(actor, 7, entry('note'))).rejects.toBeInstanceOf(ForbiddenException);
    expect(github.mirrorTicketToIssueInBackground).not.toHaveBeenCalled();
  });
});

describe('issueCommentOf', () => {
  // feliz
  it('says what was recorded, by whom, and the text', () => {
    expect(issueCommentOf(entry('note', 'Testei em produção.'), 'Ana Lima')).toMatch(
      /^\*\*.+\*\* — Ana Lima\n\nTestei em produção\.$/,
    );
  });

  // triste
  it('keeps only the header when the text is blank', () => {
    expect(issueCommentOf(entry('note', '   '), 'Ana Lima')).not.toContain('\n');
  });
});

describe('TicketHistoriesService.list', () => {
  // feliz
  it('gives the timeline with each history carrying its own files', async () => {
    const { actor, service } = setup({
      listByTicket: vi.fn().mockResolvedValue([historyRow({ id: 31 }), historyRow({ id: 32 })]),
      attachments: {
        list: vi.fn().mockResolvedValue([
          { id: 1, historyId: 32 },
          { id: 2, historyId: null },
        ]),
      },
    });

    const timeline = await service.list(actor, 7);

    expect(timeline.map((history) => history.attachments.length)).toEqual([0, 1]);
  });

  // triste
  it('refuses to show the timeline of a ticket from an area the person has no cargo in', async () => {
    const { actor, service, listByTicket } = setup({ roles: { sistema: 'admin' } });

    await expect(service.list(actor, 7)).rejects.toThrow(ForbiddenException);
    expect(listByTicket).not.toHaveBeenCalled();
  });

  it('refuses an unidentified request', async () => {
    const { service } = setup();

    await expect(service.list(noRole, 7)).rejects.toThrow(ForbiddenException);
  });
});

describe('TicketHistoriesService.listPublic', () => {
  // feliz
  it('asks the database only for what the requester may see', async () => {
    const { service, listByTicket } = setup({
      listByTicket: vi.fn().mockResolvedValue([historyRow()]),
    });

    const timeline = await service.listPublic(7, []);

    expect(listByTicket).toHaveBeenCalledWith(7, { visibleToRequesterOnly: true });
    expect(timeline).toHaveLength(1);
  });

  // triste
  it('never exposes who wrote it nor the time spent', async () => {
    const { service } = setup({
      listByTicket: vi.fn().mockResolvedValue([historyRow({ minutesSpent: 40 })]),
    });

    const [history] = await service.listPublic(7, []);

    expect(history).not.toHaveProperty('createdBy');
    expect(history).not.toHaveProperty('minutesSpent');
  });
});

describe('TicketHistoriesService.createByRequester', () => {
  const bia: RequestUser = { id: 'bia-id', email: 'bia@azuos.com.br', name: 'Bia Costa', role: 'user' };

  function requesterSetup(options: {
    ticket?: TicketWithComputer | null;
    watchers?: { id: string; name: string }[];
    update?: ReturnType<typeof vi.fn>;
  } = {}) {
    const ticket = options.ticket === undefined ? ticketRow({ requesterId: bia.id }) : options.ticket;
    const tickets = {
      findById: vi.fn().mockResolvedValue(ticket),
      listAreasOf: vi.fn().mockResolvedValue([]),
    } as unknown as TicketsRepository;
    const record = vi.fn().mockImplementation(async (history) => historyRow(history));
    const watchers = options.watchers ?? [];
    const people = {
      watchersOf: vi.fn().mockResolvedValue(watchers),
      canReply: (row: TicketWithComputer, list: { id: string }[], userId: string) =>
        row.requesterId === userId || list.some((watcher) => watcher.id === userId),
      notifiableOf: () => [
        { id: 'ana-id', name: 'Ana Lima' },
        ...watchers.filter((watcher) => watcher.id !== bia.id),
      ],
    };
    const update = options.update ?? vi.fn().mockResolvedValue([]);
    const attachments = {
      accept: vi.fn().mockImplementation((files: unknown[]) => Promise.resolve(files)),
      store: vi.fn().mockResolvedValue([]),
    };

    const service = new TicketHistoriesService(
      { record } as unknown as TicketHistoriesRepository,
      new TicketAccessService(tickets),
      attachments as unknown as TicketAttachmentsService,
      undefined,
      people as never,
      { update } as never,
      tickets,
    );

    return { service, record, update, attachments };
  }

  // feliz
  it('records the reply, moves the ticket to "requester reply" and keeps the assignee', async () => {
    const { service, record } = requesterSetup({ ticket: ticketRow({ requesterId: bia.id, assignee: null }) });

    const saved = await service.createByRequester(bia, 7, {
      type: 'requester_reply',
      description: 'Segue o print do erro de novo.',
    });

    const [history, move] = record.mock.calls[0] ?? [];
    expect(history).toMatchObject({ type: 'requester_reply', statusAfter: 'requester_reply', authorName: 'Bia Costa' });
    expect(move).toMatchObject({ status: 'requester_reply' });
    /* Quem pede respondendo não "pega" o próprio chamado. */
    expect(move).not.toHaveProperty('assignee');
    expect(saved).not.toHaveProperty('createdBy');
  });

  // feliz
  it('lets a linked person reopen a closed ticket', async () => {
    const { service, record } = requesterSetup({
      ticket: ticketRow({ requesterId: 'someone-else', status: 'resolved' }),
      watchers: [{ id: bia.id, name: 'Bia Costa' }],
    });

    await service.createByRequester(bia, 7, { type: 'requester_reopening', description: 'Voltou a travar.' });

    expect(record.mock.calls[0]?.[1]).toMatchObject({ status: 'requester_reply', solution: null });
  });

  // feliz
  it('notifies only the chosen people who belong to the ticket', async () => {
    const { service, update } = requesterSetup();

    await service.createByRequester(bia, 7, {
      type: 'requester_reply',
      description: 'Já testei de novo.',
      notifyUserIds: ['ana-id', 'stranger-id'],
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      expect.objectContaining({ authorId: bia.id, statusAfter: 'requester_reply' }),
      [{ id: 'ana-id', name: 'Ana Lima' }],
    );
  });

  // triste
  it('answers 404 to someone who neither opened nor is linked', async () => {
    const { service, record } = requesterSetup({ ticket: ticketRow({ requesterId: 'someone-else' }) });

    await expect(
      service.createByRequester(bia, 7, { type: 'requester_reply', description: 'Oi' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(record).not.toHaveBeenCalled();
  });

  // triste
  it('refuses a reply on a closed ticket: it has to be reopened', async () => {
    const { service, record } = requesterSetup({
      ticket: ticketRow({ requesterId: bia.id, status: 'cancelled' }),
    });

    await expect(
      service.createByRequester(bia, 7, { type: 'requester_reply', description: 'Oi' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(record).not.toHaveBeenCalled();
  });

  // triste
  it('does not notify anyone when nobody was chosen', async () => {
    const { service, update } = requesterSetup();

    await service.createByRequester(bia, 7, { type: 'requester_reply', description: 'Oi' });

    expect(update).not.toHaveBeenCalled();
  });
});
