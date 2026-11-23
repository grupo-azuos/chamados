import { Inject, Injectable } from '@nestjs/common';
import { type RoleContext } from '@template/shared/domain/role-context.util';
import {
  type TaskStage,
  type UpdateTaskStageInput,
} from '@template/shared/schemas/task-stage.schema';
import { and, asc, desc, eq, isNotNull, isNull, max } from 'drizzle-orm';

import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { taskStages, tasks, type TaskStageRow } from '../../../lib/db/schema/tasks.schema';

function toStage(row: TaskStageRow): TaskStage {
  return {
    id: row.id,
    area: row.area,
    label: row.label,
    color: row.color,
    icon: row.icon,
    position: row.position,
    archivedAt: row.archivedAt?.toISOString() ?? null,
  };
}

/** As situações próprias das tarefas, por área, na ordem das colunas do quadro. */
@Injectable()
export class TaskStagesRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async list(area: RoleContext): Promise<TaskStage[]> {
    const rows = await runQuery(
      this.db
        .select()
        .from(taskStages)
        .where(and(eq(taskStages.area, area), isNull(taskStages.archivedAt)))
        .orderBy(asc(taskStages.position), asc(taskStages.id)),
      'listar situações das tarefas',
    );

    return rows.map(toStage);
  }

  /** As arquivadas da área, a mais recente primeiro — para desarquivar em "Nova situação". */
  async listArchived(area: RoleContext): Promise<TaskStage[]> {
    const rows = await runQuery(
      this.db
        .select()
        .from(taskStages)
        .where(and(eq(taskStages.area, area), isNotNull(taskStages.archivedAt)))
        .orderBy(desc(taskStages.archivedAt)),
      'listar situações arquivadas',
    );

    return rows.map(toStage);
  }

  async findAny(id: number): Promise<TaskStage | null> {
    const row = await runMaybe(
      this.db.select().from(taskStages).where(eq(taskStages.id, id)).limit(1),
      'ler situação',
    );

    return row ? toStage(row) : null;
  }

  /** Desarquiva: volta como a última coluna própria, vazia. */
  async restore(stage: TaskStage, actor: string): Promise<TaskStage> {
    const [last] = await runQuery(
      this.db
        .select({ position: max(taskStages.position) })
        .from(taskStages)
        .where(and(eq(taskStages.area, stage.area), isNull(taskStages.archivedAt))),
      'ler a última situação',
    );
    const [row] = await runQuery(
      this.db
        .update(taskStages)
        .set({
          archivedAt: null,
          archivedBy: null,
          position: (last?.position ?? -1) + 1,
          updatedAt: new Date(),
          updatedBy: actor,
        })
        .where(eq(taskStages.id, stage.id))
        .returning(),
      'desarquivar situação da tarefa',
    );
    if (!row) throw new Error('A situação não foi desarquivada.');

    return toStage(row);
  }

  /** A situação em uso (não arquivada); `null` quando não existe ou já saiu. */
  async findActive(id: number): Promise<TaskStage | null> {
    const row = await runMaybe(
      this.db
        .select()
        .from(taskStages)
        .where(and(eq(taskStages.id, id), isNull(taskStages.archivedAt)))
        .limit(1),
      'ler situação da tarefa',
    );

    return row ? toStage(row) : null;
  }

  /** A nova entra como a última coluna própria, logo antes de Finalizada. */
  async insert(
    input: { area: RoleContext; label: string; color: string; icon?: string | null },
    actor: string,
  ): Promise<TaskStage> {
    const [last] = await runQuery(
      this.db
        .select({ position: max(taskStages.position) })
        .from(taskStages)
        .where(and(eq(taskStages.area, input.area), isNull(taskStages.archivedAt))),
      'ler a última situação',
    );
    const [row] = await runQuery(
      this.db
        .insert(taskStages)
        .values({ ...input, position: (last?.position ?? -1) + 1, createdBy: actor })
        .returning(),
      'gravar situação da tarefa',
    );
    if (!row) throw new Error('A situação não foi gravada.');

    return toStage(row);
  }

  async update(id: number, input: UpdateTaskStageInput, actor: string): Promise<TaskStage> {
    const [row] = await runQuery(
      this.db
        .update(taskStages)
        .set({ ...input, updatedAt: new Date(), updatedBy: actor })
        .where(eq(taskStages.id, id))
        .returning(),
      'alterar situação da tarefa',
    );
    if (!row) throw new Error('A situação não foi alterada.');

    return toStage(row);
  }

  /** Troca duas colunas de lugar — numa transação, para nunca ficarem com o mesmo lugar. */
  async swapPositions(first: TaskStage, second: TaskStage, actor: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const now = new Date();
      await runQuery(
        tx
          .update(taskStages)
          .set({ position: second.position, updatedAt: now, updatedBy: actor })
          .where(eq(taskStages.id, first.id)),
        'mover situação da tarefa',
      );
      await runQuery(
        tx
          .update(taskStages)
          .set({ position: first.position, updatedAt: now, updatedBy: actor })
          .where(eq(taskStages.id, second.id)),
        'mover situação da tarefa',
      );
    });
  }

  /** Arquiva a situação e devolve as tarefas dela à coluna fixa de cada uma. */
  async archive(id: number, actor: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await runQuery(
        tx.update(tasks).set({ stageId: null, updatedBy: actor }).where(eq(tasks.stageId, id)),
        'soltar tarefas da situação',
      );
      await runQuery(
        tx
          .update(taskStages)
          .set({ archivedAt: new Date(), archivedBy: actor })
          .where(eq(taskStages.id, id)),
        'arquivar situação da tarefa',
      );
    });
  }
}
