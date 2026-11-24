import { Inject, Injectable } from '@nestjs/common';
import { RUNNING_TICKET_STATUSES } from '@template/shared/domain/ticket-status.util';
import { type SoftwareProjectListQuery } from '@template/shared/schemas/software-project.schema';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  type SQL,
  sql,
} from 'drizzle-orm';
import { type AnyPgColumn } from 'drizzle-orm/pg-core';

import { archivedCondition, archiveValues } from '../../../lib/db/archive.util';
import { runMaybe, runOne, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import {
  softwareProjects,
  type SoftwareProjectInsert,
  type SoftwareProjectRow,
} from '../../../lib/db/schema/software-projects.schema';
import { softwareTimelineEvents } from '../../../lib/db/schema/software-timeline-events.schema';
import { tasks } from '../../../lib/db/schema/tasks.schema';
import { tickets } from '../../../lib/db/schema/tickets.schema';

export type SoftwareProjectPage = {
  rows: SoftwareProjectRow[];
  total: number;
};

/** O recorte do mapa: o período (dias inclusos) e a pessoa (o id e a conta do GitHub dela). */
export type ProjectMapFilter = {
  from?: string;
  to?: string;
  personId?: string;
  personLogin?: string | null;
};

const DAY_START = (day: string) => new Date(`${day}T00:00:00-03:00`);
const DAY_END = (day: string) => new Date(`${day}T23:59:59.999-03:00`);

function periodOf(column: AnyPgColumn, filter: ProjectMapFilter): SQL[] {
  return [
    ...(filter.from ? [gte(column, DAY_START(filter.from))] : []),
    ...(filter.to ? [lte(column, DAY_END(filter.to))] : []),
  ];
}

/** Do GitHub, o que a pessoa abriu ou fez (pela conta dela); sem conta vinculada, nada. */
function eventFilters(filter: ProjectMapFilter): SQL[] {
  const person = filter.personId
    ? [
        filter.personLogin
          ? sql`lower(${softwareTimelineEvents.author}) = lower(${filter.personLogin})`
          : sql`false`,
      ]
    : [];

  return [...periodOf(softwareTimelineEvents.eventDate, filter), ...person];
}

function ticketFilters(filter: ProjectMapFilter): SQL[] {
  return [
    ...periodOf(tickets.createdAt, filter),
    ...(filter.personId ? [eq(tickets.assigneeId, filter.personId)] : []),
  ];
}

/** A tarefa que toca o período (do início ao prazo) e que é da pessoa. */
function taskFilters(filter: ProjectMapFilter): SQL[] {
  return [
    ...(filter.to ? [lte(tasks.startDate, filter.to)] : []),
    ...(filter.from ? [gte(sql`coalesce(${tasks.dueDate}, ${tasks.startDate})`, filter.from)] : []),
    ...(filter.personId ? [eq(tasks.ownerId, filter.personId)] : []),
  ];
}

@Injectable()
export class SoftwareProjectsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /**
   * Os fatos do mapa dos projetos: os sistemas (os escolhidos, ou todos os em uso), os eventos do
   * GitHub de cada um, os chamados deles e as tarefas que nasceram desses chamados.
   */
  async mapFacts(ids: number[] | null, filter: ProjectMapFilter = {}) {
    const projects = await runQuery(
      this.db
        .select()
        .from(softwareProjects)
        .where(
          and(
            isNull(softwareProjects.archivedAt),
            ids ? inArray(softwareProjects.id, ids) : undefined,
          ),
        )
        .orderBy(asc(softwareProjects.name)),
      'ler os sistemas do mapa',
    );
    const projectIds = projects.map((project) => project.id);
    if (!projectIds.length) return { projects, events: [], tickets: [], tasks: [] };
    const [events, projectTickets] = await Promise.all([
      runQuery(
        this.db
          .select()
          .from(softwareTimelineEvents)
          .where(
            and(inArray(softwareTimelineEvents.projectId, projectIds), ...eventFilters(filter)),
          )
          .orderBy(desc(softwareTimelineEvents.eventDate), desc(softwareTimelineEvents.id)),
        'ler os eventos dos sistemas',
      ),
      runQuery(
        this.db
          .select({
            id: tickets.id,
            projectId: tickets.projectId,
            status: tickets.status,
            description: tickets.description,
            githubIssueNumber: tickets.githubIssueNumber,
            resolvedAt: tickets.resolvedAt,
          })
          .from(tickets)
          .where(and(inArray(tickets.projectId, projectIds), ...ticketFilters(filter)))
          .orderBy(desc(tickets.id)),
        'ler os chamados dos sistemas',
      ),
    ]);
    const ticketIds = projectTickets.map((ticket) => ticket.id);
    const ticketTasks = ticketIds.length
      ? await runQuery(
          this.db
            .select({
              id: tasks.id,
              title: tasks.title,
              status: tasks.status,
              ticketId: tasks.ticketId,
            })
            .from(tasks)
            .where(and(inArray(tasks.ticketId, ticketIds), ...taskFilters(filter))),
          'ler as tarefas dos chamados dos sistemas',
        )
      : [];

    return { projects, events, tickets: projectTickets, tasks: ticketTasks };
  }

  /** `drill`: o recorte de um clique no painel, já em SQL — mais uma condição E do filtro. */
  async list(query: SoftwareProjectListQuery, drill?: SQL): Promise<SoftwareProjectPage> {
    const where = and(this.buildWhere(query), drill);
    const offset = (query.page - 1) * query.pageSize;

    const [rows, [counted]] = await Promise.all([
      runQuery(
        this.db
          .select()
          .from(softwareProjects)
          .where(where)
          .orderBy(desc(softwareProjects.createdAt), desc(softwareProjects.id))
          .limit(query.pageSize)
          .offset(offset),
        'listar sistemas',
      ),
      runQuery(
        this.db.select({ total: count() }).from(softwareProjects).where(where),
        'contar sistemas',
      ),
    ]);

    return { rows, total: counted?.total ?? rows.length };
  }

  async listAll(): Promise<SoftwareProjectRow[]> {
    return runQuery(
      this.db
        .select()
        .from(softwareProjects)
        .where(isNull(softwareProjects.archivedAt))
        .orderBy(desc(softwareProjects.createdAt)),
      'listar todos os sistemas',
    );
  }

  /** Projetos que podem receber chamados públicos e virar issues no GitHub. */
  async listTicketOptions(): Promise<{ id: number; name: string }[]> {
    return runQuery(
      this.db
        .select({ id: softwareProjects.id, name: softwareProjects.name })
        .from(softwareProjects)
        .where(
          and(
            inArray(softwareProjects.status, ['active', 'maintenance']),
            isNotNull(softwareProjects.githubRepoOwner),
            isNotNull(softwareProjects.githubRepoName),
            isNull(softwareProjects.archivedAt),
          ),
        )
        .orderBy(asc(softwareProjects.name)),
      'listar sistemas para abertura de chamado',
    );
  }

  async isTicketOption(id: number): Promise<boolean> {
    const [project] = await runQuery(
      this.db
        .select({ id: softwareProjects.id })
        .from(softwareProjects)
        .where(
          and(
            eq(softwareProjects.id, id),
            inArray(softwareProjects.status, ['active', 'maintenance']),
            isNotNull(softwareProjects.githubRepoOwner),
            isNotNull(softwareProjects.githubRepoName),
            isNull(softwareProjects.archivedAt),
          ),
        )
        .limit(1),
      'validar sistema do chamado',
    );

    return Boolean(project);
  }

  async findById(id: number): Promise<SoftwareProjectRow | null> {
    return runMaybe(
      this.db.select().from(softwareProjects).where(eq(softwareProjects.id, id)).limit(1),
      'buscar sistema por id',
    );
  }

  async insert(data: SoftwareProjectInsert): Promise<SoftwareProjectRow> {
    return runOne(this.db.insert(softwareProjects).values(data).returning(), 'cadastrar sistema');
  }

  async update(id: number, data: Partial<SoftwareProjectInsert>): Promise<SoftwareProjectRow> {
    return runOne(
      this.db.update(softwareProjects).set(data).where(eq(softwareProjects.id, id)).returning(),
      'atualizar sistema',
    );
  }

  /** Arquiva (excluir) ou desarquiva (desfazer). O sistema, a linha do tempo e os chamados
   *  ficam. */
  async setArchived(id: number, archived: boolean, actorId: string | null): Promise<void> {
    await runQuery(
      this.db
        .update(softwareProjects)
        .set(archiveValues(archived, actorId))
        .where(eq(softwareProjects.id, id)),
      archived ? 'arquivar sistema' : 'desarquivar sistema',
    );
  }

  async countOpenTicketsByProject(projectIds: number[]): Promise<Record<number, number>> {
    if (projectIds.length === 0) return {};

    const rows = await runQuery(
      this.db
        .select({
          projectId: tickets.projectId,
          total: count(),
        })
        .from(tickets)
        .where(
          and(
            inArray(tickets.projectId, projectIds),
            /* Do catálogo: um estágio novo em andamento entra sozinho na conta. */
            inArray(tickets.status, [...RUNNING_TICKET_STATUSES]),
          ),
        )
        .groupBy(tickets.projectId),
      'contar chamados abertos por projeto',
    );

    const counts: Record<number, number> = {};
    for (const row of rows) {
      if (row.projectId !== null) {
        counts[row.projectId] = Number(row.total);
      }
    }
    return counts;
  }

  async countPullRequestsByProject(projectIds: number[]): Promise<Record<number, number>> {
    if (projectIds.length === 0) return {};

    const rows = await runQuery(
      this.db
        .select({
          projectId: softwareTimelineEvents.projectId,
          total: count(),
        })
        .from(softwareTimelineEvents)
        .where(
          and(
            inArray(softwareTimelineEvents.projectId, projectIds),
            eq(softwareTimelineEvents.type, 'pr'),
          ),
        )
        .groupBy(softwareTimelineEvents.projectId),
      'contar PRs por projeto',
    );

    const counts: Record<number, number> = {};
    for (const row of rows) {
      counts[row.projectId] = Number(row.total);
    }
    return counts;
  }

  private buildWhere(query: SoftwareProjectListQuery): SQL | undefined {
    const filters: (SQL | undefined)[] = [
      archivedCondition(softwareProjects.archivedAt, query.archived),
    ];

    if (query.status) {
      filters.push(eq(softwareProjects.status, query.status));
    }

    if (query.search) {
      const term = `%${query.search}%`;
      filters.push(
        or(
          ilike(softwareProjects.name, term),
          ilike(softwareProjects.description, term),
          ilike(softwareProjects.repositoryUrl, term),
        ),
      );
    }

    return filters.length > 0 ? and(...filters) : undefined;
  }
}
