import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type Env } from '../../../lib/config/env.schema';
import { type StorageService } from '../../../lib/storage/storage.service';
import { type TicketHistoriesRepository } from '../repository/ticket-histories.repository';
import { type TicketsRepository, type TicketWithComputer } from '../repository/tickets.repository';
import { TicketAccessService } from './ticket-access.service';
import { type TicketAssigneesService } from './ticket-assignees.service';
import { type TicketAttachmentsService } from './ticket-attachments.service';
import { type TicketHistoriesService } from './ticket-histories.service';
import { signTicketInvite } from './ticket-invite.util';
import { type TicketWhatsappNotifierService } from './ticket-whatsapp-notifier.service';
import { TicketsService } from './tickets.service';

/* O responsável de um chamado: escolhido na abertura, trocado pelo super admin, e o convite
   que chega pelo WhatsApp. Fica num arquivo à parte do `tickets.service.test` porque monta o
   serviço com as duas dependências que só estes caminhos usam. */

const SECRET = 's'.repeat(40);
const NOW = 1_800_000_000;

const superAdmin: RequestUser = {
  id: 'u-root',
  email: 'root@exemplo.com',
  name: 'Root',
  role: 'superadmin',
};
const admin: RequestUser = {
  id: 'u-ana',
  email: 'ana@exemplo.com',
  name: 'Ana Lima',
  role: 'admin',
};

const input = {
  requesterName: 'Bia Costa',
  area: 'infra' as const,
  department: 'financeiro' as const,
  problemType: 'printer' as const,
  contactPhone: '62999990002',
  description: 'A impressora não puxa papel.',
};

function row(overrides: Partial<TicketWithComputer> = {}): TicketWithComputer {
  return {
    id: 7,
    status: 'open',
    priority: 'medium',
    requesterName: 'Bia Costa',
    area: 'infra',
    department: 'financeiro',
    problemType: 'printer',
    anydeskId: null,
    contactPhone: '62999990002',
    notifyWhatsapp: true,
    description: 'A impressora não puxa papel.',
    screenshotKey: null,
    computerId: null,
    computerName: null,
    projectId: null,
    projectName: null,
    githubIssueNumber: null,
    githubIssueUrl: null,
    assignee: null,
    assigneeId: null,
    solution: null,
    createdAt: new Date('2026-10-10T12:00:00.000Z'),
    startedAt: null,
    resolvedAt: null,
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  } as TicketWithComputer;
}

function makeService(
  options: { attends?: boolean; areas?: string[]; roles?: Record<string, string> } = {},
) {
  const current = row();
  const repository = {
    insert: vi.fn(async (values: Partial<TicketWithComputer>) => row(values)),
    update: vi.fn(async (_id: number, values: Partial<TicketWithComputer>) => row(values)),
    findById: vi.fn().mockResolvedValue(current),
    listAreasOf: vi.fn().mockResolvedValue([]),
    listAreasFor: vi.fn().mockResolvedValue(new Map()),
    contextRolesFor: vi
      .fn()
      .mockResolvedValue(
        options.roles ?? { infra: 'admin', sistema: 'admin', manutencao: 'admin' },
      ),
  };
  const assignees = {
    resolve: vi
      .fn()
      .mockResolvedValue(options.attends === false ? null : { id: 'u-ana', name: 'Ana Lima' }),
    listForArea: vi.fn().mockResolvedValue([{ id: 'u-ana', name: 'Ana Lima' }]),
    areasOf: vi.fn().mockResolvedValue({ name: 'Ana Lima', areas: options.areas ?? ['infra'] }),
  };
  const notifier = {
    opened: vi.fn().mockResolvedValue('sent'),
    ready: vi.fn().mockResolvedValue('sent'),
  };
  const tickets = repository as unknown as TicketsRepository;
  const service = new TicketsService(
    tickets,
    { upload: vi.fn(), createDownloadUrl: vi.fn() } as unknown as StorageService,
    { attach: vi.fn().mockResolvedValue([]) } as unknown as TicketAttachmentsService,
    new TicketAccessService(tickets),
    { recordOpening: vi.fn().mockResolvedValue(undefined) } as unknown as TicketHistoriesService,
    { record: vi.fn().mockResolvedValue({}) } as unknown as TicketHistoriesRepository,
    undefined,
    undefined,
    assignees as unknown as TicketAssigneesService,
    notifier as unknown as TicketWhatsappNotifierService,
    { BOT_API_TOKEN: SECRET } as Env,
  );

  return { service, repository, assignees, notifier };
}

describe('TicketsService.create with a chosen assignee', () => {
  // feliz
  /* O NOME vem do cadastro de quem atende, nunca do corpo: só o id é aceito de fora. */
  it('records the chosen person as assignee, by the name on file, and announces the opening', async () => {
    const { service, repository, assignees, notifier } = makeService();

    const ticket = await service.create({ ...input, assigneeId: 'u-ana' });

    expect(assignees.resolve).toHaveBeenCalledWith('infra', 'u-ana');
    expect(repository.insert.mock.calls[0]?.[0]).toMatchObject({
      assignee: 'Ana Lima',
      assigneeId: 'u-ana',
    });
    expect(ticket.assigneeId).toBe('u-ana');
    expect(notifier.opened).toHaveBeenCalledOnce();
  });

  it('opens without an assignee when nobody was chosen', async () => {
    const { service, repository, assignees } = makeService();

    await service.create(input);

    expect(assignees.resolve).not.toHaveBeenCalled();
    expect(repository.insert.mock.calls[0]?.[0]).toMatchObject({
      assignee: null,
      assigneeId: null,
    });
  });

  it('skips the opening notice when asked to', async () => {
    const { service, notifier } = makeService();

    await service.create({ ...input, assigneeId: 'u-ana' }, undefined, [], {
      skipOpeningNotice: true,
    });

    expect(notifier.opened).not.toHaveBeenCalled();
  });

  // triste
  /* O id vem de uma tela pública: quem não atende a área não vira responsável só por pedir. */
  it('refuses a chosen person who does not attend the area, and creates nothing', async () => {
    const { service, repository } = makeService({ attends: false });

    await expect(service.create({ ...input, assigneeId: 'u-outro' })).rejects.toThrow(
      UnprocessableEntityException,
    );
    expect(repository.insert).not.toHaveBeenCalled();
  });
});

describe('TicketsService.update of the assignee', () => {
  // feliz
  it('lets the super admin hand the ticket to someone who attends the area', async () => {
    const { service, repository } = makeService();

    await service.update(superAdmin, 7, { assigneeId: 'u-ana' });

    expect(repository.update.mock.calls[0]?.[1]).toMatchObject({
      assignee: 'Ana Lima',
      assigneeId: 'u-ana',
    });
  });

  // triste
  /* Escalada de privilégio: admin comum não escolhe o responsável — nem a si mesmo. */
  it('refuses an admin who tries to change the assignee', async () => {
    const { service, repository } = makeService();

    await expect(service.update(admin, 7, { assigneeId: 'u-ana' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('refuses a new assignee who does not attend the area', async () => {
    const { service, repository } = makeService({ attends: false });

    await expect(service.update(superAdmin, 7, { assigneeId: 'u-outro' })).rejects.toThrow(
      UnprocessableEntityException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('leaves the assignee alone when the edit does not mention it', async () => {
    const { service, repository, assignees } = makeService();

    await service.update(admin, 7, { priority: 'high' });

    expect(assignees.resolve).not.toHaveBeenCalled();
    expect(repository.update.mock.calls[0]?.[1]).not.toHaveProperty('assigneeId');
  });
});

describe('TicketsService.readInvite', () => {
  const token = signTicketInvite(
    { assigneeId: 'u-ana', phone: '5562999990002', expiresAt: NOW + 1800 },
    SECRET,
  );

  // feliz
  it('tells who the attendant is, the areas and the phone carried by the link', async () => {
    const { service } = makeService({ areas: ['infra', 'manutencao'] });

    expect(await service.readInvite(token, NOW)).toEqual({
      assignee: { id: 'u-ana', name: 'Ana Lima' },
      areas: ['infra', 'manutencao'],
      phone: '5562999990002',
    });
  });

  // triste
  it('refuses a link that expired or was tampered with', async () => {
    const { service } = makeService();

    await expect(service.readInvite(token, NOW + 1801)).rejects.toThrow(NotFoundException);
    await expect(service.readInvite(`${token}x`, NOW)).rejects.toThrow(NotFoundException);
    await expect(service.readInvite('lixo', NOW)).rejects.toThrow(NotFoundException);
  });

  /* Quem mandou o link deixou de atender: o convite deixa de valer junto. */
  it('refuses a link of someone who no longer attends any area', async () => {
    const { service } = makeService({ areas: [] });

    await expect(service.readInvite(token, NOW)).rejects.toThrow(NotFoundException);
  });
});

describe('TicketsService.notifyReady', () => {
  // feliz
  it('hands back how the notice went', async () => {
    const { service, notifier } = makeService();

    expect(await service.notifyReady(admin, 7)).toEqual({ outcome: 'sent' });
    expect(notifier.ready).toHaveBeenCalledOnce();
  });

  // triste
  /* Quem só consulta a área não dispara mensagem pelo número de ninguém. */
  it('refuses who can only read the area of the ticket', async () => {
    const { service, notifier } = makeService({ roles: { infra: 'user' } });
    const regular: RequestUser = { id: 'u-x', email: 'x@exemplo.com', name: 'X', role: 'user' };

    await expect(service.notifyReady(regular, 7)).rejects.toThrow(ForbiddenException);
    expect(notifier.ready).not.toHaveBeenCalled();
  });
});
