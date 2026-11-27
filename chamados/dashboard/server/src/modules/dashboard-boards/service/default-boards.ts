import {
  type BoardFilter,
  type BoardModule,
  type DashboardScope,
  hasPersonField,
  type LayoutItem,
  type Widget,
} from '@template/shared/schemas/dashboard-board.schema';

/**
 * O PAINEL PADRÃO de cada módulo e contexto — o que aparece enquanto ninguém montou o seu.
 *
 * O da Equipe traz o que o painel fixo de cada módulo mostrava (os chamados, as máquinas e as
 * manutenções na Infraestrutura; os chamados, os sistemas e o GitHub no Sistema; os chamados, o
 * inventário e os orçamentos na Manutenção), mais o perfil dos chamados por tipo e por
 * departamento (que moravam na fila) e as tarefas, nos módulos que as têm. O do Gestor é o mesmo olhar com o movimento de cada
 * pessoa. O Pessoal é o da Equipe só com o que é de quem vê ("só os meus").
 */
type WidgetSeed = Omit<Widget, 'id' | 'filterId' | 'splitBy' | 'onlyMine' | 'period' | 'window'> &
  Partial<Pick<Widget, 'splitBy' | 'onlyMine' | 'period' | 'window'>>;

type Seed = { widget: Widget; place: Omit<LayoutItem, 'i'> };

const block = (id: string, seed: WidgetSeed, place: Omit<LayoutItem, 'i'>): Seed => ({
  widget: {
    id,
    filterId: null,
    splitBy: null,
    onlyMine: false,
    period: 'all',
    window: null,
    ...seed,
  },
  place,
});

type DefaultBoard = { widgets: Widget[]; layout: LayoutItem[]; filters: BoardFilter[] };

function boardOf(seeds: readonly Seed[], filters: BoardFilter[] = PERSON_AND_PERIOD): DefaultBoard {
  return {
    widgets: seeds.map((seed) => seed.widget),
    layout: seeds.map((seed) => ({ i: seed.widget.id, ...seed.place })),
    filters,
  };
}

const PERSON_AND_PERIOD: BoardFilter[] = [
  { id: 'pessoa', kind: 'person', label: 'Responsável' },
  { id: 'periodo', kind: 'period', label: 'Período' },
];

/* ------------------------------------------------------------------ Infraestrutura */

const INFRA_TEAM: Seed[] = [
  block('chamados', { kind: 'stats', title: 'Chamados', source: 'infraTickets', groupBy: 'open' }, { x: 0, y: 0, w: 2, h: 1 }),
  block('saude', { kind: 'stats', title: 'Saúde das máquinas', source: 'computers', groupBy: 'healthStatus' }, { x: 2, y: 0, w: 2, h: 1 }),
  block('entrada', { kind: 'area', title: 'Chamados abertos por dia', source: 'infraTickets', groupBy: 'createdDay', period: '30d' }, { x: 0, y: 1, w: 2, h: 2 }),
  block('situacao', { kind: 'donut', title: 'Chamados por situação', source: 'infraTickets', groupBy: 'status' }, { x: 2, y: 1, w: 2, h: 2 }),
  block('socorro', { kind: 'list', title: 'Quem mais pediu socorro', source: 'infraTickets', groupBy: 'department', period: '30d' }, { x: 0, y: 3, w: 2, h: 2 }),
  block('pesada', { kind: 'list', title: 'Manutenção pesada', source: 'maintenances', groupBy: 'machine' }, { x: 2, y: 3, w: 2, h: 2 }),
  block('picos', { kind: 'bar', title: 'Máquinas batendo no teto', source: 'computerAlerts', groupBy: 'machine', period: 'month' }, { x: 0, y: 5, w: 2, h: 2 }),
  block('agendadas', { kind: 'calendar', title: 'Manutenções agendadas', source: 'maintenanceSchedules', groupBy: 'day' }, { x: 2, y: 5, w: 2, h: 2 }),
  /* O perfil do que dá trabalho e as tarefas da equipe — eram gráficos da fila de Chamados e
     números da tela de Tarefas; o lugar deles é aqui (regra `dashboard-standard`). */
  block('tipos-problema', { kind: 'radar', title: 'Problemas por tipo', source: 'infraTickets', groupBy: 'problemType' }, { x: 0, y: 7, w: 2, h: 2 }),
  block('tarefas', { kind: 'donut', title: 'Tarefas por situação', source: 'infraTasks', groupBy: 'status' }, { x: 2, y: 7, w: 2, h: 2 }),
];

const INFRA_MANAGER: Seed[] = [
  ...INFRA_TEAM.slice(0, 4),
  block('responsaveis', { kind: 'stacked', title: 'Chamados por responsável', source: 'infraTickets', groupBy: 'assignee', splitBy: 'open', period: '30d' }, { x: 0, y: 3, w: 4, h: 2 }),
  block('idade', { kind: 'column', title: 'Há quanto tempo estão abertos', source: 'infraTickets', groupBy: 'openAge' }, { x: 0, y: 5, w: 2, h: 2 }),
  block('tipos', { kind: 'donut', title: 'Manutenções por tipo', source: 'maintenances', groupBy: 'type', period: '30d' }, { x: 2, y: 5, w: 2, h: 2 }),
  block('tarefas-responsaveis', { kind: 'list', title: 'Tarefas por responsável', source: 'infraTasks', groupBy: 'owner' }, { x: 0, y: 7, w: 2, h: 2 }),
];

/* ------------------------------------------------------------------ Sistema */

const SYSTEM_TEAM: Seed[] = [
  block('chamados', { kind: 'stats', title: 'Chamados', source: 'systemTickets', groupBy: 'open' }, { x: 0, y: 0, w: 2, h: 1 }),
  block('sistemas', { kind: 'stats', title: 'Sistemas', source: 'softwareProjects', groupBy: 'status' }, { x: 2, y: 0, w: 2, h: 1 }),
  block('por-sistema', { kind: 'bar', title: 'Chamados por sistema', source: 'systemTickets', groupBy: 'project' }, { x: 0, y: 1, w: 2, h: 2 }),
  block('entrada', { kind: 'area', title: 'Chamados abertos por dia', source: 'systemTickets', groupBy: 'createdDay', period: '30d' }, { x: 2, y: 1, w: 2, h: 2 }),
  block('github', { kind: 'column', title: 'Atividade no GitHub no mês', source: 'softwareActivity', groupBy: 'type', period: 'month' }, { x: 0, y: 3, w: 2, h: 2 }),
  block('agenda', { kind: 'calendar', title: 'Agenda', source: 'scheduleEvents', groupBy: 'day' }, { x: 2, y: 3, w: 2, h: 2 }),
  block('tipos-problema', { kind: 'radar', title: 'Problemas por tipo', source: 'systemTickets', groupBy: 'problemType' }, { x: 0, y: 5, w: 2, h: 2 }),
  block('departamentos', { kind: 'list', title: 'Departamentos com mais chamados', source: 'systemTickets', groupBy: 'department', period: '30d' }, { x: 2, y: 5, w: 2, h: 2 }),
  block('tarefas', { kind: 'donut', title: 'Tarefas por situação', source: 'systemTasks', groupBy: 'status' }, { x: 0, y: 7, w: 2, h: 2 }),
  /* A produtividade por desenvolvedor saiu do Cronograma: é o GitHub do mês, por autor. */
  block('desenvolvedores', { kind: 'list', title: 'Atividade no GitHub por pessoa', source: 'softwareActivity', groupBy: 'author', period: 'month' }, { x: 2, y: 7, w: 2, h: 2 }),
];

const SYSTEM_MANAGER: Seed[] = [
  ...SYSTEM_TEAM.slice(0, 4),
  block('autores', { kind: 'stacked', title: 'Quem mexeu no GitHub, no mês', source: 'softwareActivity', groupBy: 'author', splitBy: 'type', period: 'month' }, { x: 0, y: 3, w: 4, h: 2 }),
  block('idade', { kind: 'column', title: 'Há quanto tempo estão abertos', source: 'systemTickets', groupBy: 'openAge' }, { x: 0, y: 5, w: 2, h: 2 }),
  block('responsaveis', { kind: 'list', title: 'Chamados por responsável', source: 'systemTickets', groupBy: 'assignee' }, { x: 2, y: 5, w: 2, h: 2 }),
];

/* ------------------------------------------------------------------ Manutenção */

const MAINTENANCE_TEAM: Seed[] = [
  block('chamados', { kind: 'stats', title: 'Chamados', source: 'maintenanceTickets', groupBy: 'open' }, { x: 0, y: 0, w: 2, h: 1 }),
  block('estoque', { kind: 'stats', title: 'Inventário', source: 'inventoryItems', groupBy: 'stock' }, { x: 2, y: 0, w: 2, h: 1 }),
  block('situacao', { kind: 'donut', title: 'Chamados por situação', source: 'maintenanceTickets', groupBy: 'status' }, { x: 0, y: 1, w: 2, h: 2 }),
  block('orcamentos', { kind: 'donut', title: 'Orçamentos por decisão', source: 'quotes', groupBy: 'status' }, { x: 2, y: 1, w: 2, h: 2 }),
  block('categorias', { kind: 'column', title: 'Produtos por categoria', source: 'inventoryItems', groupBy: 'category' }, { x: 0, y: 3, w: 2, h: 2 }),
  block('movimentos', { kind: 'area', title: 'Movimentos do depósito', source: 'inventoryMovements', groupBy: 'day', period: '30d' }, { x: 2, y: 3, w: 2, h: 2 }),
  block('tipos-problema', { kind: 'radar', title: 'Problemas por tipo', source: 'maintenanceTickets', groupBy: 'problemType' }, { x: 0, y: 5, w: 2, h: 2 }),
  block('departamentos', { kind: 'list', title: 'Departamentos com mais chamados', source: 'maintenanceTickets', groupBy: 'department', period: '30d' }, { x: 2, y: 5, w: 2, h: 2 }),
];

const MAINTENANCE_MANAGER: Seed[] = [
  ...MAINTENANCE_TEAM.slice(0, 4),
  block('responsaveis', { kind: 'stacked', title: 'Chamados por responsável', source: 'maintenanceTickets', groupBy: 'assignee', splitBy: 'open', period: '30d' }, { x: 0, y: 3, w: 4, h: 2 }),
  block('descarte', { kind: 'donut', title: 'Descartes por motivo', source: 'inventoryMovements', groupBy: 'reason', period: 'month' }, { x: 0, y: 5, w: 2, h: 2 }),
  block('idade', { kind: 'column', title: 'Há quanto tempo estão abertos', source: 'maintenanceTickets', groupBy: 'openAge' }, { x: 2, y: 5, w: 2, h: 2 }),
];

const TEAM: Record<BoardModule, Seed[]> = {
  infra: INFRA_TEAM,
  sistema: SYSTEM_TEAM,
  manutencao: MAINTENANCE_TEAM,
};

const MANAGER: Record<BoardModule, Seed[]> = {
  infra: INFRA_MANAGER,
  sistema: SYSTEM_MANAGER,
  manutencao: MAINTENANCE_MANAGER,
};

/** O Pessoal: o painel da Equipe com "só os meus" onde a fonte tem pessoa. */
function personal(seeds: readonly Seed[]): Seed[] {
  return seeds.map((seed) => ({
    ...seed,
    widget: { ...seed.widget, onlyMine: hasPersonField(seed.widget.source) },
  }));
}

export function defaultBoard(module: BoardModule, scope: DashboardScope): DefaultBoard {
  if (scope === 'manager') return boardOf(MANAGER[module]);
  if (scope === 'personal') return boardOf(personal(TEAM[module]), [PERSON_AND_PERIOD[1]!]);

  return boardOf(TEAM[module]);
}
