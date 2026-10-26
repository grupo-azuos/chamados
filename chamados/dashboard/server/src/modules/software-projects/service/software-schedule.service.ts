import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { canChangeScheduleEvent } from '@template/shared/domain/system-access.util';
import {
  SCHEDULE_END_TIME_REQUIRED,
  type CreateSoftwareScheduleEventInput,
  type SoftwareScheduleEvent,
  type SoftwareScheduleQuery,
  type UpdateSoftwareScheduleEventInput,
} from '@template/shared/schemas/software-schedule.schema';

import { type SoftwareScheduleEventInsert } from '../../../lib/db/schema/software-schedule-events.schema';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { setIfDefined } from '../../../lib/db/partial-update.util';
import { assertCanEditSystem, assertCanRead } from '../../../lib/policy/policy-assert.util';
import { toSoftwareScheduleEvent } from '../mapper/software-projects.mapper';
import { SoftwareScheduleRepository } from '../repository/software-schedule.repository';

export const SCHEDULE_EVENT_NOT_FOUND = 'Item da agenda não encontrado.';
export const SCHEDULE_EVENT_NOT_YOURS =
  'Só quem lançou este item na agenda (ou o Super Administrador) pode alterá-lo ou excluí-lo.';

/**
 * O fim que fica gravado depois da alteração. O registro nunca tem fim — trocar um compromisso
 * para registro apaga o fim. O compromisso sempre tem: o que veio, ou o que já estava gravado.
 */
function resolveEndTime(
  input: UpdateSoftwareScheduleEventInput,
  current: SoftwareScheduleEvent,
): string | null {
  const kind = input.kind ?? current.kind;
  if (kind === 'record') return null;

  const endTime = input.endTime === undefined ? current.endTime : input.endTime;
  if (!endTime) throw new BadRequestException(SCHEDULE_END_TIME_REQUIRED);

  return endTime;
}

function buildScheduleEventUpdate(
  input: UpdateSoftwareScheduleEventInput,
  current: SoftwareScheduleEvent,
  actorEmail: string,
): Partial<SoftwareScheduleEventInsert> {
  const update: Partial<SoftwareScheduleEventInsert> = {
    updatedAt: new Date(),
    updatedBy: actorEmail,
    endTime: resolveEndTime(input, current),
  };

  setIfDefined(update, 'kind', input.kind);
  setIfDefined(update, 'projectId', input.projectId);
  setIfDefined(update, 'title', input.title?.trim());
  setIfDefined(update, 'category', input.category);
  setIfDefined(update, 'color', input.color);
  setIfDefined(update, 'date', input.date);
  setIfDefined(update, 'startTime', input.startTime);
  if (input.note !== undefined) {
    update.note = input.note?.trim() ? input.note.trim() : null;
  }

  return update;
}

@Injectable()
export class SoftwareScheduleService {
  constructor(private readonly repository: SoftwareScheduleRepository) {}

  async list(user: RequestUser, query: SoftwareScheduleQuery): Promise<SoftwareScheduleEvent[]> {
    assertCanRead(user.role, 'o cronograma de sistemas');

    const rows = await this.repository.listBetween(query.startDate, query.endDate);
    return rows.map((row) => toSoftwareScheduleEvent(row, row.projectName ?? undefined));
  }

  async findById(user: RequestUser, id: number): Promise<SoftwareScheduleEvent> {
    assertCanRead(user.role, 'o cronograma de sistemas');

    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundException(SCHEDULE_EVENT_NOT_FOUND);

    return toSoftwareScheduleEvent(row, row.projectName ?? undefined);
  }

  async create(
    user: RequestUser,
    input: CreateSoftwareScheduleEventInput,
  ): Promise<SoftwareScheduleEvent> {
    assertCanEditSystem(user, 'agendar no cronograma');

    const row = await this.repository.insert({
      kind: input.kind,
      projectId: input.projectId ?? null,
      title: input.title,
      category: input.category,
      color: input.color,
      date: input.date,
      startTime: input.startTime,
      /* O registro marca só o momento: um fim que venha junto é descartado. */
      endTime: input.kind === 'record' ? null : (input.endTime ?? null),
      note: input.note ?? null,
      /* Autoria vem da identidade, nunca do corpo. */
      createdBy: user.email,
      createdById: user.id,
      createdByName: user.name,
    });

    return toSoftwareScheduleEvent(row);
  }

  async update(
    user: RequestUser,
    id: number,
    input: UpdateSoftwareScheduleEventInput,
  ): Promise<SoftwareScheduleEvent> {
    assertCanEditSystem(user, 'alterar agendamento do cronograma');

    const current = await this.findOwnedOrRefuse(user, id);

    const updatePayload = buildScheduleEventUpdate(input, current, user.email);
    const row = await this.repository.update(id, updatePayload);

    return toSoftwareScheduleEvent(row);
  }

  async remove(user: RequestUser, id: number): Promise<void> {
    assertCanEditSystem(user, 'excluir agendamento do cronograma');

    await this.findOwnedOrRefuse(user, id);
    await this.repository.remove(id);
  }

  /** O agendamento, se existe e se esta pessoa pode mexer nele (quem marcou ou Super Admin). */
  private async findOwnedOrRefuse(user: RequestUser, id: number): Promise<SoftwareScheduleEvent> {
    const event = await this.findById(user, id);
    if (!canChangeScheduleEvent(user, event)) throw new ForbiddenException(SCHEDULE_EVENT_NOT_YOURS);

    return event;
  }
}
