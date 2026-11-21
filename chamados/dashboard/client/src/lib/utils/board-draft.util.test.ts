import { EMPTY_BOARD_FILTER_VALUES, type Widget } from '@template/shared/schemas/dashboard-board.schema';
import { describe, expect, it } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import {
  activeValues,
  addBoardFilter,
  type BoardDraft,
  filterCountQuery,
  normalizeLayout,
  removeBoardFilter,
  removeWidget,
  saveErrorOf,
  setBoardFilterDisplay,
  setBoardFilterPlaces,
  setBoardFilterWidth,
  upsertWidget,
  visibleScopes,
} from './board-draft.util';

const WIDGET: Widget = {
  id: 'a',
  kind: 'column',
  title: 'Chamados por situação',
  source: 'infraTickets',
  groupBy: 'status',
  splitBy: null,
  filterId: null,
  onlyMine: false,
  period: 'all',
  window: null,
};

const DRAFT: BoardDraft = { widgets: [WIDGET], layout: [{ i: 'a', x: 0, y: 0, w: 2, h: 2 }], filters: [] };

describe('visibleScopes', () => {
  // feliz
  it('shows the manager tab to the manager and the admin of the module', () => {
    expect(visibleScopes({ role: 'manager', roles: { infra: 'manager' } }, 'infra').map((s) => s.value)).toEqual([
      'team',
      'manager',
      'personal',
    ]);
  });

  // triste
  it('hides the manager tab from plain users and from managers of another module', () => {
    expect(visibleScopes({ role: 'user', roles: { infra: 'user' } }, 'infra').map((s) => s.label)).toEqual([
      'Equipe',
      'Pessoal',
    ]);
    expect(visibleScopes({ role: 'admin', roles: { sistema: 'admin' } }, 'infra')).toHaveLength(2);
  });
});

describe('the draft of a board', () => {
  // feliz
  it('puts a new block under everything and swaps the content of an existing one', () => {
    const added = upsertWidget(DRAFT, { ...WIDGET, id: 'b', kind: 'stats' });
    expect(added.layout.find((item) => item.i === 'b')).toEqual({ i: 'b', x: 0, y: 2, w: 4, h: 1 });

    const swapped = upsertWidget(added, { ...WIDGET, title: 'Novo título' });
    expect(swapped.widgets.find((widget) => widget.id === 'a')?.title).toBe('Novo título');
    expect(swapped.layout).toHaveLength(2);
  });

  // feliz
  it('removes a block and lifts the rest', () => {
    const two = upsertWidget(DRAFT, { ...WIDGET, id: 'b' });
    const removed = removeWidget(two, 'a');

    expect(removed.widgets.map((widget) => widget.id)).toEqual(['b']);
    expect(removed.layout[0]).toMatchObject({ i: 'b', y: 0 });
  });

  // triste
  it('never keeps a chart in a single cell, nor past the border', () => {
    expect(normalizeLayout([{ i: 'a', x: 3, y: 0, w: 1, h: 1 }])).toEqual([{ i: 'a', x: 3, y: 0, w: 1, h: 2 }]);
    expect(normalizeLayout([{ i: 'a', x: 3, y: 0, w: 4, h: 1 }])[0]).toMatchObject({ x: 0, w: 4 });
  });

  // feliz
  it('adds one filter of each kind, changes its look and takes it off', () => {
    const withPerson = addBoardFilter(DRAFT, 'person');
    expect(addBoardFilter(withPerson, 'person').filters).toHaveLength(1);

    expect(setBoardFilterDisplay(withPerson, 'person', 'cards').filters[0]?.display).toBe('cards');
    expect(setBoardFilterWidth(withPerson, 'person', 'full').filters[0]?.width).toBe('full');
    expect(setBoardFilterWidth(withPerson, 'outro', 'full').filters[0]?.width).toBeUndefined();
    expect(removeBoardFilter(withPerson, 'person').filters).toEqual([]);
  });

  // triste
  it('drops the chosen value of a filter the board no longer has', () => {
    const values = activeValues([{ id: 'person', kind: 'person', label: 'Pessoa' }], {
      ...EMPTY_BOARD_FILTER_VALUES,
      person: 'Ana',
      department: 'FISCAL',
    });

    expect(values).toMatchObject({ person: 'Ana', department: null });
  });
});

describe('filterCountQuery', () => {
  // feliz
  it('counts the options on the tickets of the module, cut by the other filters', () => {
    const query = filterCountQuery({ kind: 'ticketStatus' }, 'manutencao', {
      ...EMPTY_BOARD_FILTER_VALUES,
      ticketStatus: 'in_progress',
      department: 'FISCAL',
    });

    expect(query).toMatchObject({ source: 'maintenanceTickets', groupBy: 'status' });
    /* O próprio filtro fica de fora da conta; o de departamento, não. */
    expect(query?.matches).toEqual([{ field: 'department', value: 'FISCAL' }]);
  });

  // triste
  it('has no count for the period', () => {
    expect(filterCountQuery({ kind: 'period' }, 'infra', EMPTY_BOARD_FILTER_VALUES)).toBeNull();
  });
});

describe('saveErrorOf', () => {
  // feliz
  it('names the block the server refused', () => {
    const error = new ApiError(422, 'Confira o painel', [{ field: 'widgets.0', message: 'Escolha como agrupar' }]);

    expect(saveErrorOf(error, [WIDGET], DRAFT.layout)).toBe(
      'Não salvei o painel. "Chamados por situação": Escolha como agrupar.',
    );
  });

  // triste
  it('says the plain reason when the server points nowhere, and nothing without an error', () => {
    expect(saveErrorOf(new ApiError(500, 'Banco fora do ar'), [], [])).toBe('Não salvei o painel: Banco fora do ar');
    expect(saveErrorOf(null, [], [])).toBeNull();
  });
});

describe('setBoardFilterPlaces', () => {
  const draft = {
    widgets: [],
    layout: [],
    filters: [{ id: 'person', kind: 'person' as const, label: 'Pessoa' }],
  };

  // feliz
  it('moves a filter to the place the grid gave back, keeping its name', () => {
    const next = setBoardFilterPlaces(draft, [{ id: 'person', place: { x: 1, y: 0, w: 2, h: 1 } }]);

    expect(next.filters[0]).toEqual({ id: 'person', kind: 'person', label: 'Pessoa', place: { x: 1, y: 0, w: 2, h: 1 } });
  });

  // triste
  it('ignores a place for a filter the board does not have', () => {
    expect(setBoardFilterPlaces(draft, [{ id: 'ghost', place: { x: 0, y: 0, w: 1, h: 1 } }]).filters).toEqual(draft.filters);
  });
});
