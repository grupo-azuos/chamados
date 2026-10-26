import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type SoftwareScheduleEventRow } from '../../../lib/db/schema/software-schedule-events.schema';
import { type SoftwareScheduleRepository } from '../repository/software-schedule.repository';
import { SCHEDULE_EVENT_NOT_YOURS, SoftwareScheduleService } from './software-schedule.service';

const ana: RequestUser = {
  id: 'u-ana',
  email: 'ana@empresa.com.br',
  name: 'Ana Lima',
  role: 'admin',
  roles: { infra: 'user', sistema: 'admin', manutencao: 'user' },
};
const bia: RequestUser = { ...ana, id: 'u-bia', email: 'bia@empresa.com.br', name: 'Bia Souza' };
const root: RequestUser = { id: 'u-root', email: 'root@empresa.com.br', name: 'Root', role: 'superadmin' };

function eventRow(overrides: Partial<SoftwareScheduleEventRow> = {}) {
  return {
    id: 1,
    projectId: null,
    projectName: null,
    kind: 'appointment',
    title: 'Deploy do Paralegal',
    category: 'deploy',
    color: 'blue',
    date: '2026-10-20',
    startTime: '09:00',
    endTime: '10:00',
    note: null,
    createdAt: new Date('2026-10-18T12:00:00Z'),
    createdBy: 'ana@empresa.com.br',
    createdById: 'u-ana',
    createdByName: 'Ana Lima',
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  } as SoftwareScheduleEventRow & { projectName: string | null };
}

function makeService(row = eventRow()) {
  const repository = {
    findById: vi.fn().mockResolvedValue(row),
    insert: vi.fn().mockImplementation(async (values) => ({ ...eventRow(), ...values })),
    update: vi.fn().mockResolvedValue(row),
    remove: vi.fn().mockResolvedValue(undefined),
    listBetween: vi.fn().mockResolvedValue([row]),
  } as unknown as SoftwareScheduleRepository;

  return { service: new SoftwareScheduleService(repository), repository };
}

const input = {
  kind: 'appointment' as const,
  title: 'Revisão',
  category: 'review' as const,
  color: 'green' as const,
  date: '2026-10-21',
  startTime: '14:00',
  endTime: '15:00',
};

describe('SoftwareScheduleService', () => {
  // feliz
  it('stamps who marked the event from the identity, never from the body', async () => {
    const { service, repository } = makeService();

    await service.create(ana, { ...input, createdBy: 'outra@empresa.com.br' } as never);

    expect(vi.mocked(repository.insert).mock.calls[0]?.[0]).toMatchObject({
      createdBy: 'ana@empresa.com.br',
      createdById: 'u-ana',
      createdByName: 'Ana Lima',
    });
  });

  // feliz
  it('shows who marked it, with the e-mail for events from before the name existed', async () => {
    const { service } = makeService(eventRow({ createdById: null, createdByName: null }));

    const [event] = await service.list(ana, { startDate: '2026-10-01', endDate: '2026-10-31' });

    expect(event).toMatchObject({ createdByName: 'ana@empresa.com.br', createdById: null });
  });

  // feliz
  it('lets whoever marked it, and the super administrator, change and delete it', async () => {
    const { service, repository } = makeService();

    await service.update(ana, 1, { title: 'Deploy adiado' });
    await service.remove(root, 1);

    expect(repository.update).toHaveBeenCalledOnce();
    expect(repository.remove).toHaveBeenCalledWith(1);
  });

  // triste
  it('refuses another Sistema admin changing or deleting it, without writing', async () => {
    const { service, repository } = makeService();

    await expect(service.update(bia, 1, { title: 'Meu agora' })).rejects.toThrow(
      new ForbiddenException(SCHEDULE_EVENT_NOT_YOURS),
    );
    await expect(service.remove(bia, 1)).rejects.toThrow(ForbiddenException);
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.remove).not.toHaveBeenCalled();
  });

  // triste
  it('says the event was not found before talking about who owns it', async () => {
    const { service, repository } = makeService();
    vi.mocked(repository.findById).mockResolvedValue(null);

    await expect(service.remove(bia, 99)).rejects.toThrow(NotFoundException);
  });

  // feliz
  it('records something done with only the moment it happened, dropping any end time', async () => {
    const { service, repository } = makeService();

    await service.create(ana, { ...input, kind: 'record', title: 'Sistema enviado para revisão' });

    expect(vi.mocked(repository.insert).mock.calls[0]?.[0]).toMatchObject({
      kind: 'record',
      startTime: '14:00',
      endTime: null,
    });
  });

  // feliz
  it('clears the end time when an appointment becomes a record', async () => {
    const { service, repository } = makeService();

    await service.update(ana, 1, { kind: 'record' });

    expect(vi.mocked(repository.update).mock.calls[0]?.[1]).toMatchObject({
      kind: 'record',
      endTime: null,
    });
  });

  // triste
  it('refuses turning a record into an appointment without an end time', async () => {
    const { service, repository } = makeService(eventRow({ kind: 'record', endTime: null }));

    await expect(service.update(ana, 1, { kind: 'appointment' })).rejects.toThrow(
      BadRequestException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  // triste
  it('refuses another person changing a record, the same as an appointment', async () => {
    const { service, repository } = makeService(eventRow({ kind: 'record', endTime: null }));

    await expect(service.update(bia, 1, { title: 'Meu agora' })).rejects.toThrow(
      new ForbiddenException(SCHEDULE_EVENT_NOT_YOURS),
    );
    expect(repository.update).not.toHaveBeenCalled();
  });
});
