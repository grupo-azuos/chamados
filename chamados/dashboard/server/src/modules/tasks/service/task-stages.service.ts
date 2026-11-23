import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type CreateTaskStageInput,
  type MoveTaskStageInput,
  type TaskStage,
  type TaskStageListQuery,
  type UpdateTaskStageInput,
} from '@template/shared/schemas/task-stage.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { getRoleInContext } from '../../../lib/policy/access.policy';
import { assertCanManageInContext, assertCanRead } from '../../../lib/policy/policy-assert.util';
import { TaskStagesRepository } from '../repository/task-stages.repository';

const STAGE_NOT_FOUND = 'Situação não encontrada.';

/**
 * AS SITUAÇÕES PRÓPRIAS DAS TAREFAS — quem LÊ as tarefas da área vê as colunas; quem ADMINISTRA a
 * área cria, renomeia, troca a cor, muda de lugar e arquiva. Arquivar devolve as tarefas à coluna
 * fixa de cada uma (Aberta ou Reaberta): nada some do quadro.
 */
@Injectable()
export class TaskStagesService {
  constructor(private readonly repository: TaskStagesRepository) {}

  async list(user: RequestUser, query: TaskStageListQuery): Promise<TaskStage[]> {
    assertCanRead(getRoleInContext(user, query.area), 'as situações das tarefas');
    if (query.archived === 'only') return this.repository.listArchived(query.area);

    return this.repository.list(query.area);
  }

  async create(user: RequestUser, input: CreateTaskStageInput): Promise<TaskStage> {
    assertCanManageInContext(user, input.area, 'criar situações de tarefa');

    return this.repository.insert(input, user.id);
  }

  async update(user: RequestUser, id: number, input: UpdateTaskStageInput): Promise<TaskStage> {
    const stage = await this.found(id);
    assertCanManageInContext(user, stage.area, 'alterar situações de tarefa');

    return this.repository.update(id, input, user.id);
  }

  /** Anda a coluna uma casa; na ponta, fica onde está. Devolve as colunas na ordem nova. */
  async move(user: RequestUser, id: number, input: MoveTaskStageInput): Promise<TaskStage[]> {
    const stage = await this.found(id);
    assertCanManageInContext(user, stage.area, 'mudar a ordem das situações');
    const stages = await this.repository.list(stage.area);
    const index = stages.findIndex((item) => item.id === id);
    const neighbor = stages[index + input.direction];
    if (neighbor) await this.repository.swapPositions(stages[index]!, neighbor, user.id);

    return this.repository.list(stage.area);
  }

  async remove(user: RequestUser, id: number): Promise<void> {
    const stage = await this.found(id);
    assertCanManageInContext(user, stage.area, 'arquivar situações de tarefa');

    await this.repository.archive(id, user.id);
  }

  /** Desarquiva — volta como a última coluna própria, vazia. O nome já usado por outra é recusado. */
  async restore(user: RequestUser, id: number): Promise<TaskStage> {
    const stage = await this.repository.findAny(id);
    if (!stage) throw new NotFoundException(STAGE_NOT_FOUND);
    assertCanManageInContext(user, stage.area, 'desarquivar situações de tarefa');
    if (!stage.archivedAt) return stage;

    return this.repository.restore(stage, user.id);
  }

  private async found(id: number): Promise<TaskStage> {
    const stage = await this.repository.findActive(id);
    if (!stage) throw new NotFoundException(STAGE_NOT_FOUND);

    return stage;
  }
}
