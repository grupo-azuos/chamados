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
import {
  maintenanceTypeLabel,
  nextPreventiveAt,
  type MaintenanceType,
} from '@template/shared/domain/maintenance.util';
import {
  brasiliaClock,
  canMoveTask,
  DEFAULT_MAINTENANCE_TASK_STEPS,
  maintenanceTaskNeed,
  isTaskLinkKindOf,
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
  type TaskHistoryEntry,
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
import { TaskStagesRepository } from '../repository/task-stages.repository';
import {
  type MaintenanceCandidate,
  TasksRepository,
  type TaskWithRelations,
} from '../repository/tasks.repository';

export const TASK_NOT_FOUND = 'Tarefa não encontrada.';
/** Quem fica registrado no que o próprio sistema cria (tarefa de chamado, de manutenção). */
export const SYSTEM_ACTOR = 'system';

/** As áreas cujo chamado vira tarefa: as que têm a tela de Tarefas. */
export const TICKET_TASK_AREAS: readonly RoleContext[] = ['infra', 'sistema'];

/**
 * AS TAREFAS — regras e policy (ver `task-flow.util` para o "porquê" de cada regra).
 *
 * Quem lê precisa de cargo na área da tarefa; quem mexe precisa poder gerenciar a área — a mesma
 * régua do resto do módulo. Pessoa e vínculo são sempre por ID, e só entram se existirem.
 */
/** A máquina do chamado vira vínculo só na Infraestrutura: Sistema não tem computador. */
function ticketMachineLinks(ticket: { area: string; computerId: number | null }): TaskLinkInput[] {
  if (!ticket.computerId || !isTaskLinkKindOf(ticket.area, 'computer')) return [];

  return [{ kind: 'computer', targetId: ticket.computerId }];
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly repository: TasksRepository,
    private readonly stages: TaskStagesRepository,
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

  /** A linha do tempo da tarefa — quem mudou o quê e quando, com o nome de hoje de cada pessoa. */
  async history(user: RequestUser, id: number): Promise<TaskHistoryEntry[]> {
    const row = await this.require(id);
    this.assertCanReadArea(user, row.area);
    const [rows, people] = await Promise.all([this.repository.historyOf(id), this.people()]);

    return rows.map((entry) => ({
      id: entry.id,
      action: entry.action.replace(/^tasks\./, ''),
      actorName: (entry.actorId && people.get(entry.actorId)?.name) || entry.actorEmail,
      occurredAt: entry.occurredAt.toISOString(),
      changes: entry.changes,
    }));
  }

  async create(user: RequestUser, input: CreateTaskInput): Promise<Task> {
    assertCanManageInContext(user, input.area, 'criar tarefas');
    const ownerId = input.ownerId ?? user.id;
    await this.assertPeopleExist([ownerId, ...(input.peopleIds ?? [])]);
    const links = await this.validLinks(input.area, input.links ?? []);

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
   * Põe a tarefa numa SITUAÇÃO PRÓPRIA da área ("Aguardando peça"), ou (`null`) a devolve à coluna
   * fixa. A finalizada que vai para uma própria é reaberta (a própria fica entre Reaberta e
   * Finalizada); a de chamado finalizada não — ela acompanha o chamado.
   */
  async setStage(user: RequestUser, id: number, stageId: number | null): Promise<Task> {
    const row = await this.requireManageable(user, id, 'mudar a situação de tarefas');
    if (stageId !== null) await this.assertStageOfArea(stageId, row.area);
    const reopens = stageId !== null && row.status === 'done';
    if (reopens && row.origin === 'ticket') {
      throw new UnprocessableEntityException(
        'A tarefa de um chamado acompanha o chamado: reabra o chamado antes.',
      );
    }
    await this.repository.update(id, {
      stageId,
      updatedBy: user.id,
      ...(reopens ? statusChange('reopened', user.id) : {}),
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
    if (row.archivedAt) {
      throw new UnprocessableEntityException(
        'A tarefa está arquivada: desarquive para mudar a situação.',
      );
    }
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

  /**
   * A anotação: quem pode mexer na tarefa escreve na linha do tempo dela. O texto é gravado pelo
   * Histórico (a rota `POST :id/notes`); aqui só se confere quem pode, e a tarefa volta igual.
   */
  async addNote(user: RequestUser, id: number): Promise<Task> {
    const row = await this.requireManageable(user, id, 'anotar na tarefa');

    return toTask(row, await this.people());
  }

  async addLinks(user: RequestUser, id: number, input: AddTaskLinksInput): Promise<Task> {
    const row = await this.requireManageable(user, id, 'vincular a tarefa');
    await this.repository.addLinks(id, await this.validLinks(row.area, input.links), user.id);

    return this.get(user, id);
  }

  async removeLink(user: RequestUser, id: number, linkId: number): Promise<Task> {
    await this.requireManageable(user, id, 'desvincular a tarefa');
    if (!(await this.repository.removeLink(id, linkId))) {
      throw new NotFoundException('Vínculo não encontrado nesta tarefa.');
    }

    return this.get(user, id);
  }

  /**
   * Excluir ARQUIVA (como no Paralegal): a tarefa sai de "Em uso", fica guardada com quem arquivou e
   * volta pelo "Desarquivar". Vale para qualquer origem: a de chamado continua acompanhando o chamado.
   */
  async remove(user: RequestUser, id: number): Promise<void> {
    await this.requireManageable(user, id, 'arquivar tarefas');
    await this.repository.setArchived(id, true, user.id);
  }

  async restore(user: RequestUser, id: number): Promise<Task> {
    await this.requireManageable(user, id, 'desarquivar tarefas');
    await this.repository.setArchived(id, false, user.id);

    return this.get(user, id);
  }

  // ── Origens automáticas ────────────────────────────────────────────────────────────────────

  /**
   * A tarefa do CHAMADO acompanha o chamado: nasce com ele (os de Infraestrutura e de Sistema — as
   * áreas com tela de Tarefas), finaliza
   * quando ele encerra, reabre quando ele reabre, e pega o responsável dele. Lê o chamado como
   * está AGORA — chamar duas vezes não faz nada a mais.
   */
  async syncTicket(ticket: TicketRow): Promise<void> {
    if (!TICKET_TASK_AREAS.includes(ticket.area)) return;
    const closed = isClosedTicketStatus(ticket.status);
    const task = await this.repository.findByTicket(ticket.id);

    if (!task) {
      await this.repository.insert(
        {
          area: ticket.area,
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
          links: ticketMachineLinks(ticket),
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

  /**
   * Só a máquina que mudou — chamado por quem registra ou agenda manutenção. Máquina que saiu de
   * uso não pede mais nada: a tarefa aberta dela é finalizada. Nunca derruba quem chamou.
   */
  async syncMaintenanceFor(computerId: number, now = new Date()): Promise<void> {
    try {
      const [machine] = await this.repository.maintenanceCandidates(computerId);
      if (machine) {
        await this.syncMachine(machine, now);
        return;
      }
      const open = await this.repository.findOpenMaintenance(computerId);
      if (open) await this.repository.update(open.id, statusChange('done', SYSTEM_ACTOR));
    } catch (error) {
      this.logger.warn(
        `Tarefa de manutenção da máquina ${computerId} não se ajustou: ${String(error)}`,
      );
    }
  }

  /**
   * A MANUTENÇÃO REGISTRADA atualiza a tarefa da máquina NA HORA, no nome de quem fez: as etapas
   * ficam marcadas, quem fez vira o responsável (o primeiro) e os participantes (os outros), a
   * tarefa é finalizada e a linha do tempo diz o que foi feito. É assim que a manutenção conta
   * na produtividade de cada pessoa. Sem tarefa aberta (a corretiva, a preventiva adiantada), a
   * tarefa nasce já finalizada, pelo mesmo motivo. Sem "Quem fez", conta para quem registrou.
   *
   * Nunca derruba quem chamou: a manutenção já foi gravada, e a tarefa é consequência dela.
   */
  async registerMaintenance(user: RequestUser, done: MaintenanceDone): Promise<void> {
    try {
      const peopleIds = done.performedByIds.length ? [...new Set(done.performedByIds)] : [user.id];
      const open = await this.repository.findOpenMaintenance(done.computerId);
      await this.db.transaction(async (tx) => {
        const [newTask, extras] = doneMaintenanceTaskOf(done);
        const task = open ?? (await this.repository.insert(newTask, extras, tx));
        await this.repository.update(
          task.id,
          { ...statusChange('done', user.email), ownerId: peopleIds[0] ?? null },
          tx,
        );
        await this.repository.replacePeople(task.id, peopleIds.slice(1), tx);
        await this.repository.markAllStepsDone(task.id, user.email, tx);
        await this.repository.recordHistory(maintenanceHistoryOf(user, task, done, peopleIds), tx);
      });
    } catch (error) {
      this.logger.warn(
        `Tarefa da manutenção da máquina ${done.computerId} não se atualizou: ${String(error)}`,
      );
    }
  }

  // ── Apoio ──────────────────────────────────────────────────────────────────────────────────

  private async assertStageOfArea(stageId: number, area: RoleContext): Promise<void> {
    const stage = await this.stages.findActive(stageId);
    if (!stage || stage.area !== area) {
      throw new UnprocessableEntityException('Escolha uma situação desta área.');
    }
  }

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

  private async validLinks(
    area: string,
    links: readonly TaskLinkInput[],
  ): Promise<TaskLinkInput[]> {
    const foreign = links.find((link) => !isTaskLinkKindOf(area, link.kind));
    if (foreign) {
      throw new UnprocessableEntityException(
        `${TASK_LINK_KIND_LABELS[foreign.kind]} não é deste módulo: em Sistema, a tarefa só se vincula a chamados.`,
      );
    }
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

/* Finalizar tira a tarefa da situação própria: a finalizada mora na coluna fixa. */
function statusChange(status: TaskStatus, actor: string): Partial<TaskInsert> {
  const isDone = status === 'done';

  return {
    status,
    finishedAt: isDone ? new Date() : null,
    updatedBy: actor,
    ...(isDone ? { stageId: null } : {}),
  };
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
/** A manutenção registrada, como a tarefa precisa dela. */
export type MaintenanceDone = {
  computerId: number;
  computerName: string;
  type: MaintenanceType;
  description: string | null;
  performedByIds: string[];
  /** Quando o serviço foi feito (ISO); a tarefa guarda o dia em Brasília. */
  performedAt: string;
};

/** A tarefa que nasce JÁ FINALIZADA, para a manutenção que não tinha tarefa aberta. */
function doneMaintenanceTaskOf(done: MaintenanceDone): Parameters<TasksRepository['insert']> {
  const day = brasiliaClock(new Date(done.performedAt)).day;

  return [
    {
      area: 'infra',
      title: `${maintenanceTypeLabel(done.type)} — ${done.computerName}`,
      description: done.description,
      origin: 'maintenance',
      computerId: done.computerId,
      ownerId: null,
      startDate: day,
      dueDate: day,
      status: 'done',
      finishedAt: new Date(),
      createdBy: SYSTEM_ACTOR,
    },
    {
      steps: [...DEFAULT_MAINTENANCE_TASK_STEPS],
      links: [{ kind: 'computer', targetId: done.computerId }],
      peopleIds: [],
    },
  ];
}

/** A linha da linha do tempo: o que foi feito, por quem, e a tarefa finalizada. */
function maintenanceHistoryOf(
  user: RequestUser,
  task: { id: number; title: string },
  done: MaintenanceDone,
  peopleIds: string[],
) {
  const what = done.description?.trim();

  return {
    action: 'tasks.registerMaintenance',
    actorId: user.id,
    actorEmail: user.email,
    targetType: 'tasks',
    targetId: String(task.id),
    targetLabel: task.title,
    changes: [
      {
        field: 'maintenance',
        from: null,
        to: what ? `${maintenanceTypeLabel(done.type)}: ${what}` : maintenanceTypeLabel(done.type),
      },
      { field: 'performedByIds', from: null, to: peopleIds },
      { field: 'status', from: null, to: 'done' },
    ],
  };
}

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
