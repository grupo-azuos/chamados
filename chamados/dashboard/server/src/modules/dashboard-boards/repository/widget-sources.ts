import { ALERT_METRIC_LABELS } from '@template/shared/domain/computer-alert.util';
import { HEALTH_STATUS_LABELS } from '@template/shared/domain/computer-health.util';
import { COMPUTER_KIND_LABELS } from '@template/shared/domain/computer-kind.util';
import { INVENTORY_CATEGORY_LABELS } from '@template/shared/domain/inventory-catalog.util';
import {
  DISPOSAL_REASON_LABELS,
  STOCK_MOVEMENT_TYPE_LABELS,
} from '@template/shared/domain/inventory-stock.util';
import {
  QUOTE_KIND_LABELS,
  QUOTE_STATUS_LABELS,
} from '@template/shared/domain/maintenance-quote.util';
import { MAINTENANCE_TYPE_LABELS } from '@template/shared/domain/maintenance.util';
import { MOVEMENT_TYPE_LABELS } from '@template/shared/domain/part-catalog.util';
import {
  SCHEDULE_EVENT_CATEGORY_LABELS,
  SCHEDULE_EVENT_KIND_LABELS,
  SOFTWARE_PROJECT_STATUS_LABELS,
  TIMELINE_EVENT_TYPE_LABELS,
} from '@template/shared/domain/software-project.util';
import { ticketProblemTypeLabel, type TicketArea } from '@template/shared/domain/ticket-catalog.util';
import {
  CLOSED_TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  ticketPriorityLabel,
  type TicketPriority,
} from '@template/shared/domain/ticket-status.util';
import {
  ageBandsOf,
  type DataFieldType,
  type DataSourceKey,
} from '@template/shared/schemas/dashboard-board.schema';
import { sql, type SQL } from 'drizzle-orm';
import { type PgTable } from 'drizzle-orm/pg-core';

import { computerAlerts } from '../../../lib/db/schema/computer-alerts.schema';
import { computers } from '../../../lib/db/schema/computers.schema';
import { inventoryItems } from '../../../lib/db/schema/inventory-items.schema';
import { inventoryMovements } from '../../../lib/db/schema/inventory-movements.schema';
import { maintenanceQuotes } from '../../../lib/db/schema/maintenance-quotes.schema';
import { maintenanceSchedules } from '../../../lib/db/schema/maintenance-schedules.schema';
import { maintenances } from '../../../lib/db/schema/maintenances.schema';
import { partMovements } from '../../../lib/db/schema/part-movements.schema';
import { softwareProjects } from '../../../lib/db/schema/software-projects.schema';
import { softwareScheduleEvents } from '../../../lib/db/schema/software-schedule-events.schema';
import { softwareTimelineEvents } from '../../../lib/db/schema/software-timeline-events.schema';
import { tickets } from '../../../lib/db/schema/tickets.schema';
import { ticketInArea } from '../../../lib/db/ticket-area.util';

/**
 * AS FONTES DE DADOS NO BANCO — a única ponte entre os nomes do contrato (`status`,
 * `createdDay`) e as colunas. O construtor de filtro só fala nomes daqui: um campo fora deste
 * mapa é recusado, e nenhum texto vindo da tela vira pedaço de SQL.
 *
 * Cada fonte é de UM módulo (`DATA_SOURCES[key].module`), e os chamados de cada módulo são só os
 * da área dele (a original ou uma participante): o painel da Infraestrutura nunca conta chamado
 * de Sistema.
 */
export type SourceColumn = {
  expression: SQL;
  type: DataFieldType;
  /** Campo de pessoa: o "eu" do filtro vira o nome de quem vê. */
  person?: 'name';
  /** Texto que não distingue maiúscula: "Trilha" e "trilha" são o mesmo valor no filtro. */
  caseInsensitive?: boolean;
};

export type SourceTable = {
  table: PgTable;
  /** O que conta como "existe": o arquivado (excluído) não entra em painel nenhum. */
  inCirculation: SQL;
  fields: Record<string, SourceColumn>;
  /** A chave de cada grupo; nula é descartada nos agrupamentos no tempo. */
  dimensions: Record<string, SQL>;
  /** O dia em que o registro aconteceu — é sobre ele que o período do bloco recorta. */
  periodDay: SQL;
  /** A DATA de cada agrupamento por dia: é nela que a janela da agenda recorta, no banco. */
  dayDates?: Record<string, SQL>;
  /** O campo de pessoa do "só os meus", quando a fonte tem um. */
  personField?: string;
  /** O rótulo de uma chave, quando ela não é o próprio texto. */
  labelOf?: (dimension: string, key: string) => string;
  /** As FAIXAS DE IDADE da fonte: a data de cada uma e, se só vale para parte, o recorte. */
  ageDates?: Record<string, AgeDate>;
};

/** `only`: os registros que entram na faixa — os outros ficam fora do agrupamento. */
export type AgeDate = { date: SQL; futureLabel?: string; only?: SQL };

const TIME_ZONE = 'America/Sao_Paulo';

/** O dia de hoje em Brasília (`aaaa-mm-dd`) — o "hoje" de todo período e de toda faixa. */
export function todayInBrasilia(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: TIME_ZONE }).format(now);
}

/** O dia de um instante, em Brasília. */
function dayOf(column: unknown): SQL {
  return sql`(${column} at time zone ${TIME_ZONE})::date`;
}

function dayKey(day: SQL): SQL {
  return sql`to_char(${day}, 'YYYY-MM-DD')`;
}

function monthKey(day: SQL): SQL {
  return sql`to_char(${day}, 'YYYY-MM')`;
}

/** A SEMANA de um dia: a segunda-feira dela, escrita como dia (ordena no tempo). */
function weekKey(day: SQL): SQL {
  return sql`to_char(date_trunc('week', ${day}), 'YYYY-MM-DD')`;
}

/** Texto vazio vira o rótulo entre parênteses, para o gráfico não mostrar uma barra sem nome. */
function orNone(column: unknown, label: string): SQL {
  return sql`coalesce(nullif(btrim(${column}), ''), ${label})`;
}

/* "Sim" ou "Não" — a resposta de um campo sim/não, como categoria do gráfico. */
function yesNo(condition: SQL, yes: string, no: string): SQL {
  return sql`(case when ${condition} then ${yes} else ${no} end)`;
}

/**
 * A FAIXA DE IDADE de cada registro: os dias entre a data dele e `today` (o dia de Brasília, que
 * vem do servidor, e não do relógio do banco), na faixa do bloco. Sem data, "(Sem data)"; com a
 * data ainda por vir, o `futureLabel`. As chaves são as de `ageBandsOf`, que ordenam.
 */
export function ageBandExpression(age: AgeDate, bounds: readonly number[], today: string): SQL {
  const days = sql`(${today}::date - ${age.date})`;
  const bands = ageBandsOf(bounds);
  const closed = bands.flatMap((band) =>
    band.to === null ? [] : [sql`when ${days} <= ${band.to} then ${band.key}`],
  );
  const future = age.futureLabel ? sql`when ${days} < 0 then ${age.futureLabel}` : undefined;
  const open = bands[bands.length - 1]!.key;

  return sql`(case when ${age.date} is null then ${NO_DATE_LABEL} ${future ?? sql``} ${sql.join(
    closed,
    sql` `,
  )} else ${open} end)`;
}

export const NO_DATE_LABEL = '(Sem data)';

function labelsFrom(maps: Record<string, Record<string, string>>) {
  return (dimension: string, key: string): string => maps[dimension]?.[key] ?? key;
}

/* ------------------------------------------------------------------ chamados */

const ticketCreatedDay = dayOf(tickets.createdAt);
const ticketResolvedDay = dayOf(tickets.resolvedAt);
const closedList = sql.join(
  CLOSED_TICKET_STATUSES.map((status) => sql`${status}`),
  sql`, `,
);
const ticketIsOpen = sql`${tickets.status} not in (${closedList})`;

/* O nome DIGITADO limpo como o `normalizeSystemName` (shared/src/domain/system-name.util.ts)
   grava: um espaço só, sem pontas, em minúsculas. Assim "Trilha" e "trilha" gravados antes da
   regra já caem no MESMO grupo, mesmo sem a migration ter rodado. */
const typedSystemName = sql.raw(
  `nullif(lower(btrim(regexp_replace("chamados"."tickets"."custom_system_name", '\\s+', ' ', 'g'))), '')`,
);

/* O sistema do chamado de Sistema: o cadastrado; senão, o cadastrado com o MESMO nome do
   digitado (sem olhar maiúscula) — "trilha" digitado e "Trilha" da lista são um sistema só;
   senão, o digitado. A correlação vai escrita por inteiro: dentro de um `sql` cru a coluna
   sairia sem a tabela. */
const ticketProject = sql`coalesce((select project.name from ${softwareProjects} as project where project.id = "chamados"."tickets"."project_id"), (select project.name from ${softwareProjects} as project where lower(btrim(project.name)) = ${typedSystemName} order by project.id limit 1), ${typedSystemName}, '(Sem sistema)')`;

const TICKET_LABELS = {
  status: TICKET_STATUS_LABELS as Record<string, string>,
};

function ticketSource(area: TicketArea, withProject = false): SourceTable {
  return {
    table: tickets,
    inCirculation: ticketInArea(area),
    fields: {
      status: { expression: sql`${tickets.status}`, type: 'enum' },
      priority: { expression: sql`${tickets.priority}`, type: 'enum' },
      department: { expression: sql`${tickets.department}`, type: 'text' },
      problemType: { expression: sql`${tickets.problemType}`, type: 'text' },
      assignee: { expression: sql`${tickets.assignee}`, type: 'text', person: 'name' },
      requester: { expression: sql`${tickets.requesterName}`, type: 'text' },
      isOpen: { expression: ticketIsOpen, type: 'boolean' },
      createdAt: { expression: ticketCreatedDay, type: 'date' },
      resolvedAt: { expression: ticketResolvedDay, type: 'date' },
      ...(withProject
        ? { project: { expression: ticketProject, type: 'text' as const, caseInsensitive: true } }
        : {}),
    },
    dimensions: {
      status: sql`${tickets.status}`,
      priority: sql`${tickets.priority}`,
      department: orNone(tickets.department, '(Sem departamento)'),
      problemType: orNone(tickets.problemType, '(Sem tipo)'),
      assignee: orNone(tickets.assignee, '(Sem responsável)'),
      requester: orNone(tickets.requesterName, '(Sem nome)'),
      open: yesNo(ticketIsOpen, 'Em aberto', 'Resolvido'),
      createdDay: dayKey(ticketCreatedDay),
      createdWeek: weekKey(ticketCreatedDay),
      createdMonth: monthKey(ticketCreatedDay),
      resolvedDay: dayKey(ticketResolvedDay),
      resolvedWeek: weekKey(ticketResolvedDay),
      resolvedMonth: monthKey(ticketResolvedDay),
      ...(withProject ? { project: ticketProject } : {}),
    },
    periodDay: ticketCreatedDay,
    dayDates: { createdDay: ticketCreatedDay, resolvedDay: ticketResolvedDay },
    personField: 'assignee',
    labelOf: (dimension, key) => {
      if (dimension === 'priority') return ticketPriorityLabel(key as TicketPriority) ?? key;
      if (dimension === 'problemType') return ticketProblemTypeLabel(key);

      return labelsFrom(TICKET_LABELS)(dimension, key);
    },
    ageDates: { openAge: { date: ticketCreatedDay, only: ticketIsOpen } },
  };
}

/* ------------------------------------------------------------------ infraestrutura */

const computerInUse = sql`${computers.isArchived} = false and ${computers.disposedAt} is null`;
const computerCreatedDay = dayOf(computers.createdAt);
const computerSeenDay = dayOf(computers.lastSeenAt);

/* O nome da máquina de uma linha que aponta para ela — ou o equipamento digitado à mão. */
function machineOf(computerIdColumn: string, fallback?: unknown): SQL {
  const name = sql.raw(
    `(select coalesce(machine.display_name, machine.name) from "chamados"."computers" as machine where machine.id = ${computerIdColumn})`,
  );

  return fallback === undefined
    ? sql`coalesce(${name}, '(Sem máquina)')`
    : sql`coalesce(${name}, nullif(btrim(${fallback}), ''), '(Sem máquina)')`;
}

const maintenanceDay = dayOf(maintenances.performedAt);
const maintenanceMachine = machineOf('"chamados"."maintenances"."computer_id"', maintenances.otherMachine);
const scheduleDay = sql`${maintenanceSchedules.scheduledFor}::date`;
const scheduleMachine = machineOf('"chamados"."maintenance_schedules"."computer_id"');
const movementDay = dayOf(partMovements.createdAt);
const movementPart = sql`coalesce((select part.name from "chamados"."parts" as part where part.id = "chamados"."part_movements"."part_id"), '(Sem peça)')`;
const alertDay = dayOf(computerAlerts.startedAt);
const alertMachine = machineOf('"chamados"."computer_alerts"."computer_id"');

/* ------------------------------------------------------------------ sistema */

const projectCreatedDay = dayOf(softwareProjects.createdAt);
const activityDay = dayOf(softwareTimelineEvents.eventDate);
const activityAuthor = sql`coalesce(nullif(btrim(${softwareTimelineEvents.authorName}), ''), nullif(btrim(${softwareTimelineEvents.author}), ''), '(Sem autoria)')`;
const activityProject = sql`coalesce((select project.name from "chamados"."software_projects" as project where project.id = "chamados"."software_timeline_events"."project_id"), '(Sem sistema)')`;
const eventDay = sql`${softwareScheduleEvents.date}::date`;
const eventAuthor = sql`coalesce(nullif(btrim(${softwareScheduleEvents.createdByName}), ''), ${softwareScheduleEvents.createdBy})`;
const eventProject = sql`coalesce((select project.name from "chamados"."software_projects" as project where project.id = "chamados"."software_schedule_events"."project_id"), '(Sem sistema)')`;

/* ------------------------------------------------------------------ manutenção */

const itemCreatedDay = dayOf(inventoryItems.createdAt);
const stockMovementDay = dayOf(inventoryMovements.createdAt);
const stockItem = sql`coalesce((select item.name from "chamados"."inventory_items" as item where item.id = "chamados"."inventory_movements"."item_id"), '(Sem produto)')`;
const quoteCreatedDay = dayOf(maintenanceQuotes.createdAt);
const quoteDecidedDay = dayOf(maintenanceQuotes.decidedAt);

export const SOURCE_TABLES: Record<DataSourceKey, SourceTable> = {
  infraTickets: ticketSource('infra'),
  systemTickets: ticketSource('sistema', true),
  maintenanceTickets: ticketSource('manutencao'),

  computers: {
    table: computers,
    inCirculation: computerInUse,
    fields: {
      department: { expression: sql`${computers.department}`, type: 'text' },
      kind: { expression: sql`${computers.kind}`, type: 'enum' },
      healthStatus: { expression: sql`${computers.healthStatus}`, type: 'enum' },
      responsible: { expression: sql`${computers.responsibleName}`, type: 'text', person: 'name' },
      isBlocked: { expression: sql`${computers.isBlocked}`, type: 'boolean' },
      createdAt: { expression: computerCreatedDay, type: 'date' },
      lastSeenAt: { expression: computerSeenDay, type: 'date' },
    },
    dimensions: {
      department: orNone(computers.department, '(Sem departamento)'),
      kind: sql`coalesce(${computers.kind}, '(Sem tipo)')`,
      healthStatus: sql`coalesce(${computers.healthStatus}, '(Sem leitura)')`,
      responsible: orNone(computers.responsibleName, '(Sem responsável)'),
      createdMonth: monthKey(computerCreatedDay),
    },
    periodDay: computerCreatedDay,
    personField: 'responsible',
    labelOf: labelsFrom({
      kind: COMPUTER_KIND_LABELS,
      healthStatus: HEALTH_STATUS_LABELS,
    }),
    ageDates: { silentAge: { date: computerSeenDay } },
  },
  maintenances: {
    table: maintenances,
    inCirculation: sql`${maintenances.archivedAt} is null`,
    fields: {
      type: { expression: sql`${maintenances.type}`, type: 'enum' },
      performedBy: { expression: sql`${maintenances.performedBy}`, type: 'text', person: 'name' },
      machine: { expression: maintenanceMachine, type: 'text' },
      performedAt: { expression: maintenanceDay, type: 'date' },
    },
    dimensions: {
      type: sql`${maintenances.type}`,
      performedBy: orNone(maintenances.performedBy, '(Sem nome)'),
      machine: maintenanceMachine,
      day: dayKey(maintenanceDay),
      week: weekKey(maintenanceDay),
      month: monthKey(maintenanceDay),
    },
    periodDay: maintenanceDay,
    dayDates: { day: maintenanceDay },
    personField: 'performedBy',
    labelOf: labelsFrom({ type: MAINTENANCE_TYPE_LABELS }),
  },
  maintenanceSchedules: {
    table: maintenanceSchedules,
    inCirculation: sql`${maintenanceSchedules.archivedAt} is null and exists (select 1 from "chamados"."computers" as machine where machine.id = "chamados"."maintenance_schedules"."computer_id" and machine.is_archived = false and machine.disposed_at is null)`,
    fields: {
      machine: { expression: scheduleMachine, type: 'text' },
      scheduledFor: { expression: scheduleDay, type: 'date' },
    },
    dimensions: {
      machine: scheduleMachine,
      day: dayKey(scheduleDay),
      week: weekKey(scheduleDay),
      month: monthKey(scheduleDay),
    },
    periodDay: scheduleDay,
    dayDates: { day: scheduleDay },
  },
  partMovements: {
    table: partMovements,
    inCirculation: sql`${partMovements.archivedAt} is null`,
    fields: {
      type: { expression: sql`${partMovements.type}`, type: 'enum' },
      part: { expression: movementPart, type: 'text' },
      handledBy: { expression: sql`${partMovements.handledBy}`, type: 'text', person: 'name' },
      createdAt: { expression: movementDay, type: 'date' },
    },
    dimensions: {
      type: sql`${partMovements.type}`,
      part: movementPart,
      handledBy: orNone(partMovements.handledBy, '(Sem nome)'),
      day: dayKey(movementDay),
      week: weekKey(movementDay),
      month: monthKey(movementDay),
    },
    periodDay: movementDay,
    dayDates: { day: movementDay },
    personField: 'handledBy',
    labelOf: labelsFrom({ type: MOVEMENT_TYPE_LABELS }),
  },
  computerAlerts: {
    table: computerAlerts,
    inCirculation: sql`true`,
    fields: {
      metric: { expression: sql`${computerAlerts.metric}`, type: 'enum' },
      isActive: { expression: sql`${computerAlerts.status} = 'active'`, type: 'boolean' },
      machine: { expression: alertMachine, type: 'text' },
      startedAt: { expression: alertDay, type: 'date' },
    },
    dimensions: {
      metric: sql`${computerAlerts.metric}`,
      machine: alertMachine,
      day: dayKey(alertDay),
      week: weekKey(alertDay),
      month: monthKey(alertDay),
    },
    periodDay: alertDay,
    dayDates: { day: alertDay },
    labelOf: labelsFrom({ metric: ALERT_METRIC_LABELS }),
  },

  softwareProjects: {
    table: softwareProjects,
    inCirculation: sql`${softwareProjects.archivedAt} is null`,
    fields: {
      status: { expression: sql`${softwareProjects.status}`, type: 'enum' },
      responsible: {
        expression: sql`${softwareProjects.responsibleName}`,
        type: 'text',
        person: 'name',
      },
      createdAt: { expression: projectCreatedDay, type: 'date' },
    },
    dimensions: {
      status: sql`${softwareProjects.status}`,
      responsible: orNone(softwareProjects.responsibleName, '(Sem responsável)'),
      createdMonth: monthKey(projectCreatedDay),
    },
    periodDay: projectCreatedDay,
    personField: 'responsible',
    labelOf: labelsFrom({ status: SOFTWARE_PROJECT_STATUS_LABELS }),
  },
  softwareActivity: {
    table: softwareTimelineEvents,
    inCirculation: sql`exists (select 1 from "chamados"."software_projects" as project where project.id = "chamados"."software_timeline_events"."project_id" and project.archived_at is null)`,
    fields: {
      type: { expression: sql`${softwareTimelineEvents.type}`, type: 'enum' },
      author: { expression: activityAuthor, type: 'text', person: 'name' },
      project: { expression: activityProject, type: 'text', caseInsensitive: true },
      eventDate: { expression: activityDay, type: 'date' },
    },
    dimensions: {
      type: sql`${softwareTimelineEvents.type}`,
      author: activityAuthor,
      project: activityProject,
      day: dayKey(activityDay),
      week: weekKey(activityDay),
      month: monthKey(activityDay),
    },
    periodDay: activityDay,
    dayDates: { day: activityDay },
    personField: 'author',
    labelOf: labelsFrom({ type: TIMELINE_EVENT_TYPE_LABELS }),
  },
  scheduleEvents: {
    table: softwareScheduleEvents,
    inCirculation: sql`${softwareScheduleEvents.archivedAt} is null`,
    fields: {
      category: { expression: sql`${softwareScheduleEvents.category}`, type: 'enum' },
      kind: { expression: sql`${softwareScheduleEvents.kind}`, type: 'enum' },
      createdBy: { expression: eventAuthor, type: 'text', person: 'name' },
      project: { expression: eventProject, type: 'text', caseInsensitive: true },
      date: { expression: eventDay, type: 'date' },
    },
    dimensions: {
      category: sql`${softwareScheduleEvents.category}`,
      kind: sql`${softwareScheduleEvents.kind}`,
      createdBy: eventAuthor,
      project: eventProject,
      day: dayKey(eventDay),
      week: weekKey(eventDay),
      month: monthKey(eventDay),
    },
    periodDay: eventDay,
    dayDates: { day: eventDay },
    personField: 'createdBy',
    labelOf: labelsFrom({
      category: SCHEDULE_EVENT_CATEGORY_LABELS,
      kind: SCHEDULE_EVENT_KIND_LABELS,
    }),
  },

  inventoryItems: {
    table: inventoryItems,
    inCirculation: sql`${inventoryItems.archivedAt} is null`,
    fields: {
      category: { expression: sql`${inventoryItems.category}`, type: 'enum' },
      department: { expression: sql`${inventoryItems.department}`, type: 'text' },
      responsible: { expression: sql`${inventoryItems.userName}`, type: 'text', person: 'name' },
      isOutOfStock: { expression: sql`${inventoryItems.balance} = 0`, type: 'boolean' },
      createdAt: { expression: itemCreatedDay, type: 'date' },
    },
    dimensions: {
      category: sql`${inventoryItems.category}`,
      department: orNone(inventoryItems.department, '(Sem departamento)'),
      responsible: orNone(inventoryItems.userName, '(Com ninguém)'),
      stock: yesNo(sql`${inventoryItems.balance} = 0`, 'Sem saldo', 'Com saldo'),
      createdMonth: monthKey(itemCreatedDay),
    },
    periodDay: itemCreatedDay,
    personField: 'responsible',
    labelOf: labelsFrom({ category: INVENTORY_CATEGORY_LABELS }),
  },
  inventoryMovements: {
    table: inventoryMovements,
    inCirculation: sql`true`,
    fields: {
      type: { expression: sql`${inventoryMovements.type}`, type: 'enum' },
      reason: { expression: sql`${inventoryMovements.reason}`, type: 'enum' },
      item: { expression: stockItem, type: 'text' },
      createdAt: { expression: stockMovementDay, type: 'date' },
    },
    dimensions: {
      type: sql`${inventoryMovements.type}`,
      reason: sql`coalesce(${inventoryMovements.reason}, '(Não é descarte)')`,
      item: stockItem,
      day: dayKey(stockMovementDay),
      week: weekKey(stockMovementDay),
      month: monthKey(stockMovementDay),
    },
    periodDay: stockMovementDay,
    dayDates: { day: stockMovementDay },
    labelOf: labelsFrom({ type: STOCK_MOVEMENT_TYPE_LABELS, reason: DISPOSAL_REASON_LABELS }),
  },
  quotes: {
    table: maintenanceQuotes,
    inCirculation: sql`${maintenanceQuotes.archivedAt} is null`,
    fields: {
      status: { expression: sql`${maintenanceQuotes.status}`, type: 'enum' },
      kind: { expression: sql`${maintenanceQuotes.kind}`, type: 'enum' },
      supplier: { expression: sql`${maintenanceQuotes.supplier}`, type: 'text' },
      createdAt: { expression: quoteCreatedDay, type: 'date' },
      decidedAt: { expression: quoteDecidedDay, type: 'date' },
    },
    dimensions: {
      status: sql`${maintenanceQuotes.status}`,
      kind: sql`${maintenanceQuotes.kind}`,
      supplier: orNone(maintenanceQuotes.supplier, '(Sem empresa)'),
      createdMonth: monthKey(quoteCreatedDay),
      decidedMonth: monthKey(quoteDecidedDay),
    },
    periodDay: quoteCreatedDay,
    labelOf: labelsFrom({ status: QUOTE_STATUS_LABELS, kind: QUOTE_KIND_LABELS }),
  },
};
