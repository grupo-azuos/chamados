import { Inject, Injectable } from '@nestjs/common';
import { type AlertMetric } from '@template/shared/domain/computer-alert.util';
import { compareMachines } from '@template/shared/domain/machine-number.util';
import { preventiveDueBefore } from '@template/shared/domain/maintenance.util';
import {
  type ComputerAlertListQuery,
  type ComputerListQuery,
  type ComputerReportQuery,
} from '@template/shared/schemas/computer.schema';
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gte,
  ilike,
  exists,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { REPORT_FETCH_LIMIT } from '../../../lib/report/report-limit.util';
import { type Database } from '../../../lib/db/db.type';
import { departmentMatches } from '../../../lib/db/department-match.util';
import { qualified } from '../../../lib/db/sql-column.util';
import { ticketInArea } from '../../../lib/db/ticket-area.util';
import { asDate, asTimestamp } from '../../../lib/db/sql-timestamp.util';
import { tickets } from '../../../lib/db/schema/tickets.schema';
import { maintenances } from '../../../lib/db/schema/maintenances.schema';
import {
  computerAlerts,
  type ComputerAlertInsert,
  type ComputerAlertRow,
} from '../../../lib/db/schema/computer-alerts.schema';
import {
  computerSamples,
  type ComputerSampleInsert,
  type ComputerSampleRow,
} from '../../../lib/db/schema/computer-samples.schema';
import {
  computers,
  type ComputerInsert,
  type ComputerRow,
} from '../../../lib/db/schema/computers.schema';

/** Agregados da lista, na mesma consulta: chamados do mês, última preventiva e alertas ativos. */
export type ComputerWithTickets = ComputerRow & {
  ticketsThisMonth: number;
  lastPreventiveAt: Date | null;
  activeAlerts: number;
  activeAlertMetrics: AlertMetric[];
};

/**
 * O filtro de conexão. Quem sabe quem está online é o registro de conexões vivas, não o banco:
 * por isso os ids chegam de fora, e a consulta só diz se quer os que ESTÃO ou os que NÃO estão
 * entre eles.
 */
export type PresenceFilter = { onlineIds: number[]; wantOnline: boolean };

export type ComputerPage = {
  rows: ComputerWithTickets[];
  total: number;
};

/**
 * O repository não tem regra: traduz filtro em consulta e devolve linha.
 *
 * Toda consulta passa por `runQuery`/`runMaybe`: é o que faz a recusa do banco chegar à tela
 * com status e motivo, em vez de "erro inesperado".
 *
 * **Não há `delete` de computador.** Máquina que saiu de uso é arquivada: o histórico dela é
 * o que sustenta "esta aqui deu problema demais, vamos trocar" na hora de decidir compra.
 * Amostras e alertas, sim, são apagados por idade — ver `deleteSamplesOlderThan`.
 */
/**
 * As colunas da máquina mais QUANTOS CHAMADOS ela deu no mês.
 *
 * Subconsulta, e não `join` com `group by`: com o `join`, uma máquina com cinco chamados
 * apareceria cinco vezes na lista, e agrupar obrigaria a repetir todas as colunas no
 * `group by`. O número entra como coluna calculada, e a lista continua sendo uma linha por
 * máquina.
 *
 * "No mês" é o mês CORRENTE, do dia 1 até agora — não os últimos trinta dias. É assim que
 * quem olha a tela conta: "quantos chamados esta máquina deu em setembro".
 */
function computerColumns() {
  return {
    ...getTableColumns(computers),
    lastPreventiveAt: asDate(sql<Date | null>`(
      select max(${qualified(maintenances.performedAt)}) from ${maintenances}
      where ${qualified(maintenances.computerId)} = ${qualified(computers.id)}
        and ${qualified(maintenances.type)} in ('preventive', 'corrective')
    )`, maintenances.performedAt),
    activeAlerts: sql<number>`(
      select count(*)::int from ${computerAlerts}
      where ${qualified(computerAlerts.computerId)} = ${qualified(computers.id)}
        and ${qualified(computerAlerts.status)} = 'active'
        and ${qualified(computerAlerts.recoveredAt)} is null
    )`,
    /* `coalesce` com lista vazia: sem alerta, o Postgres devolveria nulo, e "nenhuma peça em
       alerta" é uma lista vazia, não "não sei". */
    activeAlertMetrics: sql<AlertMetric[]>`coalesce((
      select array_agg(distinct ${qualified(computerAlerts.metric)} order by ${qualified(computerAlerts.metric)})
      from ${computerAlerts}
      where ${qualified(computerAlerts.computerId)} = ${qualified(computers.id)}
        and ${qualified(computerAlerts.status)} = 'active'
        and ${qualified(computerAlerts.recoveredAt)} is null
    ), '{}')`,
    ticketsThisMonth: sql<number>`(
      select count(*)::int from ${tickets}
      where ${qualified(tickets.computerId)} = ${qualified(computers.id)}
        and ${ticketInArea('infra')}
        and ${qualified(tickets.createdAt)} >= date_trunc('month', now())
    )`,
  };
}

@Injectable()
export class ComputersRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async list(query: ComputerListQuery, presence?: PresenceFilter): Promise<ComputerPage> {
    const where = buildWhere(query, presence);
    const offset = (query.page - 1) * query.pageSize;

    const [rows, [counted]] = await Promise.all([
      runQuery(
        this.db
          .select(computerColumns())
          .from(computers)
          .where(where)
          /* Pior saúde primeiro: a lista serve para achar o que precisa de atenção, e quem
             abre o inventário está procurando problema, não ordem alfabética. Por isso a nota
             sobe (`asc`): 63 antes de 100. Em ordem decrescente a tela mostraria as máquinas
             saudáveis no topo e esconderia a crítica no fim da rolagem. */
          .orderBy(asc(computers.healthScore), computers.name)
          .limit(query.pageSize)
          .offset(offset),
        'listar computadores',
      ),
      runQuery(
        this.db.select({ total: count() }).from(computers).where(where),
        'contar computadores',
      ),
    ]);

    return { rows, total: counted?.total ?? rows.length };
  }

  /**
   * TODO o parque que casa com o filtro, sem página — é o que o relatório baixa. Os MESMOS
   * filtros da tela, por isso reaproveita `buildWhere`, e a MESMA ordem: pelo número da
   * máquina no nome físico (`name` guarda o hostname mais recente), em ordem natural. O banco
   * não ordena "D2" antes de "D10" sem uma collation própria; com o limite do relatório, a
   * ordem em memória sai de graça.
   */
  async listAll(query: ComputerReportQuery, presence?: PresenceFilter): Promise<ComputerRow[]> {
    const rows = await runQuery(
      this.db
        .select()
        .from(computers)
        .where(buildWhere(query, presence))
        .orderBy(computers.name)
        .limit(REPORT_FETCH_LIMIT),
      'listar computadores para o relatório',
    );

    return rows.sort(compareMachines);
  }

  async findById(id: number): Promise<ComputerRow | null> {
    return runMaybe(
      this.db.select().from(computers).where(eq(computers.id, id)).limit(1),
      'ler computador',
    );
  }

  async findByName(name: string): Promise<ComputerRow | null> {
    return runMaybe(
      this.db.select().from(computers).where(eq(computers.name, name)).limit(1),
      'verificar hostname existente',
    );
  }

  /**
   * Pelo HASH do token: é assim que o agente se identifica, a cada conexão.
   *
   * Não é pelo nome de propósito — alguém renomear a máquina no Windows não pode fazer a
   * telemetria dela parar de achar a ficha.
   */
  async findByTokenHash(tokenHash: string): Promise<ComputerRow | null> {
    return runMaybe(
      this.db.select().from(computers).where(eq(computers.tokenHash, tokenHash)).limit(1),
      'encontrar computador do agente',
    );
  }

  async insert(values: ComputerInsert): Promise<ComputerRow> {
    const [row] = await runQuery(
      this.db.insert(computers).values(values).returning(),
      'cadastrar computador',
    );

    return row as ComputerRow;
  }

  async update(id: number, values: Partial<ComputerInsert>): Promise<ComputerRow> {
    const [row] = await runQuery(
      this.db.update(computers).set(values).where(eq(computers.id, id)).returning(),
      'salvar computador',
    );

    return row as ComputerRow;
  }

  async insertSample(values: ComputerSampleInsert): Promise<void> {
    await runQuery(this.db.insert(computerSamples).values(values), 'gravar amostra de uso');
  }

  /**
   * As amostras de uma máquina desde um instante, da mais antiga para a mais nova.
   *
   * Ordem crescente porque é assim que um gráfico de linha lê: invertida, a linha andaria
   * para trás.
   */
  async listSamplesSince(computerId: number, since: Date): Promise<ComputerSampleRow[]> {
    return runQuery(
      this.db
        .select()
        .from(computerSamples)
        .where(
          and(eq(computerSamples.computerId, computerId), gte(computerSamples.sampledAt, since)),
        )
        .orderBy(computerSamples.sampledAt),
      'ler o uso da máquina',
    );
  }

  /**
   * A limpeza por idade da série.
   *
   * Sem ela a tabela cresce para sempre: uma frota de cinquenta máquinas enviando a cada
   * trinta segundos passa de quatro milhões de linhas por mês. O gráfico só olha as últimas
   * horas, então guardar tudo seria pagar banco para ninguém consultar.
   */
  async deleteSamplesOlderThan(cutoff: Date): Promise<number> {
    /* Sem `returning`: a primeira limpeza pode passar de milhões de linhas, e devolver o id de
       cada uma só para contar seria trazer a tabela inteira de volta pela rede. */
    const result = await runQuery(
      this.db
        .delete(computerSamples)
        .where(sql`${computerSamples.sampledAt} < ${asTimestamp(cutoff)}`),
      'limpar amostras antigas',
    );

    return result.rowCount ?? 0;
  }

  async insertAlert(values: ComputerAlertInsert): Promise<ComputerAlertRow> {
    const [row] = await runQuery(
      this.db.insert(computerAlerts).values(values).returning(),
      'abrir alerta',
    );

    return row as ComputerAlertRow;
  }

  /** O alerta ABERTO daquela medida, se houver — é o que evita abrir um novo a cada leitura. */
  async findActiveAlert(computerId: number, metric: string): Promise<ComputerAlertRow | null> {
    return runMaybe(
      this.db
        .select()
        .from(computerAlerts)
        .where(
          and(
            eq(computerAlerts.computerId, computerId),
            eq(computerAlerts.metric, metric as ComputerAlertRow['metric']),
            eq(computerAlerts.status, 'active'),
          ),
        )
        .limit(1),
      'ler alerta ativo',
    );
  }

  async updateAlert(id: number, values: Partial<ComputerAlertInsert>): Promise<void> {
    await runQuery(
      this.db.update(computerAlerts).set(values).where(eq(computerAlerts.id, id)),
      'atualizar alerta',
    );
  }

  /**
   * UMA PÁGINA de alertas, do mais recente para o mais antigo.
   *
   * Paginada no BANCO, e não na tela: uma máquina ruim acumula centenas de episódios, e
   * trazer todos para cortar no navegador gasta o banco, a rede e a memória do navegador
   * para jogar fora 95% do que veio.
   */
  async listAlerts(computerId: number, query: ComputerAlertListQuery): Promise<ComputerAlertRow[]> {
    return runQuery(
      this.db
        .select()
        .from(computerAlerts)
        .where(eq(computerAlerts.computerId, computerId))
        .orderBy(desc(computerAlerts.startedAt))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      'ler alertas da máquina',
    );
  }

  /** Quantos alertas a máquina tem ao todo — é o total que diz quantas páginas existem. */
  async countAlerts(computerId: number): Promise<number> {
    const [row] = await runQuery(
      this.db
        .select({ total: count() })
        .from(computerAlerts)
        .where(eq(computerAlerts.computerId, computerId)),
      'contar os alertas da máquina',
    );

    return row?.total ?? 0;
  }
}

/** Os filtros que a lista E o relatório têm em comum — nenhum dos dois usa página aqui. */
type ComputerFilter = Pick<
  ComputerListQuery,
  | 'search'
  | 'department'
  | 'healthStatus'
  | 'kind'
  | 'alert'
  | 'preventive'
  | 'includeArchived'
  | 'onlyDisposed'
  | 'disposalType'
>;

/**
 * `ilike` é o `like` que ignora maiúscula e minúscula no Postgres.
 *
 * A máquina arquivada fica de FORA por padrão: ela saiu de uso, e quem abre o inventário está
 * trabalhando com o que está em uso hoje.
 */
function buildWhere(query: ComputerFilter, presence?: PresenceFilter): SQL | undefined {
  const filters: (SQL | undefined)[] = [...lifecycleFilters(query)];

  if (presence) filters.push(presenceFilter(presence));
  if (query.department) filters.push(departmentMatches(computers.department, query.department));
  if (query.healthStatus) filters.push(eq(computers.healthStatus, query.healthStatus));
  if (query.kind) filters.push(eq(computers.kind, query.kind));
  if (query.alert) filters.push(alertFilter(query.alert));
  if (query.preventive) filters.push(preventiveFilter(query.preventive));
  if (query.search) filters.push(searchFilter(query.search));

  return filters.length > 0 ? and(...filters) : undefined;
}

/** Arquivada e descartada: em que ponto da vida a máquina está. Separado para o `buildWhere` caber no limite de complexidade. */
function lifecycleFilters(query: ComputerFilter): SQL[] {
  const filters: SQL[] = [];

  if (!query.includeArchived) filters.push(eq(computers.isArchived, false));

  /* A tela de Descarte pede SÓ as descartadas; todas as outras listas as escondem. Sem este
     par, a máquina que saiu de uso continuaria contando no parque e nos números do painel. */
  filters.push(query.onlyDisposed ? isNotNull(computers.disposedAt) : isNull(computers.disposedAt));
  if (query.disposalType) filters.push(eq(computers.disposalType, query.disposalType));

  return filters;
}

/**
 * Online ou offline, pelos ids conectados agora.
 *
 * Lista vazia significa que ninguém está conectado, não ausência de filtro: "só online" não
 * traz nada, e "só offline" traz todas.
 */
function presenceFilter({ onlineIds, wantOnline }: PresenceFilter): SQL {
  if (onlineIds.length === 0) return wantOnline ? sql`false` : sql`true`;

  const isOnline = inArray(computers.id, onlineIds);
  return wantOnline ? isOnline : sql`not ${isOnline}`;
}

/**
 * A situação da PREVENTIVA, pela mesma régua do selo da tela (`preventiveStatusOf`): a última
 * preventiva ou corretiva (que zera o mesmo relógio) contra o corte de vencimento.
 *
 * Arquivada fica de fora mesmo com "Mostrar arquivadas": saiu de uso, não tem selo de
 * preventiva, e a lista não pode mandar o técnico abrir máquina parada.
 */
function preventiveFilter(preventive: NonNullable<ComputerFilter['preventive']>): SQL {
  const lastOpened = sql`(
    select max(${qualified(maintenances.performedAt)}) from ${maintenances}
    where ${qualified(maintenances.computerId)} = ${qualified(computers.id)}
      and ${qualified(maintenances.type)} in ('preventive', 'corrective')
  )`;
  const cutoff = asTimestamp(preventiveDueBefore());
  const byStatus: Record<typeof preventive, SQL> = {
    needed: sql`(${lastOpened} is null or ${lastOpened} <= ${cutoff})`,
    due: sql`${lastOpened} <= ${cutoff}`,
    never: sql`${lastOpened} is null`,
    ok: sql`${lastOpened} > ${cutoff}`,
  };

  return sql`(${eq(computers.isArchived, false)} and ${byStatus[preventive]})`;
}

/** A máquina com alerta ABERTO agora — de qualquer peça, ou da peça pedida. */
function alertFilter(alert: NonNullable<ComputerFilter['alert']>): SQL {
  /* Colunas com a tabela na frente (`qualified`): sem isso, `id` dentro da subconsulta seria
     o do alerta, e não o da máquina — ver `sql-column.util`. */
  const metric = alert === 'any' ? sql`` : sql` and ${qualified(computerAlerts.metric)} = ${alert}`;

  return exists(sql`(
    select 1 from ${computerAlerts}
    where ${qualified(computerAlerts.computerId)} = ${qualified(computers.id)}
      and ${qualified(computerAlerts.status)} = 'active'
      and ${qualified(computerAlerts.recoveredAt)} is null${metric}
  )`);
}

/** A busca livre olha nome, apelido, hostname, responsável e processador. */
function searchFilter(search: string): SQL | undefined {
  const term = `%${search}%`;

  return or(
    ilike(computers.name, term),
    ilike(computers.displayName, term),
    sql`(${computers.lastSnapshot}->'host'->>'hostname') ilike ${term}`,
    ilike(computers.responsibleName, term),
    ilike(computers.cpuModel, term),
  );
}
