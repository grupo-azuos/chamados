import { Inject, Injectable } from '@nestjs/common';
import { type TaskListQuery } from '@template/shared/schemas/task.schema';
import { type TaskLinkKind } from '@template/shared/domain/task-flow.util';
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  isNull,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database, type DatabaseExecutor } from '../../../lib/db/db.type';
import { computers } from '../../../lib/db/schema/computers.schema';
import { history, type HistoryRow } from '../../../lib/db/schema/history.schema';
import { inventoryItems } from '../../../lib/db/schema/inventory-items.schema';
import { maintenanceSchedules } from '../../../lib/db/schema/maintenance-schedules.schema';
import { maintenances } from '../../../lib/db/schema/maintenances.schema';
import { parts } from '../../../lib/db/schema/parts.schema';
import {
  type TaskInsert,
  type TaskLinkRow,
  taskLinks,
  type TaskPersonRow,
  taskPeople,
  type TaskRow,
  type TaskStepRow,
  taskSteps,
  tasks,
  taskStages,
  type TaskStageRow,
} from '../../../lib/db/schema/tasks.schema';
import { tickets } from '../../../lib/db/schema/tickets.schema';

/** O dia de hoje no relógio do escritório, no SQL — o mesmo de `brasiliaClock`. */
const TODAY = sql`(now() at time zone 'America/Sao_Paulo')::date`;

export type TaskRelations = {
  /** A situação própria em que a tarefa está (`null`: a coluna fixa dela). */
  stage: TaskStageRow | null;
  steps: TaskStepRow[];
  links: (TaskLinkRow & { label: string | null })[];
  people: TaskPersonRow[];
};

export type TaskWithRelations = TaskRow & TaskRelations;

/** A máquina que pode pedir tarefa de manutenção: agendamento em aberto e última preventiva. */
export type MaintenanceCandidate = {
  computerId: number;
  computerName: string;
  responsibleId: string | null;
  scheduledFor: string | null;
  scheduleNote: string | null;
  lastPreventiveAt: Date | null;
};

/** A linha do tempo mostra as últimas mudanças; o Histórico inteiro mora na tela dele. */
const HISTORY_LIMIT = 100;

@Injectable()
export class TasksRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async list(
    query: TaskListQuery,
    viewerId: string,
  ): Promise<{ items: TaskWithRelations[]; total: number; overdue: number; dueSoon: number }> {
    const where = and(...this.filtersOf(query, viewerId));
    const offset = (query.page - 1) * query.pageSize;

    const [rows, [totals]] = await Promise.all([
      runQuery(
        this.db
          .select()
          .from(tasks)
          .where(where)
          /* Aberta antes de finalizada; dentro de cada, o prazo mais perto primeiro. */
          .orderBy(
            sql`(${tasks.status} = 'done')`,
            sql`${tasks.dueDate} asc nulls last`,
            desc(tasks.updatedAt),
          )
          .limit(query.pageSize)
          .offset(offset),
        'listar tarefas',
      ),
      runQuery(
        this.db
          .select({
            total: count(),
            overdue: sql<number>`count(*) filter (where ${tasks.status} <> 'done' and ${tasks.dueDate} < ${TODAY})::int`,
            dueSoon: sql<number>`count(*) filter (where ${tasks.status} <> 'done' and ${tasks.dueDate} between ${TODAY} and ${TODAY} + 7)::int`,
          })
          .from(tasks)
          .where(where),
        'contar tarefas',
      ),
    ]);

    return {
      items: await this.withRelations(rows),
      total: totals?.total ?? 0,
      overdue: totals?.overdue ?? 0,
      dueSoon: totals?.dueSoon ?? 0,
    };
  }

  /** A linha do tempo da tarefa: o que o Histórico gravou sobre ela, da mais nova para a mais velha. */
  async historyOf(id: number): Promise<HistoryRow[]> {
    return runQuery(
      this.db
        .select()
        .from(history)
        .where(and(eq(history.targetType, 'tasks'), eq(history.targetId, String(id))))
        .orderBy(desc(history.occurredAt), desc(history.id))
        .limit(HISTORY_LIMIT),
      'ler a linha do tempo da tarefa',
    );
  }

  async findById(id: number): Promise<TaskWithRelations | null> {
    const row = await runMaybe(
      this.db.select().from(tasks).where(eq(tasks.id, id)).limit(1),
      'ler tarefa',
    );
    if (!row) return null;
    const [full] = await this.withRelations([row]);

    return full ?? null;
  }

  async insert(
    task: TaskInsert,
    extras: {
      steps: readonly string[];
      links: readonly { kind: TaskLinkKind; targetId: number }[];
      peopleIds: readonly string[];
    },
    executor: DatabaseExecutor = this.db,
  ): Promise<TaskRow> {
    const [row] = await runQuery(executor.insert(tasks).values(task).returning(), 'gravar tarefa');
    if (!row) throw new Error('A tarefa não foi gravada.');

    if (extras.steps.length) {
      await runQuery(
        executor
          .insert(taskSteps)
          .values(extras.steps.map((label, position) => ({ taskId: row.id, label, position }))),
        'gravar etapas da tarefa',
      );
    }
    await this.addLinks(row.id, extras.links, task.createdBy, executor);
    await this.replacePeople(row.id, extras.peopleIds, executor);

    return row;
  }

  async update(
    id: number,
    change: Partial<TaskInsert>,
    executor: DatabaseExecutor = this.db,
  ): Promise<void> {
    await runQuery(
      executor
        .update(tasks)
        .set({ ...change, updatedAt: new Date() })
        .where(eq(tasks.id, id)),
      'alterar tarefa',
    );
  }

  async remove(id: number): Promise<void> {
    await runQuery(this.db.delete(tasks).where(eq(tasks.id, id)), 'apagar tarefa');
  }

  async replacePeople(
    taskId: number,
    personIds: readonly string[],
    executor: DatabaseExecutor = this.db,
  ): Promise<void> {
    await runQuery(
      executor.delete(taskPeople).where(eq(taskPeople.taskId, taskId)),
      'limpar participantes',
    );
    if (!personIds.length) return;
    await runQuery(
      executor.insert(taskPeople).values(personIds.map((personId) => ({ taskId, personId }))),
      'gravar participantes',
    );
  }

  /**
   * Regrava o checklist mantendo as etapas que já existem (pelo `id`) — e com elas o "feito por
   * quem e quando". Etapa que sumiu da lista é apagada.
   */
  async saveSteps(
    taskId: number,
    steps: readonly { id?: number; label: string }[],
    executor: DatabaseExecutor = this.db,
  ): Promise<void> {
    const keep = steps.flatMap((step) => (step.id ? [step.id] : []));
    await runQuery(
      executor.delete(taskSteps).where(
        and(
          eq(taskSteps.taskId, taskId),
          keep.length
            ? sql`${taskSteps.id} not in (${sql.join(
                keep.map((id) => sql`${id}`),
                sql`, `,
              )})`
            : undefined,
        ),
      ),
      'apagar etapas',
    );
    for (const [position, step] of steps.entries()) {
      if (step.id) {
        await runQuery(
          executor
            .update(taskSteps)
            .set({ label: step.label, position })
            .where(and(eq(taskSteps.id, step.id), eq(taskSteps.taskId, taskId))),
          'alterar etapa',
        );
      } else {
        await runQuery(
          executor.insert(taskSteps).values({ taskId, label: step.label, position }),
          'gravar etapa',
        );
      }
    }
  }

  async setStepDone(
    taskId: number,
    stepId: number,
    doneBy: string | null,
    executor: DatabaseExecutor = this.db,
  ): Promise<boolean> {
    const result = await runQuery(
      executor
        .update(taskSteps)
        .set(doneBy ? { doneAt: new Date(), doneBy } : { doneAt: null, doneBy: null })
        .where(and(eq(taskSteps.id, stepId), eq(taskSteps.taskId, taskId)))
        .returning({ id: taskSteps.id }),
      'marcar etapa',
    );

    return result.length > 0;
  }

  async stepsOf(taskId: number, executor: DatabaseExecutor = this.db): Promise<TaskStepRow[]> {
    return runQuery(
      executor
        .select()
        .from(taskSteps)
        .where(eq(taskSteps.taskId, taskId))
        .orderBy(asc(taskSteps.position)),
      'ler etapas',
    );
  }

  async addLinks(
    taskId: number,
    links: readonly { kind: TaskLinkKind; targetId: number }[],
    createdBy: string,
    executor: DatabaseExecutor = this.db,
  ): Promise<void> {
    if (!links.length) return;
    await runQuery(
      executor
        .insert(taskLinks)
        .values(links.map((link) => ({ taskId, ...link, createdBy })))
        .onConflictDoNothing(),
      'gravar vínculos da tarefa',
    );
  }

  async removeLink(taskId: number, linkId: number): Promise<boolean> {
    const result = await runQuery(
      this.db
        .delete(taskLinks)
        .where(and(eq(taskLinks.id, linkId), eq(taskLinks.taskId, taskId)))
        .returning({ id: taskLinks.id }),
      'tirar vínculo da tarefa',
    );

    return result.length > 0;
  }

  /** Os alvos que existem de verdade, por tipo — vínculo para o nada não entra. */
  async existingTargets(kind: TaskLinkKind, ids: readonly number[]): Promise<Set<number>> {
    if (!ids.length) return new Set();
    const table = {
      ticket: tickets,
      computer: computers,
      part: parts,
      inventory_item: inventoryItems,
    }[kind];
    const rows = await runQuery(
      this.db
        .select({ id: table.id })
        .from(table)
        .where(inArray(table.id, [...ids])),
      'conferir vínculos da tarefa',
    );

    return new Set(rows.map((row) => row.id));
  }

  // ── Origens automáticas ────────────────────────────────────────────────────────────────────

  async findByTicket(
    ticketId: number,
    executor: DatabaseExecutor = this.db,
  ): Promise<TaskRow | null> {
    return runMaybe(
      executor.select().from(tasks).where(eq(tasks.ticketId, ticketId)).limit(1),
      'tarefa do chamado',
    );
  }

  async findOpenMaintenance(computerId: number): Promise<TaskRow | null> {
    return runMaybe(
      this.db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.origin, 'maintenance'),
            eq(tasks.computerId, computerId),
            sql`${tasks.status} <> 'done'`,
          ),
        )
        .limit(1),
      'tarefa de manutenção da máquina',
    );
  }

  /** As máquinas em uso, com o agendamento em aberto e a última preventiva (ou corretiva). */
  async maintenanceCandidates(computerId?: number): Promise<MaintenanceCandidate[]> {
    const rows = await runQuery(
      this.db
        .select({
          computerId: computers.id,
          computerName: sql<string>`coalesce(${computers.displayName}, ${computers.name})`,
          responsibleId: computers.responsibleId,
          scheduledFor: maintenanceSchedules.scheduledFor,
          scheduleNote: maintenanceSchedules.note,
          lastPreventiveAt: sql<string | null>`(
            select max(m.performed_at) from ${maintenances} m
            where m.computer_id = ${computers.id}
              and m.type in ('preventive', 'corrective')
              and m.archived_at is null
          )`,
        })
        .from(computers)
        .leftJoin(
          maintenanceSchedules,
          and(
            eq(maintenanceSchedules.computerId, computers.id),
            isNull(maintenanceSchedules.archivedAt),
          ),
        )
        .where(
          and(
            eq(computers.isArchived, false),
            isNull(computers.disposedAt),
            computerId ? eq(computers.id, computerId) : undefined,
          ),
        ),
      'máquinas para tarefas de manutenção',
    );

    return rows.map((row) => ({
      ...row,
      lastPreventiveAt: row.lastPreventiveAt ? new Date(row.lastPreventiveAt) : null,
    }));
  }

  // ── Leitura dos vínculos e da página ───────────────────────────────────────────────────────

  private async withRelations(rows: readonly TaskRow[]): Promise<TaskWithRelations[]> {
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id);
    const stageIds = [...new Set(rows.flatMap((row) => (row.stageId ? [row.stageId] : [])))];
    const [stages, steps, links, people] = await Promise.all([
      stageIds.length
        ? runQuery(
            this.db.select().from(taskStages).where(inArray(taskStages.id, stageIds)),
            'ler situações',
          )
        : Promise.resolve([] as TaskStageRow[]),
      runQuery(
        this.db
          .select()
          .from(taskSteps)
          .where(inArray(taskSteps.taskId, ids))
          .orderBy(asc(taskSteps.position)),
        'ler etapas',
      ),
      runQuery(
        this.db
          .select()
          .from(taskLinks)
          .where(inArray(taskLinks.taskId, ids))
          .orderBy(asc(taskLinks.id)),
        'ler vínculos',
      ),
      runQuery(
        this.db.select().from(taskPeople).where(inArray(taskPeople.taskId, ids)),
        'ler participantes',
      ),
    ]);
    const labels = await this.labelsOf(links);

    return rows.map((row) => ({
      ...row,
      stage: stages.find((stage) => stage.id === row.stageId) ?? null,
      steps: steps.filter((step) => step.taskId === row.id),
      links: links
        .filter((link) => link.taskId === row.id)
        .map((link) => ({ ...link, label: labels.get(`${link.kind}:${link.targetId}`) ?? null })),
      people: people.filter((person) => person.taskId === row.id),
    }));
  }

  /** O nome de cada vinculado, lido na hora: "CH-0056", "Computador 02", a peça, o item. */
  private async labelsOf(links: readonly TaskLinkRow[]): Promise<Map<string, string>> {
    const idsOf = (kind: TaskLinkKind) => [
      ...new Set(links.filter((link) => link.kind === kind).map((link) => link.targetId)),
    ];
    const labels = new Map<string, string>();
    const load = async (
      kind: TaskLinkKind,
      query: () => Promise<{ id: number; label: string }[]>,
    ) => {
      if (!idsOf(kind).length) return;
      for (const row of await query()) labels.set(`${kind}:${row.id}`, row.label);
    };

    await Promise.all([
      load('ticket', () =>
        runQuery(
          this.db
            .select({
              id: tickets.id,
              label: sql<string>`'CH-' || lpad(${tickets.id}::text, 4, '0')`,
            })
            .from(tickets)
            .where(inArray(tickets.id, idsOf('ticket'))),
          'nome dos chamados vinculados',
        ),
      ),
      load('computer', () =>
        runQuery(
          this.db
            .select({
              id: computers.id,
              label: sql<string>`coalesce(${computers.displayName}, ${computers.name})`,
            })
            .from(computers)
            .where(inArray(computers.id, idsOf('computer'))),
          'nome dos computadores vinculados',
        ),
      ),
      load('part', () =>
        runQuery(
          this.db
            .select({ id: parts.id, label: parts.name })
            .from(parts)
            .where(inArray(parts.id, idsOf('part'))),
          'nome das peças vinculadas',
        ),
      ),
      load('inventory_item', () =>
        runQuery(
          this.db
            .select({ id: inventoryItems.id, label: inventoryItems.name })
            .from(inventoryItems)
            .where(inArray(inventoryItems.id, idsOf('inventory_item'))),
          'nome dos itens vinculados',
        ),
      ),
    ]);

    return labels;
  }

  private filtersOf(query: TaskListQuery, viewerId: string): SQL[] {
    const filters: SQL[] = [eq(tasks.area, query.area)];
    if (query.status) filters.push(eq(tasks.status, query.status));
    if (query.origin) filters.push(eq(tasks.origin, query.origin));
    if (query.stageId) filters.push(eq(tasks.stageId, query.stageId));
    if (query.ownerId) filters.push(eq(tasks.ownerId, query.ownerId));
    if (query.mine) filters.push(this.mineFilter(viewerId));
    if (query.linkKind && query.linkId) filters.push(this.linkFilter(query.linkKind, query.linkId));

    return [...filters, ...textAndDateFilters(query)];
  }

  /** Dono ou participante. */
  private mineFilter(viewerId: string): SQL {
    return or(
      eq(tasks.ownerId, viewerId),
      exists(
        this.db
          .select({ one: sql`1` })
          .from(taskPeople)
          .where(and(eq(taskPeople.taskId, tasks.id), eq(taskPeople.personId, viewerId))),
      ),
    )!;
  }

  /** Vinculada ao item — ou nascida dele (o chamado da tarefa, a máquina da manutenção). */
  private linkFilter(kind: TaskLinkKind, targetId: number): SQL {
    return or(
      exists(
        this.db
          .select({ one: sql`1` })
          .from(taskLinks)
          .where(
            and(
              eq(taskLinks.taskId, tasks.id),
              eq(taskLinks.kind, kind),
              eq(taskLinks.targetId, targetId),
            ),
          ),
      ),
      kind === 'ticket' ? eq(tasks.ticketId, targetId) : undefined,
      kind === 'computer' ? eq(tasks.computerId, targetId) : undefined,
    )!;
  }
}

function textAndDateFilters(query: TaskListQuery): SQL[] {
  const filters: SQL[] = [];
  if (query.search) {
    const term = `%${query.search}%`;
    filters.push(or(ilike(tasks.title, term), ilike(tasks.description, term))!);
  }
  if (query.overdue) filters.push(sql`${tasks.status} <> 'done' and ${tasks.dueDate} < ${TODAY}`);
  /* O recorte do calendário: a tarefa toca o intervalo entre o início e o prazo. */
  if (query.from)
    filters.push(sql`coalesce(${tasks.dueDate}, ${tasks.startDate}) >= ${query.from}`);
  if (query.to) filters.push(sql`${tasks.startDate} <= ${query.to}`);

  return filters;
}
