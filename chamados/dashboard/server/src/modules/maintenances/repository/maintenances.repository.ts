import { Inject, Injectable } from '@nestjs/common';
import {
  type MaintenanceListQuery,
  type MaintenanceScheduleListQuery,
} from '@template/shared/schemas/maintenance.schema';
import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';

import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { asDate } from '../../../lib/db/sql-timestamp.util';
import { computers } from '../../../lib/db/schema/computers.schema';
import {
  maintenanceSchedules,
  type MaintenanceScheduleRow,
} from '../../../lib/db/schema/maintenance-schedules.schema';
import {
  maintenances,
  type MaintenanceInsert,
  type MaintenanceRow,
} from '../../../lib/db/schema/maintenances.schema';

/**
 * A manutenção com a máquina dela, do jeito que a tela precisa ler.
 *
 * O computador vem JUNTO na mesma consulta, e não num segundo passo: a lista mostra o nome de
 * cada máquina, e buscar uma por uma faria cinquenta idas ao banco para desenhar uma página.
 */
export type MaintenanceWithComputer = {
  maintenance: MaintenanceRow;
  computer: {
    id: number;
    name: string;
    displayName: string | null;
    department: string | null;
  } | null;
};

/** O agendamento com a máquina dele — o nome sai do inventário, como no histórico. */
export type ScheduleWithComputer = {
  schedule: MaintenanceScheduleRow;
  computer: {
    id: number;
    name: string;
    displayName: string | null;
    department: string | null;
  };
};

export type MaintenancePage = {
  rows: MaintenanceWithComputer[];
  total: number;
};

/** Uma máquina do inventário com o resumo do histórico dela. */
export type PreventiveRow = {
  computerId: number;
  computerName: string;
  computerDisplayName: string | null;
  computerDepartment: string | null;
  lastDoneAt: Date | null;
  maintenanceCount: number;
};

const computerColumns = {
  id: computers.id,
  name: computers.name,
  displayName: computers.displayName,
  department: computers.department,
};

/**
 * O repository não tem regra: traduz filtro em consulta e devolve linha. Toda decisão — quem
 * pode, o que carimbar, o que é "vencida" — vive no service.
 *
 * Toda consulta passa por `runQuery`/`runMaybe`: é o que faz a recusa do banco chegar à tela
 * com status e motivo, em vez de "erro inesperado".
 */
@Injectable()
export class MaintenancesRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async list(query: MaintenanceListQuery): Promise<MaintenancePage> {
    const where = buildWhere(query);
    const offset = (query.page - 1) * query.pageSize;

    const [rows, [counted]] = await Promise.all([
      runQuery(
        this.db
          .select({ maintenance: maintenances, computer: computerColumns })
          .from(maintenances)
          .leftJoin(computers, eq(maintenances.computerId, computers.id))
          .where(where)
          /* A mais recente primeiro: quem abre a tela quer saber o que foi feito ontem, não
             o que foi feito no ano passado. */
          .orderBy(desc(maintenances.performedAt), desc(maintenances.id))
          .limit(query.pageSize)
          .offset(offset),
        'listar manutenções',
      ),
      runQuery(
        this.db
          .select({ total: count() })
          .from(maintenances)
          .leftJoin(computers, eq(maintenances.computerId, computers.id))
          .where(where),
        'contar manutenções',
      ),
    ]);

    return { rows, total: counted?.total ?? rows.length };
  }

  async findById(id: number): Promise<MaintenanceWithComputer | null> {
    return runMaybe(
      this.db
        .select({ maintenance: maintenances, computer: computerColumns })
        .from(maintenances)
        .leftJoin(computers, eq(maintenances.computerId, computers.id))
        .where(eq(maintenances.id, id))
        .limit(1),
      'ler manutenção',
    );
  }

  async insert(values: MaintenanceInsert): Promise<number> {
    const [row] = await runQuery(
      this.db.insert(maintenances).values(values).returning({ id: maintenances.id }),
      'registrar manutenção',
    );

    return (row as { id: number }).id;
  }

  async update(id: number, values: Partial<MaintenanceInsert>): Promise<void> {
    await runQuery(
      this.db.update(maintenances).set(values).where(eq(maintenances.id, id)),
      'salvar manutenção',
    );
  }

  async delete(id: number): Promise<void> {
    await runQuery(
      this.db.delete(maintenances).where(eq(maintenances.id, id)),
      'excluir manutenção',
    );
  }

  /**
   * Os agendamentos em aberto, do mais próximo para o mais distante.
   *
   * Máquina arquivada ou descartada fica de fora: agendamento de máquina que saiu de uso é
   * compromisso com ninguém.
   */
  async listSchedules(query: MaintenanceScheduleListQuery): Promise<ScheduleWithComputer[]> {
    const filters: SQL[] = [eq(computers.isArchived, false), sql`${computers.disposedAt} is null`];
    if (query.computerId) filters.push(eq(maintenanceSchedules.computerId, query.computerId));

    return runQuery(
      this.db
        .select({ schedule: maintenanceSchedules, computer: computerColumns })
        .from(maintenanceSchedules)
        .innerJoin(computers, eq(maintenanceSchedules.computerId, computers.id))
        .where(and(...filters))
        .orderBy(asc(maintenanceSchedules.scheduledFor), asc(computers.name)),
      'listar manutenções agendadas',
    );
  }

  /**
   * Agenda ou remarca — uma linha por máquina, então a segunda vez TROCA a data em vez de
   * criar outra. Numa consulta só, para duas pessoas agendando ao mesmo tempo não esbarrarem
   * na regra de unicidade.
   */
  async upsertSchedule(
    computerId: number,
    values: { scheduledFor: string; note: string | null },
    actorEmail: string,
  ): Promise<void> {
    await runQuery(
      this.db
        .insert(maintenanceSchedules)
        .values({ computerId, ...values, createdBy: actorEmail })
        .onConflictDoUpdate({
          target: maintenanceSchedules.computerId,
          set: { ...values, updatedAt: new Date(), updatedBy: actorEmail },
        }),
      'agendar manutenção',
    );
  }

  /** Tira o agendamento — cancelado, ou cumprido porque a manutenção foi registrada. */
  async deleteSchedule(computerId: number): Promise<void> {
    await runQuery(
      this.db.delete(maintenanceSchedules).where(eq(maintenanceSchedules.computerId, computerId)),
      'cancelar manutenção agendada',
    );
  }

  /** A máquina existe e está em uso? Agendar exige as duas coisas. */
  async findActiveComputer(computerId: number): Promise<{ id: number } | null> {
    return runMaybe(
      this.db
        .select({ id: computers.id })
        .from(computers)
        .where(
          and(
            eq(computers.id, computerId),
            eq(computers.isArchived, false),
            sql`${computers.disposedAt} is null`,
          ),
        )
        .limit(1),
      'ler máquina para agendar',
    );
  }

  /**
   * O cruzamento do inventário com o histórico: cada máquina em uso e a última vez que ela
   * foi aberta.
   *
   * A data considerada é só a de PREVENTIVA ou CORRETIVA (`filter` no agregado): trocar uma
   * peça não conta como a máquina ter sido limpa — ver `resetsPreventiveClock`. A contagem,
   * essa sim, é de todas as manutenções, porque a pergunta dela é outra ("esta máquina dá
   * trabalho demais?").
   *
   * Arquivada fica de fora: cobrar preventiva de uma máquina que saiu de uso é criar tarefa
   * para ninguém.
   */
  async listPreventive(): Promise<PreventiveRow[]> {
    return runQuery(
      this.db
        .select({
          computerId: computers.id,
          computerName: computers.name,
          computerDisplayName: computers.displayName,
          computerDepartment: computers.department,
          lastDoneAt: asDate(
            sql<Date | null>`max(${maintenances.performedAt}) filter (where ${maintenances.type} in ('preventive', 'corrective'))`,
            maintenances.performedAt,
          ),
          maintenanceCount: sql<number>`count(${maintenances.id})::int`,
        })
        .from(computers)
        .leftJoin(maintenances, eq(maintenances.computerId, computers.id))
        .where(eq(computers.isArchived, false))
        .groupBy(computers.id)
        .orderBy(computers.name),
      'ler a situação das preventivas',
    );
  }
}

/**
 * A busca cobre o que a pessoa lembra: o que foi feito, quem fez, o equipamento digitado à
 * mão e o nome da máquina no inventário.
 *
 * `ilike` é o `like` que ignora maiúscula e minúscula no Postgres. Acento continua contando:
 * busca sem acento é trabalho para quando alguém pedir.
 */
function buildWhere(query: MaintenanceListQuery): SQL | undefined {
  const filters: (SQL | undefined)[] = [];

  if (query.computerId) filters.push(eq(maintenances.computerId, query.computerId));
  if (query.type) filters.push(eq(maintenances.type, query.type));

  const search = query.search?.trim();
  if (search) {
    const term = `%${search}%`;
    filters.push(
      or(
        ilike(maintenances.description, term),
        ilike(maintenances.performedBy, term),
        ilike(maintenances.otherMachine, term),
        ilike(computers.name, term),
        ilike(computers.displayName, term),
      ),
    );
  }

  return and(...filters.filter((filter): filter is SQL => filter !== undefined));
}
