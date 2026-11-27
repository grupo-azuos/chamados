import { Inject, Injectable } from '@nestjs/common';
import { type RoleContext } from '@template/shared/domain/role-context.util';
import {
  HISTORY_KIND_PREFIXES,
  HISTORY_MODULE_TARGETS,
  HISTORY_SHARED_TARGETS,
  type HistoryKind,
  type HistoryQuery,
} from '@template/shared/schemas/history.schema';
import { and, count, desc, eq, gte, ilike, inArray, lt, or, sql, type SQL } from 'drizzle-orm';

import { runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { history, type HistoryInsert, type HistoryRow } from '../../../lib/db/schema/history.schema';
import { taskStages, tasks } from '../../../lib/db/schema/tasks.schema';
import { tickets } from '../../../lib/db/schema/tickets.schema';
import { ticketInArea } from '../../../lib/db/ticket-area.util';

/**
 * A LINHA DO TEMPO DESTE BANCO. Escreve (o interceptor) e lê (a tela Histórico, da mais nova
 * para a mais antiga). Não há `update` nem `delete` — o histórico só cresce.
 */
@Injectable()
export class HistoryRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** O repository não tem regra: grava a linha que recebeu. */
  async insert(values: HistoryInsert): Promise<void> {
    await runQuery(this.db.insert(history).values(values), 'registrar histórico');
  }

  /** A página pedida e o total do recorte. `actorId` já vem resolvido (o "me" é quem pede). */
  async list(
    query: HistoryQuery,
    actorId: string | null,
  ): Promise<{ rows: HistoryRow[]; total: number }> {
    const where = and(this.moduleCondition(query.module), filterCondition(query, actorId));
    const [rows, [counted]] = await Promise.all([
      runQuery(
        this.db
          .select()
          .from(history)
          .where(where)
          .orderBy(desc(history.occurredAt), desc(history.id))
          .limit(query.pageSize)
          .offset((query.page - 1) * query.pageSize),
        'listar o histórico',
      ),
      runQuery(this.db.select({ total: count() }).from(history).where(where), 'contar o histórico'),
    ]);

    return { rows, total: counted?.total ?? 0 };
  }

  /**
   * O QUE É DESTE MÓDULO: os recursos dele e os de fora dos módulos, mais o chamado, a tarefa e a
   * etapa que estão na área dele — conferida na própria tabela, pelo id que a linha guardou.
   */
  private moduleCondition(module: RoleContext): SQL | undefined {
    const ticketIds = this.db
      .select({ id: sql<string>`${tickets.id}::text` })
      .from(tickets)
      .where(ticketInArea(module));
    const taskIds = this.db
      .select({ id: sql<string>`${tasks.id}::text` })
      .from(tasks)
      .where(eq(tasks.area, module));
    const stageIds = this.db
      .select({ id: sql<string>`${taskStages.id}::text` })
      .from(taskStages)
      .where(eq(taskStages.area, module));

    return or(
      inArray(history.targetType, [...HISTORY_MODULE_TARGETS[module], ...HISTORY_SHARED_TARGETS]),
      and(eq(history.targetType, 'tickets'), inArray(history.targetId, ticketIds)),
      and(eq(history.targetType, 'tasks'), inArray(history.targetId, taskIds)),
      and(eq(history.targetType, 'task-stages'), inArray(history.targetId, stageIds)),
    );
  }
}

/** O começo de um dia em Brasília (UTC−3, sem horário de verão desde 2019). */
function startOfDay(day: string): Date {
  return new Date(`${day}T00:00:00-03:00`);
}

/** O começo do dia SEGUINTE: "até 09/11" inclui o dia 09 inteiro. */
function endOfDay(day: string): Date {
  const next = startOfDay(day);
  next.setUTCDate(next.getUTCDate() + 1);

  return next;
}

/**
 * O que a ação fez, no banco: o handler (o que vem depois do ponto em `tickets.createByRequester`)
 * começa por um dos verbos do tipo. "Alterou" é tudo o que não é dos outros três — a mesma regra
 * do `historyKindOf`, que a tela usa.
 */
export function kindPattern(kind: HistoryKind): { pattern: string; isNegated: boolean } {
  if (kind !== 'updated') {
    return { pattern: `^(${HISTORY_KIND_PREFIXES[kind].join('|')})`, isNegated: false };
  }

  return { pattern: `^(${Object.values(HISTORY_KIND_PREFIXES).flat().join('|')})`, isNegated: true };
}

function kindCondition(kind: HistoryKind): SQL {
  const handler = sql`split_part(${history.action}, '.', 2)`;
  const { pattern, isNegated } = kindPattern(kind);

  return isNegated ? sql`${handler} !~ ${pattern}` : sql`${handler} ~ ${pattern}`;
}

/** O recorte da tela: cada filtro vira uma condição, e o que não veio não entra. */
function filterCondition(query: HistoryQuery, actorId: string | null): SQL | undefined {
  return and(
    query.targetType ? eq(history.targetType, query.targetType) : undefined,
    query.kind ? kindCondition(query.kind) : undefined,
    actorId ? eq(history.actorId, actorId) : undefined,
    query.from ? gte(history.occurredAt, startOfDay(query.from)) : undefined,
    query.to ? lt(history.occurredAt, endOfDay(query.to)) : undefined,
    query.search ? ilike(history.targetLabel, `%${query.search}%`) : undefined,
  );
}
