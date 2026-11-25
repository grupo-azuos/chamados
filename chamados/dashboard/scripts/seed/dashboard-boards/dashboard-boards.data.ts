import {
  type BoardFilter,
  type BoardModule,
  type DataSourceKey,
  type FilterGroup,
  GRID_COLUMNS,
  type LayoutItem,
  type Widget,
} from '@template/shared/schemas/dashboard-board.schema';

/**
 * OS PAINÉIS PRONTOS — a Equipe e o Gestor de cada módulo, montados com os blocos e os filtros
 * que mais se perguntam: o que está aberto, há quanto tempo, de onde vem, quem está com o quê.
 * Usam os dados que o banco já tem; nada aqui inventa chamado.
 *
 * O Pessoal fica de fora: é um por pessoa, e cada um monta o seu.
 */

/* Os filtros salvos que os cards com anel usam: a parte que preocupa, sobre o total. */
export type SavedFilterSeed = {
  id: string;
  module: BoardModule;
  name: string;
  description: string;
  source: DataSourceKey;
  tree: FilterGroup;
};

const OPEN = { field: 'isOpen', operator: '=', value: true } as const;

const URGENT: Record<BoardModule, string> = {
  infra: '5f0c2a1e-7b1d-4c11-9a01-000000000001',
  sistema: '5f0c2a1e-7b1d-4c11-9a01-000000000002',
  manutencao: '5f0c2a1e-7b1d-4c11-9a01-000000000003',
};

const UNASSIGNED: Record<BoardModule, string> = {
  infra: '5f0c2a1e-7b1d-4c11-9a02-000000000001',
  sistema: '5f0c2a1e-7b1d-4c11-9a02-000000000002',
  manutencao: '5f0c2a1e-7b1d-4c11-9a02-000000000003',
};

const TICKETS: Record<BoardModule, DataSourceKey> = {
  infra: 'infraTickets',
  sistema: 'systemTickets',
  manutencao: 'maintenanceTickets',
};

const MODULES: readonly BoardModule[] = ['infra', 'sistema', 'manutencao'];

export const SAVED_FILTERS_SEED: SavedFilterSeed[] = MODULES.flatMap((module) => [
  {
    id: URGENT[module],
    module,
    name: 'Alta prioridade em aberto',
    description: 'Os chamados em aberto com prioridade alta.',
    source: TICKETS[module],
    tree: { combinator: 'and', rules: [OPEN, { field: 'priority', operator: '=', value: 'high' }] },
  },
  {
    id: UNASSIGNED[module],
    module,
    name: 'Em aberto sem responsável',
    description: 'Os chamados em aberto que ninguém pegou.',
    source: TICKETS[module],
    tree: { combinator: 'and', rules: [OPEN, { field: 'assignee', operator: 'null' }] },
  },
]);

type Place = Omit<LayoutItem, 'i'>;
type Block = { widget: Widget; place: Place };
type BlockSeed = Pick<Widget, 'kind' | 'title' | 'source'> &
  Partial<Pick<Widget, 'groupBy' | 'splitBy' | 'filterId' | 'period'>>;

const at = (x: number, y: number, w: number, h: number): Place => ({ x, y, w, h });

function block(id: string, seed: BlockSeed, place: Place): Block {
  return {
    widget: {
      id,
      groupBy: null,
      splitBy: null,
      filterId: null,
      onlyMine: false,
      period: 'all',
      window: null,
      ...seed,
    },
    place,
  };
}

export type BoardSeed = {
  module: BoardModule;
  scope: 'team' | 'manager';
  widgets: Widget[];
  layout: LayoutItem[];
  filters: BoardFilter[];
};

function board(module: BoardModule, scope: BoardSeed['scope'], blocks: Block[], filters: BoardFilter[]): BoardSeed {
  return {
    module,
    scope,
    widgets: blocks.map((item) => item.widget),
    layout: blocks.map((item) => ({ i: item.widget.id, ...item.place })),
    /* A ordem da barra é a da lista: cada filtro numa casa, em sequência (a ordem de leitura). */
    filters: filters.map((item, index) => ({ ...item, place: { x: index % GRID_COLUMNS, y: Math.floor(index / GRID_COLUMNS), w: 1, h: 1 } })),
  };
}

/* Os filtros da barra, na ordem em que aparecem: os de uma peça na grade e, por último, as faixas
   de cards. */
const filter = (kind: BoardFilter['kind'], label: string, display?: BoardFilter['display'], width?: BoardFilter['width']): BoardFilter => ({
  id: kind,
  kind,
  label,
  ...(display ? { display } : {}),
  ...(width ? { width } : {}),
});

const PERIOD = filter('period', 'Período', 'select');
const PERSON = filter('person', 'Responsável', 'search');
const PROBLEM = filter('problemType', 'Tipo de problema', 'search');
const REQUESTER = filter('requester', 'Quem abriu', 'search');
const STATUS = filter('ticketStatus', 'Situação', 'select');
const DEPARTMENT = filter('department', 'Departamento', 'search');
const PRIORITY = filter('ticketPriority', 'Prioridade', 'cards', 'full');

/* Os blocos de chamado que todo módulo tem — mudam só a fonte e o filtro salvo. */
function ticketBlocks(module: BoardModule) {
  const source = TICKETS[module];

  return {
    open: (y: number) => block('chamados', { kind: 'stats', title: 'Chamados', source, groupBy: 'open' }, at(0, y, 2, 1)),
    urgent: (x: number, y: number) =>
      block('urgentes', { kind: 'ringCard', title: 'Alta prioridade em aberto', source, filterId: URGENT[module] }, at(x, y, 1, 1)),
    unassigned: (x: number, y: number) =>
      block('sem-responsavel', { kind: 'ringCard', title: 'Sem responsável', source, filterId: UNASSIGNED[module] }, at(x, y, 1, 1)),
    daily: (x: number, y: number) =>
      block('entrada', { kind: 'area', title: 'Chamados abertos por dia', source, groupBy: 'createdDay', period: '30d' }, at(x, y, 2, 2)),
    status: (x: number, y: number) => block('situacao', { kind: 'donut', title: 'Chamados por situação', source, groupBy: 'status' }, at(x, y, 2, 2)),
    problems: (x: number, y: number) =>
      block('problemas', { kind: 'pareto', title: 'Problemas que mais aparecem', source, groupBy: 'problemType', period: '30d' }, at(x, y, 2, 2)),
    departments: (x: number, y: number) =>
      block('departamentos', { kind: 'list', title: 'Departamentos que mais pedem', source, groupBy: 'department', period: '30d' }, at(x, y, 2, 2)),
    age: (x: number, y: number) =>
      block('idade', { kind: 'column', title: 'Há quanto tempo estão abertos', source, groupBy: 'openAge' }, at(x, y, 2, 2)),
    byPerson: (y: number) =>
      block(
        'responsaveis',
        { kind: 'stacked', title: 'Chamados por responsável', source, groupBy: 'assignee', splitBy: 'open', period: '30d' },
        at(0, y, 4, 2),
      ),
    resolved: (x: number, y: number) =>
      block('resolvidos', { kind: 'cumulative', title: 'Resolvidos no acumulado', source, groupBy: 'resolvedDay', period: '30d' }, at(x, y, 2, 2)),
  };
}

/* ------------------------------------------------------------------ Sistema */

const system = ticketBlocks('sistema');

const SYSTEM_TEAM = board(
  'sistema',
  'team',
  [
    system.open(0),
    system.urgent(2, 0),
    system.unassigned(3, 0),
    block('por-sistema', { kind: 'bar', title: 'Chamados por sistema', source: 'systemTickets', groupBy: 'project' }, at(0, 1, 2, 2)),
    system.daily(2, 1),
    system.problems(0, 3),
    block('prioridade', { kind: 'donut', title: 'Chamados por prioridade', source: 'systemTickets', groupBy: 'priority' }, at(2, 3, 2, 2)),
    system.age(0, 5),
    block('quem-abre', { kind: 'list', title: 'Quem mais abre chamado', source: 'systemTickets', groupBy: 'requester', period: '30d' }, at(2, 5, 2, 2)),
    block('github', { kind: 'column', title: 'Atividade no GitHub no mês', source: 'softwareActivity', groupBy: 'type', period: 'month' }, at(0, 7, 2, 2)),
    block('agenda', { kind: 'calendar', title: 'Agenda', source: 'scheduleEvents', groupBy: 'day' }, at(2, 7, 2, 2)),
  ],
  [PERIOD, PERSON, filter('project', 'Sistema', 'search'), STATUS, PROBLEM, PRIORITY, filter('department', 'Departamento', 'cards', 'full')],
);

const SYSTEM_MANAGER = board(
  'sistema',
  'manager',
  [
    system.open(0),
    system.urgent(2, 0),
    system.unassigned(3, 0),
    system.byPerson(1),
    block(
      'sistema-prioridade',
      { kind: 'heatmap', title: 'Sistema × prioridade', source: 'systemTickets', groupBy: 'project', splitBy: 'priority' },
      at(0, 3, 2, 2),
    ),
    system.resolved(2, 3),
    system.age(0, 5),
    system.problems(2, 5),
    block('github-pessoas', { kind: 'bar', title: 'Quem mais mexeu no GitHub', source: 'softwareActivity', groupBy: 'author', period: 'month' }, at(0, 7, 2, 2)),
    block('por-departamento', { kind: 'treemap', title: 'Chamados por departamento', source: 'systemTickets', groupBy: 'department' }, at(2, 7, 2, 2)),
  ],
  [PERIOD, PERSON, filter('project', 'Sistema', 'search'), STATUS, DEPARTMENT, REQUESTER, PRIORITY],
);

/* ------------------------------------------------------------------ Infraestrutura */

const infra = ticketBlocks('infra');

const INFRA_TEAM = board(
  'infra',
  'team',
  [
    infra.open(0),
    block('saude', { kind: 'stats', title: 'Saúde das máquinas', source: 'computers', groupBy: 'healthStatus' }, at(2, 0, 2, 1)),
    infra.daily(0, 1),
    infra.status(2, 1),
    infra.departments(0, 3),
    infra.problems(2, 3),
    block('picos', { kind: 'bar', title: 'Máquinas batendo no teto', source: 'computerAlerts', groupBy: 'machine', period: 'month' }, at(0, 5, 2, 2)),
    block('agendadas', { kind: 'calendar', title: 'Manutenções agendadas', source: 'maintenanceSchedules', groupBy: 'day' }, at(2, 5, 2, 2)),
    block('sem-noticia', { kind: 'column', title: 'Máquinas sem notícia', source: 'computers', groupBy: 'silentAge' }, at(0, 7, 2, 2)),
    infra.urgent(2, 7),
    infra.unassigned(3, 7),
  ],
  [PERIOD, PERSON, DEPARTMENT, PROBLEM, filter('computerHealth', 'Saúde da máquina', 'select'), PRIORITY],
);

const INFRA_MANAGER = board(
  'infra',
  'manager',
  [
    infra.open(0),
    infra.urgent(2, 0),
    infra.unassigned(3, 0),
    infra.byPerson(1),
    infra.age(0, 3),
    block('tipos', { kind: 'donut', title: 'Manutenções por tipo', source: 'maintenances', groupBy: 'type', period: '30d' }, at(2, 3, 2, 2)),
    block(
      'departamento-problema',
      { kind: 'heatmap', title: 'Departamento × problema', source: 'infraTickets', groupBy: 'department', splitBy: 'problemType' },
      at(0, 5, 2, 2),
    ),
    infra.resolved(2, 5),
    block('quem-fez', { kind: 'bar', title: 'Quem mais fez manutenção', source: 'maintenances', groupBy: 'performedBy', period: '30d' }, at(0, 7, 2, 2)),
    block('pesada', { kind: 'list', title: 'Manutenção pesada', source: 'maintenances', groupBy: 'machine' }, at(2, 7, 2, 2)),
  ],
  [PERIOD, PERSON, STATUS, DEPARTMENT, PROBLEM, filter('computerHealth', 'Saúde da máquina', 'select'), PRIORITY],
);

/* ------------------------------------------------------------------ Manutenção */

const upkeep = ticketBlocks('manutencao');

const UPKEEP_TEAM = board(
  'manutencao',
  'team',
  [
    upkeep.open(0),
    block('orcamentos', { kind: 'stats', title: 'Orçamentos', source: 'quotes', groupBy: 'status' }, at(2, 0, 2, 1)),
    upkeep.daily(0, 1),
    upkeep.status(2, 1),
    upkeep.problems(0, 3),
    upkeep.departments(2, 3),
    block('inventario', { kind: 'treemap', title: 'Inventário por categoria', source: 'inventoryItems', groupBy: 'category' }, at(0, 5, 2, 2)),
    block('saldo', { kind: 'halfDonut', title: 'Produtos com e sem saldo', source: 'inventoryItems', groupBy: 'stock' }, at(2, 5, 2, 2)),
    block('deposito', { kind: 'column', title: 'Movimentos do depósito no mês', source: 'inventoryMovements', groupBy: 'type', period: 'month' }, at(0, 7, 2, 2)),
    upkeep.urgent(2, 7),
    upkeep.unassigned(3, 7),
  ],
  [PERIOD, PERSON, DEPARTMENT, PROBLEM, filter('inventoryCategory', 'Categoria do produto', 'select'), PRIORITY],
);

const UPKEEP_MANAGER = board(
  'manutencao',
  'manager',
  [
    upkeep.open(0),
    upkeep.urgent(2, 0),
    upkeep.unassigned(3, 0),
    upkeep.byPerson(1),
    upkeep.age(0, 3),
    block('empresas', { kind: 'bar', title: 'Orçamentos por empresa', source: 'quotes', groupBy: 'supplier' }, at(2, 3, 2, 2)),
    block(
      'orcamento-decisao',
      { kind: 'grouped', title: 'Orçamentos: tipo × decisão', source: 'quotes', groupBy: 'kind', splitBy: 'status' },
      at(0, 5, 2, 2),
    ),
    upkeep.resolved(2, 5),
    upkeep.problems(0, 7),
    block('inventario', { kind: 'treemap', title: 'Inventário por categoria', source: 'inventoryItems', groupBy: 'category' }, at(2, 7, 2, 2)),
  ],
  [PERIOD, PERSON, STATUS, DEPARTMENT, REQUESTER, filter('inventoryCategory', 'Categoria do produto', 'select'), PRIORITY],
);

export const BOARDS_SEED: BoardSeed[] = [SYSTEM_TEAM, SYSTEM_MANAGER, INFRA_TEAM, INFRA_MANAGER, UPKEEP_TEAM, UPKEEP_MANAGER];
