import { describe, expect, it } from 'vitest';

import {
  placedBoardFilters,
  widgetCalendarView,
  widgetIsClickable,
  boardFilterApplies,
  boardPeriodNote,
  ageBandLabel,
  ageBandsOf,
  ageBandsSchema,
  isRelativeDay,
  relativeDayLabel,
  relativeDayOf,
  resolveRelativeDay,
  boardFilterDisplay,
  boardFilterDisplaysOf,
  boardFilterSchema,
  boardMatches,
  boardMatchGroup,
  boardWeight,
  DEFAULT_WINDOW,
  EMPTY_BOARD_FILTER_VALUES,
  type FilterGroup,
  filterProblems,
  filterSize,
  layoutItemSchema,
  MAX_BOARD_WEIGHT,
  MAX_WIDGETS,
  MIN_CELLS_PROBLEM,
  periodRange,
  saveBoardSchema,
  saveFilterSchema,
  TIME_GROUP_PROBLEM,
  WIDGET_KINDS,
  WIDGET_WEIGHTS,
  weightLabel,
  widgetQuerySchema,
  widgetSchema,
  widgetWeight,
  widgetWindowSchema,
  windowLabel,
  windowRange,
  boardFilterCardSource,
  boardFilterKindsOf,
  isSourceOf,
  sourcesOf,
} from './dashboard-board.schema';

const WIDGET = {
  id: 'w1',
  kind: 'column',
  title: 'Alvarás por status',
  source: 'infraTickets',
  groupBy: 'status',
  filterId: null,
};

describe('widgetSchema', () => {
  // feliz
  it('accepts a column block grouped by category', () => {
    expect(widgetSchema.parse(WIDGET).groupBy).toBe('status');
  });

  // triste
  it('rejects a time block grouped by category and a grouping the source lacks', () => {
    expect(widgetSchema.safeParse({ ...WIDGET, kind: 'calendar' }).success).toBe(false);
    expect(widgetSchema.safeParse({ ...WIDGET, groupBy: 'cor' }).success).toBe(false);
    expect(widgetSchema.safeParse({ ...WIDGET, kind: 'stats', groupBy: null }).success).toBe(true);
    expect(
      widgetSchema.safeParse({ ...WIDGET, kind: 'stats', groupBy: 'createdDay' }).success,
    ).toBe(false);
  });

  // feliz
  it('fills new defaults into older blocks, and lets pair blocks cross two categories', () => {
    expect(widgetSchema.parse(WIDGET)).toMatchObject({
      splitBy: null,
      onlyMine: false,
      period: 'all',
    });
    expect(
      widgetSchema.safeParse({ ...WIDGET, kind: 'stacked', splitBy: 'priority', onlyMine: true })
        .success,
    ).toBe(true);
  });

  // triste
  it('rejects a pair without a second or with a repeated category, and "only mine" without a person', () => {
    expect(widgetSchema.safeParse({ ...WIDGET, kind: 'heatmap' }).success).toBe(false);
    expect(widgetSchema.safeParse({ ...WIDGET, kind: 'sankey', splitBy: 'status' }).success).toBe(
      false,
    );
    expect(
      widgetSchema.safeParse({ ...WIDGET, source: 'computers', onlyMine: true }).success,
    ).toBe(false);
  });

  // feliz
  it('accepts the new charts with the grouping each one needs', () => {
    for (const kind of ['pie', 'rose', 'halfDonut', 'pareto']) {
      expect(widgetSchema.safeParse({ ...WIDGET, kind }).success).toBe(true);
    }
    expect(
      widgetSchema.safeParse({ ...WIDGET, kind: 'cumulative', groupBy: 'createdMonth' }).success,
    ).toBe(true);
    expect(widgetSchema.safeParse({ ...WIDGET, kind: 'grouped', splitBy: 'priority' }).success).toBe(
      true,
    );
  });

  // triste
  it('rejects an accumulated line by category and side-by-side columns without a second one', () => {
    const accumulated = widgetSchema.safeParse({ ...WIDGET, kind: 'cumulative' });
    expect(accumulated.success).toBe(false);
    /* O motivo diz o que fazer: mudar o "Agrupar por" para um dia ou um mês. */
    expect(accumulated.error?.issues[0]?.message).toBe(TIME_GROUP_PROBLEM);
    expect(widgetSchema.safeParse({ ...WIDGET, kind: 'grouped' }).success).toBe(false);
  });
});

describe('periodRange', () => {
  // feliz
  it('counts the days from today, ends included', () => {
    expect(periodRange('today', '2026-11-07')).toEqual({ from: '2026-11-07', to: '2026-11-07' });
    expect(periodRange('7d', '2026-11-07')).toEqual({ from: '2026-11-01', to: '2026-11-07' });
    expect(periodRange('month', '2026-11-07')).toEqual({ from: '2026-11-01', to: '2026-11-07' });
  });

  // triste
  it('does not cut on "all", and lets 30 days cross the month', () => {
    expect(periodRange('all', '2026-11-07')).toBeNull();
    expect(periodRange('30d', '2026-11-07')?.from).toBe('2026-10-09');
  });
});

describe('layoutItemSchema', () => {
  // feliz
  it('accepts 2 wide or 2 tall', () => {
    expect(layoutItemSchema.safeParse({ i: 'a', x: 0, y: 0, w: 2, h: 1 }).success).toBe(true);
    expect(layoutItemSchema.safeParse({ i: 'a', x: 3, y: 0, w: 1, h: 2 }).success).toBe(true);
  });

  // triste
  it('rejects blocks past the edge, and leaves 1x1 to the board, which knows the kind', () => {
    expect(layoutItemSchema.safeParse({ i: 'a', x: 3, y: 0, w: 2, h: 2 }).success).toBe(false);
    expect(layoutItemSchema.safeParse({ i: 'a', x: 0, y: 0, w: 1, h: 1 }).success).toBe(true);
  });
});

describe('saveBoardSchema', () => {
  // triste
  /* O teto da lista (24) é só a trava contra um pedido absurdo; quem limita o painel é a cota de
     pontos, conferida no servidor. */
  it('rejects more blocks than the list cap and blocks without a place', () => {
    const widgets = Array.from({ length: MAX_WIDGETS + 1 }, (_, index) => ({
      ...WIDGET,
      id: `w${index}`,
    }));
    const layout = widgets.map((widget, index) => ({
      i: widget.id,
      x: 0,
      y: index * 2,
      w: 2,
      h: 2,
    }));
    expect(saveBoardSchema.safeParse({ widgets, layout }).success).toBe(false);
    expect(saveBoardSchema.safeParse({ widgets: [WIDGET], layout: [] }).success).toBe(false);
  });

  // feliz
  it('accepts a board with every block placed', () => {
    expect(
      saveBoardSchema.safeParse({
        widgets: [WIDGET],
        layout: [{ i: 'w1', x: 0, y: 0, w: 2, h: 2 }],
      }).success,
    ).toBe(true);
  });

  // feliz
  /* REGRESSÃO: a tela deixava o card com anel em 1x1, mas o contrato recusava e o painel não
     salvava. */
  it('accepts a ring card in a single cell', () => {
    const ring = { ...WIDGET, id: 'r1', kind: 'ringCard', groupBy: null };
    expect(
      saveBoardSchema.safeParse({
        widgets: [WIDGET, ring],
        layout: [
          { i: 'w1', x: 0, y: 0, w: 2, h: 2 },
          { i: 'r1', x: 2, y: 0, w: 1, h: 1 },
        ],
      }).success,
    ).toBe(true);
  });

  // triste
  it('rejects any other block in a single cell, pointing at its place', () => {
    const result = saveBoardSchema.safeParse({
      widgets: [WIDGET],
      layout: [{ i: 'w1', x: 0, y: 0, w: 1, h: 1 }],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      message: MIN_CELLS_PROBLEM,
      path: ['layout', 0],
    });
  });
});

describe('filter tree', () => {
  const tree: FilterGroup = {
    combinator: 'and',
    rules: [
      { field: 'status', operator: 'in' as const, value: ['Em andamento'] },
      {
        combinator: 'or' as const,
        rules: [{ field: 'assignee', operator: '=' as const, value: 'Ana' }],
      },
    ],
  };

  // feliz
  it('counts levels and rules and accepts the source fields', () => {
    expect(filterSize(tree)).toEqual({ depth: 2, rules: 2 });
    expect(filterProblems('infraTickets', tree)).toEqual([]);
    expect(
      saveFilterSchema.safeParse({
        name: 'Meus em andamento',
        source: 'infraTickets',
        scope: 'personal',
        tree,
      }).success,
    ).toBe(true);
  });

  // triste
  it('rejects fields from another source and trees that are too deep', () => {
    expect(filterProblems('computers', tree)).toContain('"assignee" não é um campo de Máquinas.');
    let deep: FilterGroup = tree;
    for (let level = 0; level < 5; level += 1) deep = { combinator: 'and', rules: [deep] };
    expect(filterProblems('infraTickets', deep)[0]).toMatch(/níveis/);
  });
});

describe('agenda window', () => {
  const AGENDA = { ...WIDGET, kind: 'agenda', groupBy: 'createdDay' };

  // feliz
  it('accepts a day agenda with one of the offered counts', () => {
    const parsed = widgetSchema.safeParse({
      ...AGENDA,
      window: { mode: 'relative', unit: 'month', count: 2, direction: 'next' },
    });

    expect(parsed.success).toBe(true);
  });

  // feliz
  it('counts the window from the start of today, this week or this month', () => {
    const today = '2026-11-18';
    expect(
      windowRange({ mode: 'relative', unit: 'month', count: 2, direction: 'next' }, today),
    ).toEqual({ from: '2026-11-01', to: '2026-12-31' });
    expect(
      windowRange({ mode: 'relative', unit: 'week', count: 1, direction: 'next' }, today),
    ).toEqual({ from: '2026-11-15', to: '2026-11-21' });
    expect(
      windowRange({ mode: 'relative', unit: 'day', count: 7, direction: 'last' }, today),
    ).toEqual({ from: '2026-11-12', to: '2026-11-18' });
    expect(windowLabel({ mode: 'relative', unit: 'week', count: 2, direction: 'next' })).toBe(
      'Próximas 2 semanas',
    );
  });

  // triste
  it('rejects over 90 days, unlisted counts, an agenda without window or by month', () => {
    const tooLong = widgetWindowSchema.safeParse({
      mode: 'custom',
      from: '2026-01-01',
      to: '2026-12-31',
    });
    const odd = widgetWindowSchema.safeParse({
      mode: 'relative',
      unit: 'day',
      count: 365,
      direction: 'next',
    });

    expect(tooLong.success).toBe(false);
    expect(tooLong.error?.issues[0]?.message).toMatch(/90 dias/);
    expect(odd.success).toBe(false);
    expect(widgetSchema.safeParse(AGENDA).success).toBe(false);
    expect(
      widgetSchema.safeParse({ ...AGENDA, groupBy: 'createdMonth', window: DEFAULT_WINDOW })
        .success,
    ).toBe(false);
  });

  // triste
  it('rejects inverted dates', () => {
    expect(
      widgetWindowSchema.safeParse({ mode: 'custom', from: '2026-11-30', to: '2026-11-01' })
        .success,
    ).toBe(false);
  });
});

describe('board field filters', () => {
  // feliz
  it('turns the chosen values into field matches only where the source has the field', () => {
    const values = {
      ...EMPTY_BOARD_FILTER_VALUES,
      ticketStatus: 'in_progress',
      department: 'FISCAL',
    };

    expect(boardMatches(values, 'infraTickets')).toEqual([
      { field: 'status', value: 'in_progress' },
      { field: 'department', value: 'FISCAL' },
    ]);
    /* A máquina não tem situação de chamado: só o departamento vale nela. */
    expect(boardMatches(values, 'computers')).toEqual([{ field: 'department', value: 'FISCAL' }]);
    expect(boardMatchGroup(boardMatches({ ...values, department: null }, 'infraTickets'))).toEqual({
      combinator: 'and',
      rules: [{ field: 'status', operator: '=', value: 'in_progress' }],
    });
  });

  // feliz
  it('applies each kind only to its sources', () => {
    expect(boardFilterApplies('ticketPriority', 'infraTickets')).toBe(true);
    expect(boardFilterApplies('ticketPriority', 'computers')).toBe(false);
    expect(boardFilterApplies('department', 'inventoryItems')).toBe(true);
    expect(boardFilterApplies('department', 'computers')).toBe(true);
    expect(boardFilterApplies('period', 'maintenances')).toBe(true);
  });

  // triste
  it('adds nothing without a chosen value or on a source without the field', () => {
    expect(boardMatches(EMPTY_BOARD_FILTER_VALUES, 'infraTickets')).toEqual([]);
    /* A movimentação de peça não tem departamento: o filtro não vale nela. */
    expect(
      boardMatches({ ...EMPTY_BOARD_FILTER_VALUES, department: 'FISCAL' }, 'partMovements'),
    ).toEqual([]);
    expect(boardMatchGroup([])).toBeNull();
  });

  // triste
  it('refuses a widget query with a blank match value', () => {
    const query = {
      source: 'infraTickets',
      groupBy: null,
      filterId: null,
      matches: [{ field: 'status', value: '  ' }],
    };

    expect(widgetQuerySchema.safeParse(query).success).toBe(false);
    expect(widgetQuerySchema.parse({ ...query, matches: undefined }).matches).toEqual([]);
  });
});

describe('widget weights', () => {
  // feliz
  it('weighs each block by what it costs, and sums the board', () => {
    expect(widgetWeight({ kind: 'ringCard' })).toBe(1);
    expect(widgetWeight({ kind: 'stats', groupBy: null })).toBe(1);
    expect(widgetWeight({ kind: 'stats', groupBy: 'status' })).toBe(2);
    expect(widgetWeight({ kind: 'area' })).toBe(3);
    expect(widgetWeight({ kind: 'heatmap' })).toBe(4);
    expect(boardWeight([{ kind: 'ringCard' }, { kind: 'column' }, { kind: 'sankey' }])).toBe(7);
    expect(weightLabel(1)).toBe('1 ponto');
    expect(weightLabel(4)).toBe('4 pontos');
  });

  // triste
  it('gives every kind a weight between 1 and 4, and an empty board weighs nothing', () => {
    for (const kind of WIDGET_KINDS) {
      expect(WIDGET_WEIGHTS[kind]).toBeGreaterThanOrEqual(1);
      expect(WIDGET_WEIGHTS[kind]).toBeLessThanOrEqual(4);
    }
    expect(boardWeight([])).toBe(0);
    expect(MAX_WIDGETS).toBeGreaterThanOrEqual(MAX_BOARD_WEIGHT);
  });
});

describe('board filter display', () => {
  // feliz
  it('keeps the component chosen for a filter, and reads an old filter without one', () => {
    const chosen = boardFilterSchema.parse({
      id: 'f',
      kind: 'ticketStatus',
      label: 'Status',
      display: 'chips',
    });
    const old = boardFilterSchema.parse({ id: 'f', kind: 'ticketStatus', label: 'Status' });

    expect(boardFilterDisplay(chosen)).toBe('chips');
    expect(boardFilterDisplay(old)).toBe('select');
    expect(boardFilterDisplay({ kind: 'person' })).toBe('search');
    expect(boardFilterDisplaysOf('person')).toContain('avatars');
  });

  // triste
  it('falls back to the default when the component does not fit the filter, and refuses an unknown one', () => {
    expect(boardFilterDisplay({ kind: 'period', display: 'avatars' })).toBe('select');
    expect(
      boardFilterSchema.safeParse({ id: 'f', kind: 'city', label: 'Cidade', display: 'mapa' })
        .success,
    ).toBe(false);
  });
});

describe('calendar widget options', () => {
  // feliz
  it('opens in the view chosen, and is clickable unless told otherwise', () => {
    expect(widgetCalendarView({ kind: 'agenda', calendarView: 'week' })).toBe('week');
    expect(widgetIsClickable({})).toBe(true);
    expect(widgetIsClickable({ isClickable: false })).toBe(false);
  });

  // triste
  it('falls back to the view of the kind on a board saved before the choice', () => {
    expect(widgetCalendarView({ kind: 'calendar' })).toBe('year');
    expect(widgetCalendarView({ kind: 'agenda', calendarView: null })).toBe('month');
  });
});

describe('placedBoardFilters', () => {
  // feliz
  it('keeps a saved place and puts the rest in the next free spot, sized by the display', () => {
    const placed = placedBoardFilters([
      { id: 'person', kind: 'person', label: 'Pessoa', place: { x: 0, y: 0, w: 2, h: 2 } },
      { id: 'period', kind: 'period', label: 'Período' },
      { id: 'type', kind: 'ticketPriority', label: 'Tipo', display: 'chips' },
      { id: 'status', kind: 'ticketStatus', label: 'Status', display: 'cards' },
    ]);

    expect(placed.map((filter) => filter.place)).toEqual([
      { x: 0, y: 0, w: 2, h: 2 },
      { x: 2, y: 0, w: 1, h: 1 },
      { x: 2, y: 1, w: 2, h: 2 },
      { x: 0, y: 3, w: 4, h: 1 },
    ]);
  });

  // triste
  it('never stacks two filters, and forgets a place of the old 12-column grid instead of failing', () => {
    const placed = placedBoardFilters([
      { id: 'a', kind: 'period', label: 'A', place: { x: 0, y: 0, w: 4, h: 1 } },
      { id: 'b', kind: 'department', label: 'B' },
    ]);

    expect(placed[1]?.place).toEqual({ x: 0, y: 1, w: 1, h: 1 });
    const old = boardFilterSchema.parse({
      id: 'c',
      kind: 'department',
      label: 'C',
      place: { x: 10, y: 0, w: 3, h: 2 },
    });
    expect(old.place).toBeUndefined();
  });

  // feliz
  it('offers cards only to the filters that have a count per option', () => {
    expect(boardFilterDisplaysOf('ticketStatus')).toContain('cards');
    expect(boardFilterDisplaysOf('person')).toContain('cards');
    expect(boardFilterDisplaysOf('period')).not.toContain('cards');
  });
});

describe('boardPeriodNote', () => {
  const LAST_30 = { mode: 'relative', direction: 'last', count: 30, unit: 'day' } as const;

  // feliz
  it('tells that the board period cuts tickets by the day they were opened', () => {
    expect(boardPeriodNote('infraTickets', LAST_30)).toBe('Recorte pela abertura');
  });

  // triste
  it('says nothing with "each block" chosen, or for the other sources', () => {
    expect(boardPeriodNote('infraTickets', null)).toBeNull();
    expect(boardPeriodNote('quotes', LAST_30)).toBeNull();
  });
});

/* O dia em que se pergunta: domingo, 15/11/2026. */
const SUNDAY = '2026-11-15';

describe('relative days in a filter', () => {
  // feliz
  it('means today, today ± N, the start of the month and of the week (Monday)', () => {
    expect(resolveRelativeDay('@today', SUNDAY)).toBe(SUNDAY);
    expect(resolveRelativeDay('@today+3', SUNDAY)).toBe('2026-11-18');
    expect(resolveRelativeDay('@today-15', SUNDAY)).toBe('2026-10-31');
    expect(resolveRelativeDay('@monthStart', SUNDAY)).toBe('2026-11-01');
    expect(resolveRelativeDay('@weekStart', SUNDAY)).toBe('2026-11-09');
    expect(resolveRelativeDay('@weekStart', '2026-11-16')).toBe('2026-11-16');
    expect(relativeDayOf(-7)).toBe('@today-7');
    expect(relativeDayLabel('@today-1')).toBe('Hoje − 1 dia');
    expect(relativeDayLabel('@today+30')).toBe('Hoje + 30 dias');
  });

  // triste
  it('leaves an exact day alone and refuses what is not a relative day', () => {
    expect(resolveRelativeDay('2026-12-31', SUNDAY)).toBe('2026-12-31');
    expect(isRelativeDay('@today')).toBe(true);
    expect(isRelativeDay('@amanha')).toBe(false);
    expect(isRelativeDay('@today+')).toBe(false);
  });
});

describe('age bands', () => {
  // feliz
  it('cuts the days into ordered bands, the last one open', () => {
    expect(ageBandsOf().map((band) => band.key)).toEqual([
      '0000-0002',
      '0003-0007',
      '0008-0015',
      '0016-0030',
      '0031+',
    ]);
    expect(ageBandLabel('0003-0007')).toBe('3 a 7 dias');
    expect(ageBandLabel('0031+')).toBe('31 dias ou mais');
    expect(ageBandLabel('(A vencer)')).toBe('(A vencer)');
  });

  // triste
  it('refuses limits out of order, and too many bands', () => {
    expect(ageBandsSchema.safeParse([7, 2]).success).toBe(false);
    expect(ageBandsSchema.safeParse([1, 2, 3, 4, 5, 6, 7, 8, 9]).success).toBe(false);
  });

  // feliz
  it('groups a category block by an age band, and a time block by week', () => {
    const base = { id: 'w1', title: 'Idade', source: 'infraTickets', filterId: null };

    expect(
      widgetSchema.safeParse({ ...base, kind: 'column', groupBy: 'openAge', ageBands: [5, 10] })
        .success,
    ).toBe(true);
    expect(
      widgetSchema.safeParse({ ...base, kind: 'area', groupBy: 'createdWeek' }).success,
    ).toBe(true);
  });

  // triste
  it('does not draw an age band in time, nor a week in a calendar of days', () => {
    const base = { id: 'w1', title: 'Idade', source: 'infraTickets', filterId: null };

    expect(widgetSchema.safeParse({ ...base, kind: 'area', groupBy: 'staleAge' }).success).toBe(
      false,
    );
    expect(
      widgetSchema.safeParse({
        ...base,
        kind: 'agenda',
        groupBy: 'createdWeek',
        window: { mode: 'relative', unit: 'month', count: 1, direction: 'next' },
      }).success,
    ).toBe(false);
  });
});

describe('module sources', () => {
  // feliz
  it('offers each module only its own sources', () => {
    expect(sourcesOf('infra')).toContain('computers');
    expect(sourcesOf('sistema')).toEqual([
      'systemTickets',
      'softwareProjects',
      'softwareActivity',
      'scheduleEvents',
    ]);
    expect(isSourceOf('manutencao', 'quotes')).toBe(true);
  });

  // triste
  it('never lends a source to another module', () => {
    expect(sourcesOf('infra')).not.toContain('quotes');
    expect(isSourceOf('sistema', 'computers')).toBe(false);
  });
});

describe('boardFilterCardSource', () => {
  // feliz
  it('counts the cards on the tickets of the module', () => {
    expect(boardFilterCardSource('person', 'sistema')).toEqual({
      source: 'systemTickets',
      groupBy: 'assignee',
    });
  });

  // triste
  it('has no count per option for the period', () => {
    expect(boardFilterCardSource('period', 'infra')).toBeNull();
  });
});

describe('boardFilterKindsOf', () => {
  // feliz
  it('offers each module only the filters some of its sources have', () => {
    expect(boardFilterKindsOf('sistema')).toContain('project');
    expect(boardFilterKindsOf('infra')).toContain('computerHealth');
    expect(boardFilterKindsOf('manutencao')).toContain('inventoryCategory');
    expect(boardFilterKindsOf('infra')).toEqual(expect.arrayContaining(['person', 'period', 'problemType', 'requester']));
  });

  // triste
  it('leaves out the filters of another module', () => {
    expect(boardFilterKindsOf('infra')).not.toContain('project');
    expect(boardFilterKindsOf('manutencao')).not.toContain('computerHealth');
    expect(boardFilterKindsOf('sistema')).not.toContain('inventoryCategory');
  });
});

describe('the new field filters', () => {
  // feliz
  it('count in their own source and cut the blocks that have the field', () => {
    expect(boardFilterCardSource('computerHealth', 'infra')).toEqual({ source: 'computers', groupBy: 'healthStatus' });
    expect(boardFilterCardSource('problemType', 'manutencao')).toEqual({ source: 'maintenanceTickets', groupBy: 'problemType' });
    expect(boardMatches({ ...EMPTY_BOARD_FILTER_VALUES, project: 'Paralegal' }, 'softwareActivity')).toEqual([{ field: 'project', value: 'Paralegal' }]);
  });

  // triste
  it('have no count outside their module and leave other sources alone', () => {
    expect(boardFilterCardSource('project', 'infra')).toBeNull();
    expect(boardMatches({ ...EMPTY_BOARD_FILTER_VALUES, computerHealth: 'critical' }, 'infraTickets')).toEqual([]);
  });
});

