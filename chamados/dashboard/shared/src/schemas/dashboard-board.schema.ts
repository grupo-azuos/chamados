import { z } from 'zod';

import { ALERT_METRICS } from '../domain/computer-alert.util';
import { HEALTH_STATUSES } from '../domain/computer-health.util';
import { COMPUTER_KINDS } from '../domain/computer-kind.util';
import { INVENTORY_CATEGORIES } from '../domain/inventory-catalog.util';
import { DISPOSAL_REASONS, STOCK_MOVEMENT_TYPES } from '../domain/inventory-stock.util';
import { QUOTE_KINDS, QUOTE_STATUSES } from '../domain/maintenance-quote.util';
import { MAINTENANCE_TYPES } from '../domain/maintenance.util';
import { MOVEMENT_TYPES } from '../domain/part-catalog.util';
import { ROLE_CONTEXTS, type RoleContext } from '../domain/role-context.util';
import {
  SCHEDULE_EVENT_CATEGORIES,
  SCHEDULE_EVENT_KINDS,
  SOFTWARE_PROJECT_STATUSES,
  TIMELINE_EVENT_TYPES,
} from '../domain/software-project.util';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '../domain/ticket-status.util';
import { archiveSchema } from './archive.schema';

/**
 * OS PAINÉIS QUE A PESSOA MONTA — cada MÓDULO (Infraestrutura, Sistema, Manutenção) tem os seus,
 * com as fontes de dados só dele: um não enxerga nem interfere no outro. Em cada módulo, três:
 *
 * - `team` (Equipe): todos do módulo veem; o administrador do módulo edita.
 * - `manager` (Gestor): só o gestor e o administrador do módulo veem e editam.
 * - `personal` (Pessoal): só quem é dono vê e edita — um por pessoa, em cada módulo.
 *
 * Cada um é um canvas de 4 colunas com blocos até a cota de pontos (`MAX_BOARD_WEIGHT`, o peso
 * de cada bloco está em `WIDGET_WEIGHTS`). Cada bloco ocupa no mínimo duas casas (duas de
 * largura ou duas de altura) — menos o card com anel, que cabe numa —, e mostra uma FONTE de
 * dados agrupada por um
 * campo, com um FILTRO salvo opcional. Os filtros são do sistema: montados uma vez, servem a
 * qualquer dashboard (e às listas), e podem ser só de quem criou ou compartilhados.
 */
export const DASHBOARD_SCOPES = ['team', 'manager', 'personal'] as const;
export const dashboardScopeSchema = z.enum(DASHBOARD_SCOPES);
export type DashboardScope = z.infer<typeof dashboardScopeSchema>;

export const DASHBOARD_SCOPE_LABELS: Record<DashboardScope, string> = {
  team: 'Equipe',
  manager: 'Gestor',
  personal: 'Pessoal',
};

/** O módulo dono do painel — o mesmo contexto do acesso (`infra`, `sistema`, `manutencao`). */
export const boardModuleSchema = z.enum(ROLE_CONTEXTS);
export type BoardModule = RoleContext;

/**
 * O teto de blocos é só a trava da lista: quem limita o painel é a cota de pontos
 * (`MAX_BOARD_WEIGHT`), e com o bloco mais leve valendo 1 ponto cabem no máximo 24.
 */
export const MAX_WIDGETS = 24;
export const GRID_COLUMNS = 4;
export const MAX_GRID_ROWS = 40;
export const MAX_STAT_CARDS = 4;

/* ---------------------------------------------------------------- fontes de dados */

export type DataFieldType = 'enum' | 'text' | 'date' | 'boolean';

export type DataField = {
  label: string;
  type: DataFieldType;
  /** As opções de um campo `enum` — o que o construtor de filtro oferece. */
  options?: readonly string[];
  /** O campo guarda o nome de uma pessoa: o filtro aceita "eu" (`ME_VALUE`). */
  isPerson?: boolean;
};

/**
 * "EU" NUM FILTRO — o valor que quer dizer "quem está vendo". Um filtro salvo com ele serve a
 * todo mundo: no painel da Equipe, cada pessoa vê o dela. O servidor troca pelo nome de quem
 * pede antes de consultar; nunca chega ao banco como texto.
 */
export const ME_VALUE = '@me';

/**
 * DATA RELATIVA NUM FILTRO — "hoje", "hoje + N dias", "hoje − N dias", "início do mês" e "início da
 * semana". Um filtro salvo com ela continua certo amanhã sem ninguém mexer: "vence antes de hoje"
 * é sempre o hoje de quem pergunta. O servidor troca pelo dia, em Brasília, antes de consultar.
 */
export const RELATIVE_DAYS = ['@today', '@monthStart', '@weekStart'] as const;
const RELATIVE_DAY_PATTERN = /^@today(?:([+-])(\d{1,4}))?$|^@monthStart$|^@weekStart$/;

export function isRelativeDay(value: unknown): value is string {
  return typeof value === 'string' && RELATIVE_DAY_PATTERN.test(value);
}

/** "@today+3" a partir de um número de dias (negativo é para trás). */
export function relativeDayOf(offsetDays: number): string {
  if (offsetDays === 0) return '@today';

  return offsetDays > 0 ? `@today+${offsetDays}` : `@today-${-offsetDays}`;
}

/** Quantos dias a partir de hoje um "@today±N" diz; nulo nos outros. */
export function relativeOffsetOf(value: string): number | null {
  const match = /^@today(?:([+-])(\d{1,4}))?$/.exec(value);
  if (!match) return null;

  return match[1] === '-' ? -Number(match[2]) : Number(match[2] ?? 0);
}

/**
 * O dia (`aaaa-mm-dd`) de uma data relativa, a partir de `today` (o dia de Brasília). A semana
 * começa na SEGUNDA, como o agrupamento por semana. Valor que não é relativo volta como veio.
 */
export function resolveRelativeDay(value: string, today: string): string {
  if (value === '@monthStart') return `${today.slice(0, 7)}-01`;
  if (value === '@weekStart') {
    const weekday = new Date(`${today}T00:00:00.000Z`).getUTCDay();

    return shiftDay(today, -((weekday + 6) % 7));
  }
  const offset = relativeOffsetOf(value);

  return offset === null ? value : shiftDay(today, offset);
}

function shiftDay(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

/** "Hoje", "Hoje + 3 dias", "Início do mês" — o valor relativo escrito para quem lê. */
export function relativeDayLabel(value: string): string {
  if (value === '@monthStart') return 'Início do mês';
  if (value === '@weekStart') return 'Início da semana';
  const offset = relativeOffsetOf(value) ?? 0;
  if (offset === 0) return 'Hoje';
  const days = Math.abs(offset) === 1 ? 'dia' : 'dias';

  return `Hoje ${offset > 0 ? '+' : '−'} ${Math.abs(offset)} ${days}`;
}

/**
 * Como um bloco agrupa: por categoria (barra, rosca, lista), no tempo — por dia, semana (de segunda
 * a domingo) ou mês (área, calendário) — ou por FAIXA DE IDADE: os dias entre uma data do registro
 * e hoje, em faixas ("0 a 2 dias", "31 dias ou mais"). A faixa se agrupa como uma categoria.
 */
export type DataDimensionKind = 'category' | 'day' | 'week' | 'month' | 'age';
export type DataDimension = { label: string; kind: DataDimensionKind };

/** Os agrupamentos no tempo — os que a linha, o acumulado e os calendários aceitam. */
export function isTimeDimension(kind: DataDimensionKind): boolean {
  return kind === 'day' || kind === 'week' || kind === 'month';
}

/** Os agrupamentos que se leem como categoria — inclusive a faixa de idade. */
export function isCategoryDimension(kind: DataDimensionKind): boolean {
  return kind === 'category' || kind === 'age';
}

/**
 * AS FAIXAS DE IDADE — os limites de cima de cada faixa, em dias. [2, 7, 15, 30] são as faixas
 * "0 a 2", "3 a 7", "8 a 15", "16 a 30" e "31 ou mais". Quem monta o bloco escolhe as suas.
 */
export const DEFAULT_AGE_BANDS: readonly number[] = [2, 7, 15, 30];
export const MAX_AGE_BAND_DAYS = 9999;

/**
 * As faixas de um bloco, de baixo para cima: a chave é ORDENÁVEL ("0000-0002" vem antes de
 * "0031+"), e é ela que o banco devolve e o clique leva; o rótulo é o que a tela escreve.
 */
export function ageBandsOf(bounds: readonly number[] = DEFAULT_AGE_BANDS): {
  from: number;
  to: number | null;
  key: string;
}[] {
  const bands = bounds.map((to, index) => {
    const from = index === 0 ? 0 : bounds[index - 1]! + 1;

    return { from, to: to as number | null, key: `${pad(from)}-${pad(to)}` };
  });
  const last = bounds.length === 0 ? 0 : bounds[bounds.length - 1]! + 1;

  return [...bands, { from: last, to: null, key: `${pad(last)}+` }];
}

/** "0000-0002" é "0 a 2 dias"; "0031+", "31 dias ou mais"; "(Sem data)" fica como está. */
export function ageBandLabel(key: string): string {
  const open = /^(\d{4})\+$/.exec(key);
  if (open) return `${Number(open[1])} dias ou mais`;
  const closed = /^(\d{4})-(\d{4})$/.exec(key);
  if (!closed) return key;
  const [from, to] = [Number(closed[1]), Number(closed[2])];

  return from === to ? `${from} ${from === 1 ? 'dia' : 'dias'}` : `${from} a ${to} dias`;
}

function pad(days: number): string {
  return String(days).padStart(4, '0');
}

/** As faixas de um bloco: limites crescentes, de 1 a 8, até 9999 dias. */
export const ageBandsSchema = z
  .array(z.number().int().min(0).max(MAX_AGE_BAND_DAYS))
  .min(1, 'Ponha ao menos um limite')
  .max(8, 'No máximo 8 faixas')
  .refine((bounds) => bounds.every((to, index) => index === 0 || to > bounds[index - 1]!), {
    message: 'Os limites das faixas vão do menor para o maior',
  });

export type DataSource = {
  /** O módulo dono da fonte: o painel de um módulo só oferece as fontes dele. */
  module: BoardModule;
  label: string;
  /** O que se conta, no plural: "chamados". */
  noun: string;
  /** O que a fonte conta, quando o nome não diz tudo — o editor mostra embaixo da escolha. */
  description?: string;
  fields: Record<string, DataField>;
  dimensions: Record<string, DataDimension>;
};

/**
 * Os campos e agrupamentos de um CHAMADO — iguais nos três módulos, porque o chamado é o mesmo.
 * Cada módulo tem a SUA fonte de chamados (só os da área dele, contando as participantes): o
 * painel da Infraestrutura nunca soma chamado de Sistema.
 */
const TICKET_FIELDS = {
  status: { label: 'Situação', type: 'enum', options: TICKET_STATUSES },
  priority: { label: 'Prioridade', type: 'enum', options: TICKET_PRIORITIES },
  department: { label: 'Departamento', type: 'text' },
  problemType: { label: 'Tipo de problema', type: 'text' },
  assignee: { label: 'Responsável', type: 'text', isPerson: true },
  requester: { label: 'Quem abriu', type: 'text' },
  isOpen: { label: 'Em aberto', type: 'boolean' },
  createdAt: { label: 'Aberto em', type: 'date' },
  resolvedAt: { label: 'Resolvido em', type: 'date' },
} as const satisfies Record<string, DataField>;

const TICKET_DIMENSIONS = {
  status: { label: 'Situação', kind: 'category' },
  priority: { label: 'Prioridade', kind: 'category' },
  department: { label: 'Departamento', kind: 'category' },
  problemType: { label: 'Tipo de problema', kind: 'category' },
  assignee: { label: 'Responsável', kind: 'category' },
  requester: { label: 'Quem abriu', kind: 'category' },
  open: { label: 'Em aberto ou resolvido', kind: 'category' },
  createdDay: { label: 'Abertos (por dia)', kind: 'day' },
  createdWeek: { label: 'Abertos (por semana)', kind: 'week' },
  createdMonth: { label: 'Abertos (por mês)', kind: 'month' },
  resolvedDay: { label: 'Resolvidos (por dia)', kind: 'day' },
  resolvedWeek: { label: 'Resolvidos (por semana)', kind: 'week' },
  resolvedMonth: { label: 'Resolvidos (por mês)', kind: 'month' },
  /* Os dias desde a abertura, só dos que ainda estão em aberto. */
  openAge: { label: 'Dias em aberto (faixas)', kind: 'age' },
} as const satisfies Record<string, DataDimension>;

export const DATA_SOURCES = {
  /* ------------------------------------------------------------ Infraestrutura */
  infraTickets: {
    module: 'infra',
    label: 'Chamados',
    noun: 'chamados',
    description: 'Os chamados da Infraestrutura, contando os que têm a área como participante.',
    fields: TICKET_FIELDS,
    dimensions: TICKET_DIMENSIONS,
  },
  computers: {
    module: 'infra',
    label: 'Máquinas',
    noun: 'máquinas',
    description: 'As máquinas em uso — as arquivadas e as descartadas ficam de fora.',
    fields: {
      department: { label: 'Departamento', type: 'text' },
      kind: { label: 'Tipo', type: 'enum', options: COMPUTER_KINDS },
      healthStatus: { label: 'Saúde', type: 'enum', options: HEALTH_STATUSES },
      responsible: { label: 'Responsável', type: 'text', isPerson: true },
      isBlocked: { label: 'Bloqueada', type: 'boolean' },
      createdAt: { label: 'Cadastrada em', type: 'date' },
      lastSeenAt: { label: 'Visto por último', type: 'date' },
    },
    dimensions: {
      department: { label: 'Departamento', kind: 'category' },
      kind: { label: 'Tipo', kind: 'category' },
      healthStatus: { label: 'Saúde', kind: 'category' },
      responsible: { label: 'Responsável', kind: 'category' },
      createdMonth: { label: 'Cadastradas (por mês)', kind: 'month' },
      /* Os dias desde a última leitura do agente: a máquina que sumiu aparece aqui. */
      silentAge: { label: 'Dias sem notícia (faixas)', kind: 'age' },
    },
  },
  maintenances: {
    module: 'infra',
    label: 'Manutenções',
    noun: 'manutenções',
    description: 'O que já foi feito nas máquinas — as excluídas ficam de fora.',
    fields: {
      type: { label: 'Tipo', type: 'enum', options: MAINTENANCE_TYPES },
      performedBy: { label: 'Quem fez', type: 'text', isPerson: true },
      machine: { label: 'Máquina', type: 'text' },
      performedAt: { label: 'Feita em', type: 'date' },
    },
    dimensions: {
      type: { label: 'Tipo', kind: 'category' },
      performedBy: { label: 'Quem fez', kind: 'category' },
      machine: { label: 'Máquina', kind: 'category' },
      day: { label: 'Por dia', kind: 'day' },
      week: { label: 'Por semana', kind: 'week' },
      month: { label: 'Por mês', kind: 'month' },
    },
  },
  maintenanceSchedules: {
    module: 'infra',
    label: 'Manutenções agendadas',
    noun: 'agendamentos',
    description: 'Os agendamentos em aberto das máquinas em uso.',
    fields: {
      machine: { label: 'Máquina', type: 'text' },
      scheduledFor: { label: 'Agendada para', type: 'date' },
    },
    dimensions: {
      machine: { label: 'Máquina', kind: 'category' },
      day: { label: 'Por dia', kind: 'day' },
      week: { label: 'Por semana', kind: 'week' },
      month: { label: 'Por mês', kind: 'month' },
    },
  },
  partMovements: {
    module: 'infra',
    label: 'Movimentações de peças',
    noun: 'movimentações',
    description: 'As entradas e saídas do depósito da TI — as estornadas ficam de fora.',
    fields: {
      type: { label: 'Entrada ou saída', type: 'enum', options: MOVEMENT_TYPES },
      part: { label: 'Peça', type: 'text' },
      handledBy: { label: 'Quem pegou', type: 'text', isPerson: true },
      createdAt: { label: 'Registrada em', type: 'date' },
    },
    dimensions: {
      type: { label: 'Entrada ou saída', kind: 'category' },
      part: { label: 'Peça', kind: 'category' },
      handledBy: { label: 'Quem pegou', kind: 'category' },
      day: { label: 'Por dia', kind: 'day' },
      week: { label: 'Por semana', kind: 'week' },
      month: { label: 'Por mês', kind: 'month' },
    },
  },
  computerAlerts: {
    module: 'infra',
    label: 'Picos de uso',
    noun: 'picos',
    description: 'As vezes em que uma máquina passou do limite de CPU, memória ou disco.',
    fields: {
      metric: { label: 'Recurso', type: 'enum', options: ALERT_METRICS },
      isActive: { label: 'Ainda acima do limite', type: 'boolean' },
      machine: { label: 'Máquina', type: 'text' },
      startedAt: { label: 'Começou em', type: 'date' },
    },
    dimensions: {
      metric: { label: 'Recurso', kind: 'category' },
      machine: { label: 'Máquina', kind: 'category' },
      day: { label: 'Por dia', kind: 'day' },
      week: { label: 'Por semana', kind: 'week' },
      month: { label: 'Por mês', kind: 'month' },
    },
  },
  /* ------------------------------------------------------------ Sistema */
  systemTickets: {
    module: 'sistema',
    label: 'Chamados',
    noun: 'chamados',
    description: 'Os chamados de Sistema, contando os que têm a área como participante.',
    fields: { ...TICKET_FIELDS, project: { label: 'Sistema', type: 'text' } },
    dimensions: { ...TICKET_DIMENSIONS, project: { label: 'Sistema', kind: 'category' } },
  },
  softwareProjects: {
    module: 'sistema',
    label: 'Sistemas',
    noun: 'sistemas',
    description: 'Os sistemas e projetos da equipe — os excluídos ficam de fora.',
    fields: {
      status: { label: 'Situação', type: 'enum', options: SOFTWARE_PROJECT_STATUSES },
      responsible: { label: 'Responsável', type: 'text', isPerson: true },
      createdAt: { label: 'Cadastrado em', type: 'date' },
    },
    dimensions: {
      status: { label: 'Situação', kind: 'category' },
      responsible: { label: 'Responsável', kind: 'category' },
      createdMonth: { label: 'Cadastrados (por mês)', kind: 'month' },
    },
  },
  softwareActivity: {
    module: 'sistema',
    label: 'Atividade no GitHub',
    noun: 'eventos',
    description: 'PRs, issues, merges, versões e deploys dos sistemas, como o GitHub conta.',
    fields: {
      type: { label: 'O que foi', type: 'enum', options: TIMELINE_EVENT_TYPES },
      author: { label: 'Quem fez', type: 'text', isPerson: true },
      project: { label: 'Sistema', type: 'text' },
      eventDate: { label: 'Quando', type: 'date' },
    },
    dimensions: {
      type: { label: 'O que foi', kind: 'category' },
      author: { label: 'Quem fez', kind: 'category' },
      project: { label: 'Sistema', kind: 'category' },
      day: { label: 'Por dia', kind: 'day' },
      week: { label: 'Por semana', kind: 'week' },
      month: { label: 'Por mês', kind: 'month' },
    },
  },
  scheduleEvents: {
    module: 'sistema',
    label: 'Agenda',
    noun: 'itens da agenda',
    description: 'Os compromissos e registros da Agenda — os excluídos ficam de fora.',
    fields: {
      category: { label: 'Categoria', type: 'enum', options: SCHEDULE_EVENT_CATEGORIES },
      kind: { label: 'Compromisso ou registro', type: 'enum', options: SCHEDULE_EVENT_KINDS },
      createdBy: { label: 'Quem marcou', type: 'text', isPerson: true },
      project: { label: 'Sistema', type: 'text' },
      date: { label: 'Dia', type: 'date' },
    },
    dimensions: {
      category: { label: 'Categoria', kind: 'category' },
      kind: { label: 'Compromisso ou registro', kind: 'category' },
      createdBy: { label: 'Quem marcou', kind: 'category' },
      project: { label: 'Sistema', kind: 'category' },
      day: { label: 'Por dia', kind: 'day' },
      week: { label: 'Por semana', kind: 'week' },
      month: { label: 'Por mês', kind: 'month' },
    },
  },
  /* ------------------------------------------------------------ Manutenção */
  maintenanceTickets: {
    module: 'manutencao',
    label: 'Chamados',
    noun: 'chamados',
    description: 'Os chamados da Manutenção, contando os que têm a área como participante.',
    fields: TICKET_FIELDS,
    dimensions: TICKET_DIMENSIONS,
  },
  inventoryItems: {
    module: 'manutencao',
    label: 'Inventário',
    noun: 'produtos',
    description: 'Os produtos do inventário da Manutenção — os excluídos ficam de fora.',
    fields: {
      category: { label: 'Categoria', type: 'enum', options: INVENTORY_CATEGORIES },
      department: { label: 'Departamento', type: 'text' },
      responsible: { label: 'Com quem está', type: 'text', isPerson: true },
      isOutOfStock: { label: 'Sem saldo', type: 'boolean' },
      createdAt: { label: 'Cadastrado em', type: 'date' },
    },
    dimensions: {
      category: { label: 'Categoria', kind: 'category' },
      department: { label: 'Departamento', kind: 'category' },
      responsible: { label: 'Com quem está', kind: 'category' },
      stock: { label: 'Com ou sem saldo', kind: 'category' },
      createdMonth: { label: 'Cadastrados (por mês)', kind: 'month' },
    },
  },
  inventoryMovements: {
    module: 'manutencao',
    label: 'Movimentos do depósito',
    noun: 'movimentos',
    description: 'As entradas, saídas e descartes do depósito da Manutenção.',
    fields: {
      type: { label: 'Movimento', type: 'enum', options: STOCK_MOVEMENT_TYPES },
      reason: { label: 'Motivo do descarte', type: 'enum', options: DISPOSAL_REASONS },
      item: { label: 'Produto', type: 'text' },
      createdAt: { label: 'Registrado em', type: 'date' },
    },
    dimensions: {
      type: { label: 'Movimento', kind: 'category' },
      reason: { label: 'Motivo do descarte', kind: 'category' },
      item: { label: 'Produto', kind: 'category' },
      day: { label: 'Por dia', kind: 'day' },
      week: { label: 'Por semana', kind: 'week' },
      month: { label: 'Por mês', kind: 'month' },
    },
  },
  quotes: {
    module: 'manutencao',
    label: 'Orçamentos',
    noun: 'orçamentos',
    description: 'Os orçamentos com empresas de fora — os excluídos ficam de fora.',
    fields: {
      status: { label: 'Decisão', type: 'enum', options: QUOTE_STATUSES },
      kind: { label: 'Tipo', type: 'enum', options: QUOTE_KINDS },
      supplier: { label: 'Empresa', type: 'text' },
      createdAt: { label: 'Registrado em', type: 'date' },
      decidedAt: { label: 'Decidido em', type: 'date' },
    },
    dimensions: {
      status: { label: 'Decisão', kind: 'category' },
      kind: { label: 'Tipo', kind: 'category' },
      supplier: { label: 'Empresa', kind: 'category' },
      createdMonth: { label: 'Registrados (por mês)', kind: 'month' },
      decidedMonth: { label: 'Decididos (por mês)', kind: 'month' },
    },
  },
} as const satisfies Record<string, DataSource>;

export type DataSourceKey = keyof typeof DATA_SOURCES;
export const DATA_SOURCE_KEYS = Object.keys(DATA_SOURCES) as DataSourceKey[];
export const dataSourceSchema = z.enum(DATA_SOURCE_KEYS as [DataSourceKey, ...DataSourceKey[]]);

export function fieldsOf(source: DataSourceKey): Record<string, DataField> {
  return DATA_SOURCES[source].fields;
}

export function dimensionsOf(source: DataSourceKey): Record<string, DataDimension> {
  return DATA_SOURCES[source].dimensions;
}

/** As fontes de um módulo, na ordem do contrato — as que o editor de bloco oferece. */
export function sourcesOf(module: BoardModule): DataSourceKey[] {
  return DATA_SOURCE_KEYS.filter((key) => DATA_SOURCES[key].module === module);
}

/** A fonte é do módulo? O painel recusa bloco de fonte de outro módulo. */
export function isSourceOf(module: BoardModule, source: DataSourceKey): boolean {
  return DATA_SOURCES[source].module === module;
}

/* ---------------------------------------------------------------- filtro em árvore */

/**
 * O FILTRO, numa árvore de grupos "E"/"OU" — o formato do `react-querybuilder`, para a tela
 * montar com ele e o servidor traduzir em SQL. Os operadores são uma lista fechada, e o campo
 * precisa existir na fonte: o servidor recusa o resto, e nunca monta SQL com texto livre.
 */
export const FILTER_OPERATORS = [
  '=',
  '!=',
  'in',
  'notIn',
  'contains',
  'doesNotContain',
  'beginsWith',
  '<',
  '<=',
  '>',
  '>=',
  'between',
  'null',
  'notNull',
] as const;

export const filterOperatorSchema = z.enum(FILTER_OPERATORS);

const filterValueSchema = z.union([
  z.string().max(200),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.union([z.string().max(200), z.number()])).max(100),
]);

export const filterRuleSchema = z.object({
  id: z.string().max(80).optional(),
  field: z.string().min(1).max(60),
  operator: filterOperatorSchema,
  value: filterValueSchema.optional(),
});

export type FilterRule = z.infer<typeof filterRuleSchema>;

export type FilterGroup = {
  id?: string;
  combinator: 'and' | 'or';
  not?: boolean;
  rules: (FilterRule | FilterGroup)[];
};

/** Até 4 níveis e 50 regras: um filtro maior que isso é um relatório, não um filtro. */
export const MAX_FILTER_DEPTH = 4;
export const MAX_FILTER_RULES = 50;

export const filterGroupSchema: z.ZodType<FilterGroup> = z.lazy(() =>
  z.object({
    id: z.string().max(80).optional(),
    combinator: z.enum(['and', 'or']),
    not: z.boolean().optional(),
    rules: z.array(z.union([filterRuleSchema, filterGroupSchema])).max(MAX_FILTER_RULES),
  }),
);

export function isFilterGroup(node: FilterRule | FilterGroup): node is FilterGroup {
  return 'rules' in node;
}

/** Profundidade e número de regras da árvore — o limite que protege o banco. */
export function filterSize(group: FilterGroup, depth = 1): { depth: number; rules: number } {
  let maxDepth = depth;
  let rules = 0;
  for (const node of group.rules) {
    if (!isFilterGroup(node)) {
      rules += 1;
      continue;
    }
    const inner = filterSize(node, depth + 1);
    maxDepth = Math.max(maxDepth, inner.depth);
    rules += inner.rules;
  }

  return { depth: maxDepth, rules };
}

/** Os problemas de uma árvore para uma fonte — vazio quando dá para usar. */
export function filterProblems(source: DataSourceKey, group: FilterGroup): string[] {
  const size = filterSize(group);
  const problems: string[] = [];
  if (size.depth > MAX_FILTER_DEPTH)
    problems.push(`O filtro passa de ${MAX_FILTER_DEPTH} níveis de grupo.`);
  if (size.rules > MAX_FILTER_RULES)
    problems.push(`O filtro passa de ${MAX_FILTER_RULES} condições.`);
  const fields = fieldsOf(source);
  const visit = (node: FilterGroup) => {
    for (const rule of node.rules) {
      if (isFilterGroup(rule)) {
        visit(rule);
        continue;
      }
      if (!(rule.field in fields))
        problems.push(`"${rule.field}" não é um campo de ${DATA_SOURCES[source].label}.`);
    }
  };
  visit(group);

  return problems;
}

export const EMPTY_FILTER: FilterGroup = { combinator: 'and', rules: [] };

/* ---------------------------------------------------------------- filtros salvos */

export const SAVED_FILTER_SCOPES = ['personal', 'shared'] as const;

export const savedFilterSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  source: dataSourceSchema,
  scope: z.enum(SAVED_FILTER_SCOPES),
  tree: filterGroupSchema,
  ownerId: z.string(),
  ownerName: z.string().nullable(),
  canEdit: z.boolean(),
  archive: archiveSchema,
  updatedAt: z.iso.datetime({ offset: true }),
});

export type SavedFilter = z.infer<typeof savedFilterSchema>;

export const saveFilterSchema = z
  .object({
    name: z.string().trim().min(2, 'Dê um nome ao filtro').max(80),
    description: z.string().trim().max(240).nullish(),
    source: dataSourceSchema,
    scope: z.enum(SAVED_FILTER_SCOPES),
    tree: filterGroupSchema,
  })
  .superRefine((value, context) => {
    for (const message of filterProblems(value.source, value.tree)) {
      context.addIssue({ code: 'custom', message, path: ['tree'] });
    }
  });

export type SaveFilterInput = z.infer<typeof saveFilterSchema>;

/* ---------------------------------------------------------------- blocos e canvas */

export const WIDGET_KINDS = [
  'stats',
  'hero',
  'column',
  'bar',
  'donut',
  'area',
  'calendar',
  'list',
  'radar',
  'treemap',
  'radial',
  'stacked',
  'heatmap',
  'sankey',
  'agenda',
  'pie',
  'rose',
  'halfDonut',
  'pareto',
  'cumulative',
  'grouped',
  'ringCard',
] as const;
export const widgetKindSchema = z.enum(WIDGET_KINDS);
export type WidgetKind = z.infer<typeof widgetKindSchema>;

export const WIDGET_KIND_LABELS: Record<WidgetKind, string> = {
  stats: 'Cards de número (um por grupo, até 4)',
  hero: 'Destaque com o Zuzu',
  column: 'Colunas',
  bar: 'Barras deitadas',
  donut: 'Rosca',
  area: 'Linha no tempo',
  calendar: 'Calendário',
  list: 'Lista ordenada',
  radar: 'Radar (teia)',
  treemap: 'Mapa de blocos',
  radial: 'Medidor (o filtro sobre o total)',
  stacked: 'Barras empilhadas (dois agrupamentos)',
  heatmap: 'Mapa de calor (dois agrupamentos)',
  sankey: 'Fluxo (dois agrupamentos)',
  agenda: 'Agenda (quantos por dia, numa janela de até 90 dias)',
  pie: 'Pizza',
  rose: 'Rosa (o raio de cada fatia é o valor)',
  halfDonut: 'Meia-rosca',
  pareto: 'Pareto (barras em ordem e o percentual acumulado)',
  cumulative: 'Acumulado no tempo',
  grouped: 'Colunas lado a lado (dois agrupamentos)',
  ringCard: 'Card com anel (o filtro sobre o total)',
};

/** Os blocos que precisam de um agrupamento no tempo, e os que agrupam por categoria. */
export const TIME_WIDGETS: readonly WidgetKind[] = ['area', 'calendar', 'agenda', 'cumulative'];
/** Os que mostram um dia por casa: só aceitam agrupamento POR DIA (não por mês). */
export const DAY_WIDGETS: readonly WidgetKind[] = ['calendar', 'agenda'];
export const CATEGORY_WIDGETS: readonly WidgetKind[] = [
  'column',
  'bar',
  'donut',
  'list',
  'radar',
  'treemap',
  'pie',
  'rose',
  'halfDonut',
  'pareto',
];
/** Os que cruzam DUAS categorias: o agrupamento e o "dividir por" (`splitBy`). */
export const PAIR_WIDGETS: readonly WidgetKind[] = ['stacked', 'heatmap', 'sankey', 'grouped'];
/** Os de cards: agrupar é opcional — sem agrupar, o total; agrupando, um card por grupo (até 4). */
export const CARD_WIDGETS: readonly WidgetKind[] = ['stats', 'hero'];

/**
 * O PESO DE CADA BLOCO — o quanto ele custa ao banco, e não o espaço que ocupa. O painel tem
 * uma cota de pontos (`MAX_BOARD_WEIGHT`) em vez de um número fixo de blocos: dez blocos
 * tratavam igual um card de um número só e um mapa de calor que cruza dois agrupamentos.
 *
 * 1: um número só · 2: uma contagem agrupada · 3: uma série no tempo · 4: dois agrupamentos.
 * "Números" só agrupa se a pessoa quiser: sem agrupar, é um número (peso 1).
 */
export const WIDGET_WEIGHTS: Record<WidgetKind, number> = {
  ringCard: 1,
  radial: 1,
  stats: 2,
  hero: 2,
  column: 2,
  bar: 2,
  donut: 2,
  pie: 2,
  rose: 2,
  halfDonut: 2,
  list: 2,
  radar: 2,
  treemap: 2,
  pareto: 2,
  area: 3,
  cumulative: 3,
  calendar: 3,
  agenda: 3,
  stacked: 4,
  heatmap: 4,
  sankey: 4,
  grouped: 4,
};

/**
 * A cota de um painel: doze gráficos comuns, vinte e quatro cards de um número, ou seis
 * cruzados. 24, e não 20: o painel padrão da Equipe pesa 22, e precisa caber com folga.
 */
export const MAX_BOARD_WEIGHT = 24;

export function widgetWeight(widget: { kind: WidgetKind; groupBy?: string | null }): number {
  if (widget.kind === 'stats' && !widget.groupBy) return 1;

  return WIDGET_WEIGHTS[widget.kind];
}

export function boardWeight(
  widgets: readonly { kind: WidgetKind; groupBy?: string | null }[],
): number {
  return widgets.reduce((sum, widget) => sum + widgetWeight(widget), 0);
}

/** "1 ponto", "4 pontos" — o rótulo do peso que a tela mostra em cada bloco. */
export function weightLabel(weight: number): string {
  return weight === 1 ? '1 ponto' : `${weight} pontos`;
}

/**
 * O PERÍODO DO BLOCO — a janela de tempo sobre a data principal da fonte (vencimento não: a
 * data de quando o registro aconteceu). Relativo ao dia de quem vê, em Brasília: "hoje" é
 * sempre hoje, sem ninguém ter de mexer no filtro.
 */
export const WIDGET_PERIODS = ['all', 'today', '7d', '30d', 'month'] as const;
export const widgetPeriodSchema = z.enum(WIDGET_PERIODS);
export type WidgetPeriod = z.infer<typeof widgetPeriodSchema>;

export const WIDGET_PERIOD_LABELS: Record<WidgetPeriod, string> = {
  all: 'Todo o período',
  today: 'Hoje',
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  month: 'Este mês',
};

/** Os dias (`aaaa-mm-dd`, pontas incluídas) de um período, contados a partir de `today`. */
export function periodRange(
  period: WidgetPeriod,
  today: string,
): { from: string; to: string } | null {
  if (period === 'all') return null;
  if (period === 'today') return { from: today, to: today };
  if (period === 'month') return { from: `${today.slice(0, 7)}-01`, to: today };
  const back = period === '7d' ? 6 : 29;
  const start = new Date(`${today}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - back);

  return { from: start.toISOString().slice(0, 10), to: today };
}

/**
 * A JANELA DA AGENDA — quantos dias ela puxa do banco. Nunca "tudo": ou os próximos/últimos N
 * dias, semanas ou meses (a partir do começo do dia, da semana ou do mês de hoje), ou duas datas
 * exatas com no máximo 90 dias entre elas. Sem esse teto, um painel pedindo dois anos de agenda,
 * renovado a cada 5 minutos por cada pessoa, pesaria no banco de todo mundo.
 */
export const MAX_WINDOW_DAYS = 90;
export const WINDOW_UNITS = ['day', 'week', 'month'] as const;
export type WindowUnit = (typeof WINDOW_UNITS)[number];
export const WINDOW_DIRECTIONS = ['next', 'last'] as const;

/** As quantidades que cada unidade oferece — escolha fechada, sempre dentro dos 90 dias. */
export const WINDOW_COUNTS: Record<WindowUnit, readonly number[]> = {
  day: [7, 14, 30, 60, 90],
  week: [1, 2, 4, 8, 12],
  month: [1, 2, 3],
};

export const WINDOW_UNIT_LABELS: Record<WindowUnit, [string, string]> = {
  day: ['dia', 'dias'],
  week: ['semana', 'semanas'],
  month: ['mês', 'meses'],
};

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use uma data válida');

export const widgetWindowSchema = z
  .discriminatedUnion('mode', [
    z.object({
      mode: z.literal('relative'),
      unit: z.enum(WINDOW_UNITS),
      count: z.number().int().min(1),
      direction: z.enum(WINDOW_DIRECTIONS),
    }),
    z.object({ mode: z.literal('custom'), from: isoDay, to: isoDay }),
  ])
  .superRefine((window, context) => {
    const problem = windowProblem(window);
    if (problem) context.addIssue({ code: 'custom', message: problem });
  });

export type WidgetWindow = z.infer<typeof widgetWindowSchema>;

/** A janela padrão da agenda: o mês de hoje, pra frente. */
export const DEFAULT_WINDOW: WidgetWindow = {
  mode: 'relative',
  unit: 'month',
  count: 1,
  direction: 'next',
};

function windowProblem(window: WidgetWindow): string | null {
  if (window.mode === 'relative') {
    return WINDOW_COUNTS[window.unit].includes(window.count)
      ? null
      : 'Escolha uma das quantidades oferecidas';
  }
  if (window.from > window.to) return 'A data final vem antes da inicial';

  return daysBetween(window.from, window.to) + 1 > MAX_WINDOW_DAYS
    ? `A agenda puxa no máximo ${MAX_WINDOW_DAYS} dias`
    : null;
}

function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function addMonths(day: string, months: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + months);

  return date.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** O começo do dia, da semana (domingo, como o calendário da tela) ou do mês de `today`. */
function startOfUnit(unit: WindowUnit, today: string): string {
  if (unit === 'month') return `${today.slice(0, 7)}-01`;
  if (unit === 'day') return today;

  return addDays(today, -new Date(`${today}T00:00:00.000Z`).getUTCDay());
}

function plusUnits(unit: WindowUnit, day: string, count: number): string {
  if (unit === 'month') return addMonths(day, count);

  return addDays(day, unit === 'week' ? count * 7 : count);
}

/**
 * Os dias (pontas incluídas) de uma janela, a partir de `today`. "Próximos 2 meses" é este mês
 * e o seguinte, inteiros; "últimas 4 semanas" são as três de antes e esta, até hoje.
 */
export function windowRange(window: WidgetWindow, today: string): { from: string; to: string } {
  if (window.mode === 'custom') return { from: window.from, to: window.to };
  const start = startOfUnit(window.unit, today);
  if (window.direction === 'next') {
    return { from: start, to: addDays(plusUnits(window.unit, start, window.count), -1) };
  }

  return { from: plusUnits(window.unit, start, -(window.count - 1)), to: today };
}

/** "Próximos 2 meses", "Últimos 30 dias", "01/11/2026 a 30/11/2026". */
export function windowLabel(window: WidgetWindow): string {
  if (window.mode === 'custom') return `${brazilian(window.from)} a ${brazilian(window.to)}`;
  const plural = window.count === 1 ? 0 : 1;
  const gender = window.unit === 'week' ? 'feminine' : 'masculine';
  const word = DIRECTION_WORDS[window.direction][gender][plural];

  return `${word} ${window.count} ${WINDOW_UNIT_LABELS[window.unit][plural]}`;
}

/** "Próximos/Próximas", "Últimos/Últimas" — semana é feminina. */
const DIRECTION_WORDS = {
  next: { masculine: ['Próximo', 'Próximos'], feminine: ['Próxima', 'Próximas'] },
  last: { masculine: ['Último', 'Últimos'], feminine: ['Última', 'Últimas'] },
} as const;

function brazilian(day: string): string {
  const [year, month, date] = day.split('-');

  return `${date}/${month}/${year}`;
}

/** A fonte tem um campo de pessoa — e por isso aceita "só os meus". */
export function hasPersonField(source: DataSourceKey): boolean {
  return Object.values(fieldsOf(source)).some((field) => field.isPerson);
}

/**
 * O agrupamento que o bloco pede tem que combinar com o gráfico: os de tempo agrupam por dia ou
 * mês, os de categoria por categoria, os de par cruzam duas categorias diferentes, e os cards
 * agrupam se quiserem (um card por grupo) — o destaque com o Zuzu também: os grupos viram os
 * até quatro cards dentro dele.
 */
function groupProblem(widget: {
  kind: WidgetKind;
  source: DataSourceKey;
  groupBy: string | null;
  splitBy?: string | null;
}): string | null {
  const dimensions = dimensionsOf(widget.source) as Record<string, DataDimension>;
  const dimension = widget.groupBy ? dimensions[widget.groupBy] : undefined;
  if (CARD_WIDGETS.includes(widget.kind)) return statsGroupProblem(widget.groupBy, dimension);
  if (PAIR_WIDGETS.includes(widget.kind)) return pairProblem(widget, dimensions);
  const wantsTime = TIME_WIDGETS.includes(widget.kind);
  if (!wantsTime && !CATEGORY_WIDGETS.includes(widget.kind)) return null;
  if (!dimension) return 'Escolha como agrupar';

  return kindProblem(widget.kind, wantsTime, dimension);
}

/** O agrupamento escolhido combina com o tipo? A agenda só aceita POR DIA (não por mês). */
function kindProblem(
  kind: WidgetKind,
  wantsTime: boolean,
  dimension: DataDimension,
): string | null {
  if (kind === 'agenda' && dimension.kind !== 'day') return 'A agenda agrupa por dia';
  if (wantsTime === isTimeDimension(dimension.kind)) return null;

  return wantsTime ? TIME_GROUP_PROBLEM : CATEGORY_GROUP_PROBLEM;
}

/**
 * O motivo DIZ O QUE FAZER: "Este bloco agrupa no tempo" deixava a pessoa sem saber que era o
 * "Agrupar por" que precisava mudar.
 */
export const TIME_GROUP_PROBLEM =
  'Este gráfico mostra a evolução no tempo: em "Agrupar por", escolha um dia ou um mês — ou troque o gráfico.';
export const CATEGORY_GROUP_PROBLEM =
  'Este gráfico compara grupos: em "Agrupar por", escolha algo que não seja data — ou troque o gráfico.';

function pairProblem(
  widget: { groupBy: string | null; splitBy?: string | null },
  dimensions: Record<string, DataDimension>,
): string | null {
  const first = widget.groupBy ? dimensions[widget.groupBy] : undefined;
  const second = widget.splitBy ? dimensions[widget.splitBy] : undefined;
  if (!first || !second || !isCategoryDimension(first.kind) || !isCategoryDimension(second.kind)) {
    return 'Este bloco cruza duas categorias: escolha as duas';
  }

  return widget.groupBy === widget.splitBy ? 'Escolha duas categorias diferentes' : null;
}

function statsGroupProblem(
  groupBy: string | null,
  dimension: DataDimension | undefined,
): string | null {
  if (groupBy === null || (dimension && isCategoryDimension(dimension.kind))) return null;

  return 'Os cards agrupam por categoria';
}

/** As visões dos blocos de calendário — as mesmas do calendário da casa. */
export const CALENDAR_VIEWS = ['month', 'week', 'day', 'list', 'year'] as const;
export const calendarViewSchema = z.enum(CALENDAR_VIEWS);
export type CalendarView = z.infer<typeof calendarViewSchema>;

export const CALENDAR_VIEW_LABELS: Record<CalendarView, string> = {
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
  list: 'Lista',
  year: 'Ano',
};

/** A visão em que o bloco abre: a escolhida, ou a do tipo (o calor lê melhor no ano). */
export function widgetCalendarView(widget: Pick<Widget, 'kind' | 'calendarView'>): CalendarView {
  if (widget.calendarView) return widget.calendarView;

  return widget.kind === 'calendar' ? 'year' : 'month';
}

/** O bloco de calendário abre a tela do dia clicado? Sem escolha, sim. */
export function widgetIsClickable(widget: Pick<Widget, 'isClickable'>): boolean {
  return widget.isClickable ?? true;
}

export const widgetSchema = z
  .object({
    id: z.string().min(1).max(40),
    kind: widgetKindSchema,
    title: z.string().trim().min(1, 'Dê um título ao bloco').max(60),
    source: dataSourceSchema,
    groupBy: z.string().max(40).nullable(),
    /** O segundo agrupamento dos blocos de par. Nulo nos outros (e nos painéis já salvos). */
    splitBy: z.string().max(40).nullable().default(null),
    filterId: z.uuid().nullable(),
    /** Só o que é de quem está vendo — no painel da Equipe, cada um vê o seu. */
    onlyMine: z.boolean().default(false),
    period: widgetPeriodSchema.default('all'),
    /** A janela da agenda (até 90 dias). Nula nos outros blocos — e nos painéis já salvos. */
    window: widgetWindowSchema.nullable().default(null),
    /**
     * Os blocos de calendário: a visão em que ele abre. Nula é o padrão do tipo (o ano no
     * calendário de calor, o mês na agenda) — e os painéis já salvos.
     */
    calendarView: calendarViewSchema.nullish(),
    /**
     * Os blocos de calendário: clicar no dia abre a tela daquela fonte já filtrada no dia.
     * Ausente é clicável (`widgetIsClickable`) — os painéis já salvos também.
     */
    isClickable: z.boolean().optional(),
    /**
     * Os limites das faixas de idade, quando o bloco agrupa (ou divide) por uma. Nulo é o padrão
     * (`DEFAULT_AGE_BANDS`) — e os painéis já salvos.
     */
    ageBands: ageBandsSchema.nullish(),
  })
  .superRefine((widget, context) => {
    const problem = groupProblem(widget);
    if (problem) context.addIssue({ code: 'custom', message: problem, path: ['groupBy'] });
    if (widget.kind === 'agenda' && !widget.window) {
      context.addIssue({
        code: 'custom',
        message: 'Escolha o período da agenda',
        path: ['window'],
      });
    }
    if (widget.onlyMine && !hasPersonField(widget.source)) {
      context.addIssue({
        code: 'custom',
        message: 'Esta fonte não tem responsável: "só os meus" não vale aqui',
        path: ['onlyMine'],
      });
    }
  });

export type Widget = z.infer<typeof widgetSchema>;

/** Os blocos que cabem numa casa só (1×1). Os outros ocupam no mínimo duas. */
export const COMPACT_WIDGET_KINDS: readonly WidgetKind[] = ['ringCard'];

export const MIN_CELLS_PROBLEM = 'O bloco ocupa no mínimo duas casas';

/**
 * Onde cada bloco fica no canvas de 4 colunas. O item sozinho aceita 1×1: quem decide se o bloco
 * cabe numa casa é o tipo dele (`COMPACT_WIDGET_KINDS`), conferido no `saveBoardSchema`, que
 * conhece os dois.
 */
export const layoutItemSchema = z
  .object({
    i: z.string().min(1).max(40),
    x: z
      .number()
      .int()
      .min(0)
      .max(GRID_COLUMNS - 1),
    y: z.number().int().min(0).max(MAX_GRID_ROWS),
    w: z.number().int().min(1).max(GRID_COLUMNS),
    h: z.number().int().min(1).max(8),
  })
  .refine((item) => item.x + item.w <= GRID_COLUMNS, { message: 'O bloco passa da borda' });

export type LayoutItem = z.infer<typeof layoutItemSchema>;

/* ---------------------------------------------------------------- os filtros do painel */

/**
 * OS FILTROS DO PAINEL — postos por quem monta, escolhidos por quem vê. Ficam no alto do painel
 * e valem para TODOS os blocos de uma vez: "Pessoa" recorta pelo responsável (ou por quem fez)
 * em cada bloco cuja fonte tem pessoa; "Período" troca o período de cada bloco por uma janela
 * de até 90 dias. Bloco cuja fonte não tem pessoa segue igual — o filtro não se aplica a ele.
 *
 * O painel grava QUAIS filtros existem; o valor escolhido é de quem está vendo, e não se grava.
 */
export const BOARD_FILTER_KINDS = [
  'person',
  'period',
  'ticketStatus',
  'ticketPriority',
  'department',
  'problemType',
  'requester',
  'project',
  'computerHealth',
  'inventoryCategory',
] as const;
export const boardFilterKindSchema = z.enum(BOARD_FILTER_KINDS);
export type BoardFilterKind = z.infer<typeof boardFilterKindSchema>;

export const BOARD_FILTER_KIND_LABELS: Record<BoardFilterKind, string> = {
  /* "Responsável", e não "Pessoa": o filtro recorta por quem atende (ou por quem fez). */
  person: 'Responsável',
  period: 'Período',
  ticketStatus: 'Situação do chamado',
  ticketPriority: 'Prioridade do chamado',
  department: 'Departamento',
  problemType: 'Tipo de problema',
  requester: 'Quem abriu',
  project: 'Sistema',
  computerHealth: 'Saúde da máquina',
  inventoryCategory: 'Categoria do produto',
};

/**
 * OS FILTROS DE CAMPO — um valor escolhido vira uma condição "campo = valor" no bloco, a MESMA
 * condição que um filtro salvo teria. Não abre consulta nova: entra na pergunta que o bloco já
 * faz. Cada um vale só nas fontes onde o campo existe; nas outras, o bloco segue igual.
 */
export type BoardFieldFilterKind = Exclude<BoardFilterKind, 'person' | 'period'>;

const TICKET_SOURCES = ['infraTickets', 'systemTickets', 'maintenanceTickets'] as const;

function onTickets(field: string): Partial<Record<DataSourceKey, string>> {
  return Object.fromEntries(TICKET_SOURCES.map((source) => [source, field]));
}

export const BOARD_FILTER_FIELDS: Record<
  BoardFieldFilterKind,
  Partial<Record<DataSourceKey, string>>
> = {
  ticketStatus: onTickets('status'),
  ticketPriority: onTickets('priority'),
  /* O departamento vale para o chamado, a máquina e o produto: todos guardam o nome dele. */
  department: { ...onTickets('department'), computers: 'department', inventoryItems: 'department' },
  problemType: onTickets('problemType'),
  requester: onTickets('requester'),
  /* O sistema vale para o chamado de Sistema, a atividade do GitHub e a agenda: os três o têm. */
  project: { systemTickets: 'project', softwareActivity: 'project', scheduleEvents: 'project' },
  computerHealth: { computers: 'healthStatus' },
  inventoryCategory: { inventoryItems: 'category' },
};

export const BOARD_FIELD_FILTER_KINDS = Object.keys(BOARD_FILTER_FIELDS) as BoardFieldFilterKind[];

export function isFieldFilterKind(kind: BoardFilterKind): kind is BoardFieldFilterKind {
  return kind in BOARD_FILTER_FIELDS;
}

/**
 * COMO O FILTRO APARECE — quem monta o painel escolhe o componente de cada filtro. A maioria é
 * "escolha um entre vários", e isso cabe em mais de um desenho: a lista suspensa economiza
 * espaço, as etiquetas deixam tudo à vista num clique, a lista aberta lê de cima a baixo, e o
 * filtro de pessoa pode ser só os rostos.
 */
export const BOARD_FILTER_DISPLAYS = [
  'select',
  'search',
  'chips',
  'list',
  'avatars',
  'cards',
] as const;
export const boardFilterDisplaySchema = z.enum(BOARD_FILTER_DISPLAYS);
export type BoardFilterDisplay = z.infer<typeof boardFilterDisplaySchema>;

export const BOARD_FILTER_DISPLAY_LABELS: Record<BoardFilterDisplay, string> = {
  select: 'Lista suspensa',
  search: 'Busca',
  chips: 'Etiquetas',
  list: 'Lista aberta',
  avatars: 'Fotos',
  cards: 'Cards',
};

/**
 * DE ONDE VEM O NÚMERO DE CADA CARD — o filtro em "Cards" mostra cada opção com quantos há nela,
 * e esse número é a mesma conta de um bloco: os CHAMADOS DO MÓDULO agrupados pelo campo do
 * filtro. Período não tem uma contagem por opção, e por isso não tem cards.
 */
const MODULE_TICKETS: Record<BoardModule, DataSourceKey> = {
  infra: 'infraTickets',
  sistema: 'systemTickets',
  manutencao: 'maintenanceTickets',
};

const CARD_GROUPS: Partial<Record<BoardFilterKind, string>> = {
  person: 'assignee',
  ticketStatus: 'status',
  ticketPriority: 'priority',
  department: 'department',
  problemType: 'problemType',
  requester: 'requester',
};

/**
 * Os filtros que não são de chamado contam na fonte DELES: a saúde, nas máquinas; a categoria, no
 * inventário; o sistema, nos chamados de Sistema (o campo que mais se recorta por ele).
 */
const OWN_CARD_SOURCES: Partial<
  Record<BoardFilterKind, { source: DataSourceKey; groupBy: string }>
> = {
  project: { source: 'systemTickets', groupBy: 'project' },
  computerHealth: { source: 'computers', groupBy: 'healthStatus' },
  inventoryCategory: { source: 'inventoryItems', groupBy: 'category' },
};

export function boardFilterCardSource(
  kind: BoardFilterKind,
  module: BoardModule,
): { source: DataSourceKey; groupBy: string } | null {
  const own = OWN_CARD_SOURCES[kind];
  if (own) return isSourceOf(module, own.source) ? own : null;
  const groupBy = CARD_GROUPS[kind];

  return groupBy ? { source: MODULE_TICKETS[module], groupBy } : null;
}

/**
 * Os filtros que valem no painel do módulo: Pessoa e Período sempre; os de campo, só quando
 * alguma fonte do módulo tem o campo. "Sistema" não aparece na Infraestrutura, nem "Saúde da
 * máquina" na Manutenção.
 */
export function boardFilterKindsOf(module: BoardModule): BoardFilterKind[] {
  return BOARD_FILTER_KINDS.filter((kind) => {
    if (!isFieldFilterKind(kind)) return true;

    return Object.keys(BOARD_FILTER_FIELDS[kind]).some((source) =>
      isSourceOf(module, source as DataSourceKey),
    );
  });
}

/** Os desenhos que cada filtro aceita — o primeiro é o padrão. */
export function boardFilterDisplaysOf(kind: BoardFilterKind): BoardFilterDisplay[] {
  if (kind === 'person') return ['search', 'avatars', 'chips', 'cards'];
  if (kind === 'period') return ['select', 'chips'];

  return ['select', 'search', 'chips', 'list', 'cards'];
}

/** O desenho que vale: o escolhido, se o filtro o aceita; senão, o padrão do filtro. */
export function boardFilterDisplay(filter: {
  kind: BoardFilterKind;
  display?: BoardFilterDisplay;
}): BoardFilterDisplay {
  const allowed = boardFilterDisplaysOf(filter.kind);
  if (filter.display && allowed.includes(filter.display)) return filter.display;

  return allowed[0]!;
}

/**
 * A GRADE DOS FILTROS É A DOS BLOCOS: as mesmas 4 colunas, as mesmas alças e o mesmo arrastar.
 * Um seletor ocupa 1×1; etiquetas, lista e fotos, 2×1; os cards, 4×1 (uma faixa) ou 2×2.
 */
export const FILTER_GRID_COLUMNS = GRID_COLUMNS;
export const FILTER_GRID_MAX_ROWS = 4;

/** Onde o filtro fica e o tamanho dele, na grade dos filtros. */
export const boardFilterPlaceSchema = z
  .object({
    x: z
      .number()
      .int()
      .min(0)
      .max(FILTER_GRID_COLUMNS - 1),
    y: z.number().int().min(0).max(MAX_GRID_ROWS),
    w: z.number().int().min(1).max(FILTER_GRID_COLUMNS),
    h: z.number().int().min(1).max(FILTER_GRID_MAX_ROWS),
  })
  .refine((place) => place.x + place.w <= FILTER_GRID_COLUMNS, {
    message: 'O filtro passa da borda',
  });

export type BoardFilterPlace = z.infer<typeof boardFilterPlaceSchema>;

/**
 * A LARGURA do filtro na barra: `auto`, uma peça da grade, como as outras; `full`, a linha
 * inteira, sozinho — para as etiquetas à vista com muitas opções, que numa peça só ficam
 * espremidas e rolando de lado.
 */
export const BOARD_FILTER_WIDTHS = ['auto', 'full'] as const;

export type BoardFilterWidth = (typeof BOARD_FILTER_WIDTHS)[number];

export const BOARD_FILTER_WIDTH_LABELS: Record<BoardFilterWidth, string> = {
  auto: 'Normal',
  full: 'Linha inteira',
};

export const boardFilterSchema = z.object({
  id: z.string().min(1).max(40),
  kind: boardFilterKindSchema,
  label: z.string().trim().min(1, 'Dê um nome ao filtro').max(40),
  /* Os painéis gravados antes da escolha não têm o campo: ficam no desenho padrão. */
  display: boardFilterDisplaySchema.optional(),
  /* Os painéis gravados antes da escolha não têm o campo (nem um valor que se perdeu): normal. */
  width: z.enum(BOARD_FILTER_WIDTHS).optional().catch(undefined),
  /* Os painéis gravados antes da grade não têm o campo: os filtros se arrumam sozinhos
     (`placedBoardFilters`), na ordem em que foram postos. Um lugar da grade antiga, de 12
     colunas, não cabe na de 4: em vez de recusar o painel inteiro, ele é esquecido e o filtro
     se arruma de novo. */
  place: boardFilterPlaceSchema.optional().catch(undefined),
});

export type BoardFilter = z.infer<typeof boardFilterSchema>;

/**
 * O tamanho que um filtro nasce, pelo desenho: seletor e busca são um campo só (1×1, cidade 2×1,
 * que são dois campos); os cards são uma faixa (4×1); etiquetas, lista e fotos mostram as
 * opções à vista, e numa casa só de altura elas não cabem (2×2).
 */
export function defaultFilterSize(filter: {
  kind: BoardFilterKind;
  display?: BoardFilterDisplay;
}): { w: number; h: number } {
  const display = boardFilterDisplay(filter);
  if (display === 'cards') return { w: 4, h: 1 };
  if (display === 'select' || display === 'search') return { w: 1, h: 1 };

  return { w: 2, h: 2 };
}

/**
 * Cada filtro com o seu lugar: o gravado, ou — sem um — o próximo espaço livre, da esquerda
 * para a direita e de cima para baixo, no tamanho que o desenho pede.
 */
export function placedBoardFilters(
  filters: readonly BoardFilter[],
): (BoardFilter & { place: BoardFilterPlace })[] {
  const taken: BoardFilterPlace[] = filters.flatMap((filter) =>
    filter.place ? [filter.place] : [],
  );

  return filters.map((filter) => {
    if (filter.place) return { ...filter, place: filter.place };
    const place = firstFreePlace(taken, defaultFilterSize(filter));
    taken.push(place);

    return { ...filter, place };
  });
}

function firstFreePlace(
  taken: readonly BoardFilterPlace[],
  size: { w: number; h: number },
): BoardFilterPlace {
  for (let y = 0; ; y += 1) {
    const place = freePlaceInRow(taken, size, y);
    if (place) return place;
  }
}

/** O primeiro lugar livre de uma linha, da esquerda para a direita; nenhum, `null`. */
function freePlaceInRow(
  taken: readonly BoardFilterPlace[],
  size: { w: number; h: number },
  y: number,
): BoardFilterPlace | null {
  for (let x = 0; x + size.w <= FILTER_GRID_COLUMNS; x += 1) {
    const place = { x, y, ...size };
    if (!taken.some((other) => overlaps(place, other))) return place;
  }

  return null;
}

function overlaps(one: BoardFilterPlace, other: BoardFilterPlace): boolean {
  return (
    one.x < other.x + other.w &&
    other.x < one.x + one.w &&
    one.y < other.y + other.h &&
    other.y < one.y + one.h
  );
}

/** Um de cada tipo: duas "Pessoa" no mesmo painel seriam duas respostas para a mesma pergunta. */
export const MAX_BOARD_FILTERS = BOARD_FILTER_KINDS.length;

/** O que quem vê escolheu em cada filtro do painel. Nulo é "todos" / o período de cada bloco. */
export type BoardFilterValues = { person: string | null; period: WidgetWindow | null } & Record<
  BoardFieldFilterKind,
  string | null
>;

export const EMPTY_BOARD_FILTER_VALUES: BoardFilterValues = {
  person: null,
  period: null,
  ticketStatus: null,
  ticketPriority: null,
  department: null,
  problemType: null,
  requester: null,
  project: null,
  computerHealth: null,
  inventoryCategory: null,
};

/**
 * O filtro do painel vale para a fonte do bloco? Período vale para todas; pessoa, só com pessoa;
 * os de campo, só onde o campo existe.
 */
export function boardFilterApplies(kind: BoardFilterKind, source: DataSourceKey): boolean {
  if (kind === 'period') return true;
  if (kind === 'person') return hasPersonField(source);

  return BOARD_FILTER_FIELDS[kind][source] !== undefined;
}

/**
 * A DATA QUE O "PERÍODO" DO PAINEL RECORTA, quando não é a que o nome da fonte faz supor. Nos
 * chamados, o período olha a ABERTURA: "Últimos 30 dias" são os chamados abertos nos últimos 30
 * dias, e não os resolvidos. O bloco diz isso, para ninguém ler errado.
 */
export const BOARD_PERIOD_NOTES: Partial<Record<DataSourceKey, string>> = {
  infraTickets: 'Recorte pela abertura',
  systemTickets: 'Recorte pela abertura',
  maintenanceTickets: 'Recorte pela abertura',
};

/** A nota do bloco desta fonte com o "Período" do painel escolhido; sem período, nenhuma. */
export function boardPeriodNote(
  source: DataSourceKey,
  boardPeriod: WidgetWindow | null,
): string | null {
  if (!boardPeriod) return null;

  return BOARD_PERIOD_NOTES[source] ?? null;
}

/** As condições "campo = valor" que os filtros de campo escolhidos põem num bloco desta fonte. */
export function boardMatches(values: BoardFilterValues, source: DataSourceKey): BoardMatch[] {
  return BOARD_FIELD_FILTER_KINDS.flatMap((kind) => {
    const field = BOARD_FILTER_FIELDS[kind][source];
    const value = values[kind];

    return field && value ? [{ field, value }] : [];
  });
}

export const boardMatchSchema = z.object({
  field: z.string().min(1).max(60),
  value: z.string().trim().min(1).max(200),
});

export type BoardMatch = z.infer<typeof boardMatchSchema>;

/** Os filtros de campo de um bloco como um grupo E — a mesma árvore de um filtro salvo. */
export function boardMatchGroup(matches: readonly BoardMatch[]): FilterGroup | null {
  if (matches.length === 0) return null;

  return {
    combinator: 'and',
    rules: matches.map(({ field, value }) => ({ field, operator: '=', value })),
  };
}

export const saveBoardSchema = z
  .object({
    widgets: z
      .array(widgetSchema)
      .max(MAX_WIDGETS, `No máximo ${MAX_WIDGETS} blocos por dashboard`),
    layout: z.array(layoutItemSchema).max(MAX_WIDGETS),
    /* Os painéis gravados antes dos filtros não têm o campo: chegam sem filtro nenhum. */
    filters: z.array(boardFilterSchema).max(MAX_BOARD_FILTERS).default([]),
  })
  .superRefine((board, context) => {
    const kinds = new Set(board.filters.map((filter) => filter.kind));
    if (kinds.size !== board.filters.length) {
      context.addIssue({
        code: 'custom',
        message: 'O painel tem um filtro de cada tipo',
        path: ['filters'],
      });
    }
    const ids = new Set(board.widgets.map((widget) => widget.id));
    if (ids.size !== board.widgets.length) {
      context.addIssue({
        code: 'custom',
        message: 'Dois blocos com o mesmo id',
        path: ['widgets'],
      });
    }
    const placed = new Set(board.layout.map((item) => item.i));
    if (placed.size !== ids.size || [...ids].some((id) => !placed.has(id))) {
      context.addIssue({
        code: 'custom',
        message: 'Todo bloco precisa de um lugar no canvas',
        path: ['layout'],
      });
    }
    const kindOf = new Map(board.widgets.map((widget) => [widget.id, widget.kind]));
    board.layout.forEach((item, index) => {
      if (item.w >= 2 || item.h >= 2) return;
      const kind = kindOf.get(item.i);
      if (kind && COMPACT_WIDGET_KINDS.includes(kind)) return;
      context.addIssue({ code: 'custom', message: MIN_CELLS_PROBLEM, path: ['layout', index] });
    });
  });

export type SaveBoardInput = z.infer<typeof saveBoardSchema>;

export const boardSchema = z.object({
  module: boardModuleSchema,
  scope: dashboardScopeSchema,
  widgets: z.array(widgetSchema),
  layout: z.array(layoutItemSchema),
  filters: z.array(boardFilterSchema).default([]),
  /** Nulo enquanto ninguém salvou: é o painel padrão do sistema. */
  updatedAt: z.iso.datetime({ offset: true }).nullable(),
  updatedBy: z.string().nullable(),
  canEdit: z.boolean(),
});

export type Board = z.infer<typeof boardSchema>;

/* ---------------------------------------------------------------- os dados de um bloco */

export const widgetQuerySchema = z.object({
  source: dataSourceSchema,
  groupBy: z.string().max(40).nullable(),
  splitBy: z.string().max(40).nullable().default(null),
  filterId: z.uuid().nullable(),
  onlyMine: z.boolean().default(false),
  period: widgetPeriodSchema.default('all'),
  /** Recorta o AGRUPAMENTO POR DIA a esta janela — o teto de 90 dias vale aqui também. */
  window: widgetWindowSchema.nullable().default(null),
  /** O filtro "Pessoa" do painel: o nome escolhido, ou `ME_VALUE`. Fonte sem pessoa ignora. */
  person: z.string().trim().min(1).max(200).nullable().default(null),
  /** O filtro "Período" do painel: no lugar do período do bloco, com o mesmo teto de 90 dias. */
  boardPeriod: widgetWindowSchema.nullable().default(null),
  /** Os filtros de campo do painel (status, tipo, situação, grupo, cidade): "campo = valor". */
  matches: z.array(boardMatchSchema).max(BOARD_FIELD_FILTER_KINDS.length).default([]),
  /** Os limites das faixas de idade do bloco; ausente ou nulo é o padrão (`DEFAULT_AGE_BANDS`). */
  ageBands: ageBandsSchema.nullish(),
});

export type WidgetQuery = z.infer<typeof widgetQuerySchema>;
export type WidgetQueryInput = z.input<typeof widgetQuerySchema>;

/**
 * A pergunta de um bloco com os filtros do painel — a mesma que conta o bloco e a que o clique
 * num item leva para a tela da fonte. Os filtros do painel entram só onde valem: "Pessoa" num
 * bloco sem pessoa não muda a resposta.
 */
export function widgetQueryOf(
  widget: Widget,
  values: BoardFilterValues = EMPTY_BOARD_FILTER_VALUES,
): WidgetQuery {
  return {
    source: widget.source,
    groupBy: widget.groupBy,
    splitBy: widget.splitBy,
    filterId: widget.filterId,
    onlyMine: widget.onlyMine,
    period: widget.period,
    window: widget.window,
    person: boardFilterApplies('person', widget.source) ? values.person : null,
    boardPeriod: values.period,
    matches: boardMatches(values, widget.source),
    ageBands: widget.ageBands ?? null,
  };
}

export const widgetDataSchema = z.object({
  /** Quantos há no recorte (com o filtro). */
  total: z.number().int().min(0),
  /** Quantos há na fonte inteira, sem o filtro — o "de quanto" do medidor. */
  grandTotal: z.number().int().min(0),
  series: z.array(z.object({ key: z.string(), label: z.string(), value: z.number() })),
  /** O cruzamento dos blocos de par: uma célula por (grupo, divisão). Vazio nos outros. */
  cells: z.array(
    z.object({
      row: z.string(),
      rowLabel: z.string(),
      column: z.string(),
      columnLabel: z.string(),
      value: z.number(),
    }),
  ),
});

export type WidgetData = z.infer<typeof widgetDataSchema>;
