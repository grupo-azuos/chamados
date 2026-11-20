import { Inject, Injectable } from '@nestjs/common';
import { type SoftwareScheduleQuery } from '@template/shared/schemas/software-schedule.schema';
import { and, asc, eq, gte, lte } from 'drizzle-orm';

import { archivedCondition, archiveValues } from '../../../lib/db/archive.util';
import { runMaybe, runOne, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { softwareProjects } from '../../../lib/db/schema/software-projects.schema';
import {
  softwareScheduleEvents,
  type SoftwareScheduleEventInsert,
  type SoftwareScheduleEventRow,
} from '../../../lib/db/schema/software-schedule-events.schema';

export type ScheduleEventWithProject = SoftwareScheduleEventRow & {
  projectName?: string | null;
};

@Injectable()
export class SoftwareScheduleRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async listBetween(query: SoftwareScheduleQuery): Promise<ScheduleEventWithProject[]> {
    return runQuery(
      this.db
        .select({
          id: softwareScheduleEvents.id,
          projectId: softwareScheduleEvents.projectId,
          kind: softwareScheduleEvents.kind,
          title: softwareScheduleEvents.title,
          category: softwareScheduleEvents.category,
          color: softwareScheduleEvents.color,
          date: softwareScheduleEvents.date,
          startTime: softwareScheduleEvents.startTime,
          endTime: softwareScheduleEvents.endTime,
          note: softwareScheduleEvents.note,
          createdAt: softwareScheduleEvents.createdAt,
          createdBy: softwareScheduleEvents.createdBy,
          createdById: softwareScheduleEvents.createdById,
          createdByName: softwareScheduleEvents.createdByName,
          updatedAt: softwareScheduleEvents.updatedAt,
          updatedBy: softwareScheduleEvents.updatedBy,
          archivedAt: softwareScheduleEvents.archivedAt,
          archivedBy: softwareScheduleEvents.archivedBy,
          projectName: softwareProjects.name,
        })
        .from(softwareScheduleEvents)
        .leftJoin(softwareProjects, eq(softwareProjects.id, softwareScheduleEvents.projectId))
        .where(
          and(
            gte(softwareScheduleEvents.date, query.startDate),
            lte(softwareScheduleEvents.date, query.endDate),
            archivedCondition(softwareScheduleEvents.archivedAt, query.archived),
          ),
        )
        .orderBy(asc(softwareScheduleEvents.date), asc(softwareScheduleEvents.startTime)),
      'listar compromissos do cronograma',
    );
  }

  async findById(id: number): Promise<ScheduleEventWithProject | null> {
    return runMaybe(
      this.db
        .select({
          id: softwareScheduleEvents.id,
          projectId: softwareScheduleEvents.projectId,
          kind: softwareScheduleEvents.kind,
          title: softwareScheduleEvents.title,
          category: softwareScheduleEvents.category,
          color: softwareScheduleEvents.color,
          date: softwareScheduleEvents.date,
          startTime: softwareScheduleEvents.startTime,
          endTime: softwareScheduleEvents.endTime,
          note: softwareScheduleEvents.note,
          createdAt: softwareScheduleEvents.createdAt,
          createdBy: softwareScheduleEvents.createdBy,
          createdById: softwareScheduleEvents.createdById,
          createdByName: softwareScheduleEvents.createdByName,
          updatedAt: softwareScheduleEvents.updatedAt,
          updatedBy: softwareScheduleEvents.updatedBy,
          archivedAt: softwareScheduleEvents.archivedAt,
          archivedBy: softwareScheduleEvents.archivedBy,
          projectName: softwareProjects.name,
        })
        .from(softwareScheduleEvents)
        .leftJoin(softwareProjects, eq(softwareProjects.id, softwareScheduleEvents.projectId))
        .where(eq(softwareScheduleEvents.id, id))
        .limit(1),
      'buscar compromisso do cronograma por id',
    );
  }

  async insert(data: SoftwareScheduleEventInsert): Promise<SoftwareScheduleEventRow> {
    return runOne(
      this.db.insert(softwareScheduleEvents).values(data).returning(),
      'adicionar compromisso no cronograma',
    );
  }

  async update(id: number, data: Partial<SoftwareScheduleEventInsert>): Promise<SoftwareScheduleEventRow> {
    return runOne(
      this.db
        .update(softwareScheduleEvents)
        .set(data)
        .where(eq(softwareScheduleEvents.id, id))
        .returning(),
      'atualizar compromisso no cronograma',
    );
  }

  /** Arquiva (excluir) ou desarquiva (desfazer). O item nunca sai do banco. */
  async setArchived(id: number, archived: boolean, actorId: string | null): Promise<void> {
    await runQuery(
      this.db
        .update(softwareScheduleEvents)
        .set(archiveValues(archived, actorId))
        .where(eq(softwareScheduleEvents.id, id)),
      archived ? 'arquivar compromisso do cronograma' : 'desarquivar compromisso do cronograma',
    );
  }
}
