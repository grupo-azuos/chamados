import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { nextPreventiveAt } from '@template/shared/domain/maintenance.util';
import {
  brasiliaClock,
  canMoveTask,
  DEFAULT_MAINTENANCE_TASK_STEPS,
  maintenanceTaskNeed,
  TASK_LINK_KIND_LABELS,
  taskStatusAfterSteps,
  taskStatusFromTicket,
  type TaskStatus,
} from '@template/shared/domain/task-flow.util';
import { isClosedTicketStatus } from '@template/shared/domain/ticket-status.util';
import { type RoleContext } from '@template/shared/domain/role-context.util';
import {
  type AddTaskLinksInput,
  type CreateTaskInput,
  type SaveTaskStepsInput,
  type SetTaskStatusInput,
  type Task,
  type TaskLinkInput,
  type TaskListQuery,
  type TaskPage,
  type UpdateTaskInput,
} from '@template/shared/schemas/task.schema';
import { type DirectoryUser } from '@template/shared/schemas/user.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { USER_DIRECTORY_PROVIDER } from '../../../lib/auth/user-directory.token';
import { type UserDirectoryProvider } from '../../../lib/auth/user-directory.type';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { type TaskInsert } from '../../../lib/db/schema/tasks.schema';
import { type TicketRow } from '../../../lib/db/schema/tickets.schema';
import { getRoleInContext } from '../../../lib/policy/access.policy';
import { assertCanManageInContext, assertCanRead } from '../../../lib/policy/policy-assert.util';
import { ticketTaskTitle, toTask } from '../mapper/tasks.mapper';
import {
  type MaintenanceCandidate,
  TasksRepository,
  type TaskWithRelations,
} from '../repository/tasks.repository';

export const TASK_NOT_FOUND = 'Tarefa não encontrada.';
/** Quem fica registrado no que o próprio sistema cria (tarefa de chamado, de manutenção). */
export const SYSTEM_ACTOR = 'system';

/**
 * AS TAREFAS — regras e policy (ver `task-flow.util` para o "porquê" de cada regra).
 *
 * Quem lê precisa de cargo na área da tarefa; quem mexe precisa poder gerenciar a área — a mesma
 * régua do resto do módulo. Pessoa e vínculo são sempre por ID, e só entram se existirem.
 */
@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly repository: TasksRepository,
    @Inject(DB) private readonly db: Database,
    @Optional()
    @Inject(USER_DIRECTORY_PROVIDER)
    private readonly directory?: UserDirectoryProvider,
  ) {}

  async list(user: RequestUser, query: TaskListQuery): Promise<TaskPage> {
    this.assertCanReadArea(user, query.area);
    const page = await this.repository.list(query, user.id);
    const people = await this.people();

    return {
      items: page.items.map((row) => toTask(row, people)),
      total: page.total,
      page: query.page,
      pageSize: query.pageSize,
      alerts: { overdue: page.overdue, dueSoon: page.dueSoon },
    };
  }

  async get(user: RequestUser, id: number): Promise<Task> {
    const row = await this.require(id);
    this.assertCanReadArea(user, row.area);

    return toTask(row, await this.people());
  }

  async create(user: RequestUser, input: CreateTaskInput): Promise<Task> {
    assertCanManageInContext(user, input.area, 'criar tarefas');
    const ownerId = input.ownerId ?? user.id;
    await this.assertPeopleExist([ownerId, ...(input.peopleIds ?? [])]);
    const links = await this.validLinks(input.links ?? []);

    const row = await this.db.transaction((tx) =>
      this.repository.insert(
        {
          area: input.area,
          title: input.title,
          description: input.description ?? null,
          origin: 'manual',
          ownerId,
          startDate: input.startDate,
          dueDate: input.dueDate ?? null,
          dueTime: input.dueTime ?? null,
          createdBy: user.id,
          updatedBy: user.id,
        },
        { steps: input.steps ?? [], links, peopleIds: input.peopleIds ?? [] },
        tx,
      ),
    );

    return this.get(user, row.id);
  }

  async update(user: RequestUser, id: number, input: UpdateTaskInput): Promise<Task> {
    const row = await this.requireManageable(user, id, 'alterar tarefas');
    const ownerId = input.ownerId === undefined ? undefined : (input.ownerId ?? null);
    await this.assertPeopleExist([...(ownerId ? [ownerId] : []), ...(input.peopleIds ?? [])]);
    const startDate = input.startDate ?? row.startDate;
    const dueDate = input.dueDate === undefined ? row.dueDate : input.dueDate;
    if (dueDate && dueDate < startDate) {
      throw new UnprocessableEntityException('O prazo não pode ser antes do início.');
    }

    await this.db.transaction(async (tx) => {
      await this.repository.update(id, updateChangeOf(input, ownerId, user.id), tx);
      if (input.peopleIds) await this.repository.replacePeople(id, input.peopleIds, tx);
    });

    return this.get(user, id);
  }

  /**
   * Finalizar ou reabrir à mão. A tarefa de um chamado não se move por aqui: ela acompanha o
   * chamado — finalizar a tarefa com o chamado aberto deixaria as duas telas dizendo coisas
   * diferentes.
   */
  async setStatus(user: RequestUser, id: number, input: SetTaskStatusInput): Promise<Task> {
    const row = await this.requireManageable(user, id, 'mudar a situação de tarefas');
    if (row.origin === 'ticket') {
      throw new UnprocessableEntityException(
        'A tarefa de um chamado acompanha o chamado: encerre ou reabra o chamado.',
      );
    }
    if (!canMoveTask(row.status, input.status)) {
      throw new UnprocessableEntityException(
        input.status === 'done'
          ? 'A tarefa já está finalizada.'
          : 'Só se reabre tarefa finalizada.',
      );
    }
    await this.repository.update(id, statusChange(input.status, user.id));

    return this.get(user, id);
  }

  async saveSteps(user: RequestUser, id: number, input: SaveTaskStepsInput): Promise<Task> {
    const row = await this.requireManageable(user, id, 'alterar as etapas');
    const known = new Set(row.steps.map((step) => step.id));
    if (input.steps.some((step) => step.id && !known.has(step.id))) {
      throw new BadRequestException('Uma das etapas não é desta tarefa.');
    }
    await this.db.transaction(async (tx) => {
      await this.repository.saveSteps(id, input.steps, tx);
      await this.followSteps(row, user.id, tx);
    });

    return this.get(user, id);
  }

  async setStepDone(user: RequestUser, id: number, stepId: number, done: boolean): Promise<Task> {
    const row = await this.requireManageable(user, id, 'marcar etapas');
    await this.db.transaction(async (tx) => {
      const found = await this.repository.setStepDone(id, stepId, done ? user.id : null, tx);
      if (!found) throw new NotFoundException('Etapa não encontrada nesta tarefa.');
      await this.followSteps(row, user.id, tx);
    });

    return this.get(user, id);
  }

  async addLinks(user: RequestUser, id: number, input: AddTaskLinksInput): Promise<Task> {
    await this.requireManageable(user, id, 'vincular a tarefa');
    await this.repository.addLinks(id, await this.validLinks(input.links), user.id);

    return this.get(user, id);
  }

  async removeLink(user: RequestUser, id: number, linkId: number): Promise<Task> {
    await this.requireManageable(user, id, 'desvincular a tarefa');
    if (!(await this.repository.removeLink(id, linkId))) {
      throw new NotFoundException('Vínculo não encontrado nesta tarefa.');
    }

    return this.get(user, id);
  }

  /** Só a tarefa feita à mão se apaga: a de chamado e a de manutenção vivem com a origem. */
  async remove(user: RequestUser, id: number): Promise<void> {
    const row = await this.requireManageable(user, id, 'apagar tarefas');
    if (row.origin !== 'manual') {
      throw new UnprocessableEntityException(
        'Esta tarefa nasceu de um chamado ou de uma manutenção e acompanha a origem — não se apaga.',
      );
    }
    await this.repository.remove(id);
  }

  // ── Origens automáticas ────────────────────────────────────────────────────────────────────

  /**
   * A tarefa do CHAMADO acompanha o chamado: nasce com ele (só os de Infraestrutura), finaliza
   * quando ele encerra, reabre quando ele reabre, e pega o responsável dele. Lê o chamado como
   * está AGORA — chamar duas vezes não faz nada a mais.
   */
  async syncTicket(ticket: TicketRow): Promise<void> {
    if (ticket.area !== 'infra') return;
    const closed = isClosedTicketStatus(ticket.status);
    const task = await this.repository.findByTicket(ticket.id);

    if (!task) {
      await this.repository.insert(
        {
          area: 'infra',
          title: ticketTaskTitle(ticket.description),
          description: ticket.description,
          origin: 'ticket',
          ticketId: ticket.id,
          ownerId: ticket.assigneeId,
          startDate: brasiliaClock(ticket.createdAt).day,
          status: closed ? 'done' : 'open',
          finishedAt: closed ? new Date() : null,
          createdBy: SYSTEM_ACTOR,
        },
        {
          steps: [],
          links: ticket.computerId ? [{ kind: 'computer', targetId: ticket.computerId }] : [],
          peopleIds: [],
        },
      );
      return;
    }

    const change: Partial<TaskInsert> = {};
    const next = taskStatusFromTicket(task.status, closed);
    if (next) Object.assign(change, statusChange(next, SYSTEM_ACTOR));
    if (ticket.assigneeId && ticket.assigneeId !== task.ownerId) change.ownerId = ticket.assigneeId;
    if (Object.keys(change).length) await this.repository.update(task.id, change);
  }

  /** Igual a `syncTicket`, sem nunca derrubar quem chamou: a tarefa é consequência do chamado. */
  syncTicketInBackground(ticket: TicketRow | null | undefined): void {
    if (!ticket) return;
    void this.syncTicket(ticket).catch((error: unknown) => {
      this.logger.warn(`Tarefa do chamado ${ticket.id} não acompanhou: ${String(error)}`);
    });
  }

  /**
   * As tarefas de MANUTENÇÃO: cada máquina em uso cuja preventiva venceu (ou vence em até uma
   * semana), ou que tem manutenção agendada nesse prazo, ganha UMA tarefa aberta, com o roteiro
   * da preventiva. Quando a máquina deixa de pedir — a manutenção foi registrada, o agendamento
   * cancelado —, a tarefa aberta é finalizada. Devolve quantas foram abertas e finalizadas.
   */
  async syncMaintenance(now = new Date()): Promise<{ opened: number; finished: number }> {
    const result = { opened: 0, finished: 0 };
    for (const machine of await this.repository.maintenanceCandidates()) {
      const outcome = await this.syncMachine(machine, now);
      if (outcome) result[outcome]++;
    }

    return result;
  }

  /** Uma máquina: abre, ajusta o prazo ou finaliza a tarefa de manutenção dela. */
  private async syncMachine(
    machine: MaintenanceCandidate,
    now: Date,
  ): Promise<'opened' | 'finished' | null> {
    const need = maintenanceTaskNeed(
      {
        scheduledFor: machine.scheduledFor,
        nextPreventiveAt: nextPreventiveAt(machine.lastPreventiveAt?.toISOString() ?? null),
      },
      now,
    );
    const open = await this.repository.findOpenMaintenance(machine.computerId);

    if (!need) {
      if (!open) return null;
      await this.repository.update(open.id, statusChange('done', SYSTEM_ACTOR));
      return 'finished';
    }
    if (open) {
      if (open.dueDate !== need.dueDate)
        await this.repository.update(open.id, { dueDate: need.dueDate });
      return null;
    }

    await this.repository.insert(maintenanceTaskOf(machine, need, brasiliaClock(now).day), {
      steps: [...DEFAULT_MAINTENANCE_TASK_STEPS],
      links: [{ kind: 'computer', targetId: machine.computerId }],
      peopleIds: [],
    });

    return 'opened';
  }

  syncMaintenanceInBackground(): void {
    void this.syncMaintenance().catch((error: unknown) => {
      this.logger.warn(`Tarefas de manutenção não sincronizaram: ${String(error)}`);
    });
  }

  // ── Apoio ──────────────────────────────────────────────────────────────────────────────────

  private assertCanReadArea(user: RequestUser, area: RoleContext): void {
    assertCanRead(getRoleInContext(user, area), 'as tarefas desta área');
  }

  private async require(id: number): Promise<TaskWithRelations> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundException(TASK_NOT_FOUND);

    return row;
  }

  private async requireManageable(
    user: RequestUser,
    id: number,
    what: string,
  ): Promise<TaskWithRelations> {
    const row = await this.require(id);
    assertCanManageInContext(user, row.area, what);

    return row;
  }

  /** Marcar etapa muda a situação — menos na tarefa de chamado, que segue o chamado. */
  private async followSteps(
    row: TaskWithRelations,
    actor: string,
    tx: Parameters<Parameters<Database['transaction']>[0]>[0],
  ): Promise<void> {
    if (row.origin === 'ticket') return;
    const steps = await this.repository.stepsOf(row.id, tx);
    const next = taskStatusAfterSteps(
      row.status,
      steps.map((step) => ({ done: step.doneAt !== null })),
    );
    if (next !== row.status) await this.repository.update(row.id, statusChange(next, actor), tx);
  }

  private async validLinks(links: readonly TaskLinkInput[]): Promise<TaskLinkInput[]> {
    for (const kind of new Set(links.map((link) => link.kind))) {
      const ids = links.filter((link) => link.kind === kind).map((link) => link.targetId);
      const existing = await this.repository.existingTargets(kind, ids);
      const missing = ids.find((id) => !existing.has(id));
      if (missing) {
        throw new UnprocessableEntityException(
          `${TASK_LINK_KIND_LABELS[kind]} ${missing} não existe — escolha pelo cadastro.`,
        );
      }
    }

    return [...links];
  }

  /** Pessoa só entra se estiver no diretório — responsável e participante são por ID, sem texto solto. */
  private async assertPeopleExist(ids: readonly string[]): Promise<void> {
    if (!ids.length || !this.directory) return;
    let people: Map<string, DirectoryUser>;
    try {
      people = new Map((await this.directory.listUsers()).map((user) => [user.id, user]));
    } catch {
      /* Sem o diretório não dá para conferir — e gravar sem conferir é o "texto solto" de volta. */
      throw new ServiceUnavailableException(
        'A lista de pessoas está fora do ar agora. Tente de novo em instantes.',
      );
    }
    const unknown = ids.find((id) => !people.has(id));
    if (unknown)
      throw new UnprocessableEntityException('Escolha as pessoas pela lista do diretório.');
  }

  private async people(): Promise<Map<string, DirectoryUser>> {
    if (!this.directory) return new Map();
    try {
      return new Map((await this.directory.listUsers()).map((user) => [user.id, user]));
    } catch {
      return new Map();
    }
  }
}

function statusChange(status: TaskStatus, actor: string): Partial<TaskInsert> {
  return { status, finishedAt: status === 'done' ? new Date() : null, updatedBy: actor };
}

function updateChangeOf(
  input: UpdateTaskInput,
  ownerId: string | null | undefined,
  actor: string,
): Partial<TaskInsert> {
  const change: Partial<TaskInsert> = { updatedBy: actor };
  if (input.title !== undefined) change.title = input.title;
  if (input.description !== undefined) change.description = input.description ?? null;
  if (ownerId !== undefined) change.ownerId = ownerId;
  if (input.startDate !== undefined) change.startDate = input.startDate;
  if (input.dueDate !== undefined) change.dueDate = input.dueDate ?? null;
  if (input.dueTime !== undefined) change.dueTime = input.dueTime ?? null;

  return change;
}

/** A tarefa da manutenção que a máquina pede: começa hoje (ou no dia em que venceu). */
function maintenanceTaskOf(
  machine: MaintenanceCandidate,
  need: { dueDate: string; reason: 'scheduled' | 'preventive' },
  today: string,
): TaskInsert {
  return {
    area: 'infra',
    title:
      need.reason === 'scheduled'
        ? `Manutenção agendada — ${machine.computerName}`
        : `Preventiva — ${machine.computerName}`,
    description: machine.scheduleNote,
    origin: 'maintenance',
    computerId: machine.computerId,
    ownerId: null,
    startDate: need.dueDate < today ? need.dueDate : today,
    dueDate: need.dueDate,
    createdBy: SYSTEM_ACTOR,
  };
}
