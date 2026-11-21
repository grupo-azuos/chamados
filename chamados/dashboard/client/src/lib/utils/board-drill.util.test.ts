import { drillFromParam } from '@template/shared/schemas/board-drill.schema';
import { EMPTY_BOARD_FILTER_VALUES, type Widget } from '@template/shared/schemas/dashboard-board.schema';
import { describe, expect, it } from 'vitest';

import { drillHref, drillOf, hasDrillTarget } from './board-drill.util';

const WIDGET = {
  id: 'w1',
  kind: 'bar',
  title: 'Chamados por situação',
  source: 'systemTickets',
  groupBy: 'status',
  splitBy: null,
  filterId: null,
  onlyMine: false,
  period: '30d',
  window: null,
} as unknown as Widget;

describe('drillOf', () => {
  // feliz
  it('carries the block question, the board filters and the clicked item', () => {
    const drill = drillOf(WIDGET, { ...EMPTY_BOARD_FILTER_VALUES, ticketPriority: 'alta' }, { key: 'aberto', label: 'Aberto' });

    expect(drill).toMatchObject({
      source: 'systemTickets',
      groupBy: 'status',
      period: '30d',
      key: 'aberto',
      label: 'Aberto',
      key2: null,
      title: 'Chamados por situação',
      matches: [{ field: 'priority', value: 'alta' }],
    });
  });
});

describe('drillHref', () => {
  // feliz
  it('opens the source list with the cut in the address', () => {
    const drill = drillOf(WIDGET, EMPTY_BOARD_FILTER_VALUES, { key: 'aberto' });
    const href = drillHref(drill) ?? '';
    const url = new URL(href, 'http://localhost');

    expect(url.pathname).toBe('/system/tickets');
    expect(drillFromParam(url.searchParams.get('drill'))).toMatchObject({ key: 'aberto' });
  });

  // triste
  it('has nowhere to go for a source without a list', () => {
    const drill = drillOf({ ...WIDGET, source: 'softwareActivity', groupBy: null } as Widget, EMPTY_BOARD_FILTER_VALUES, { key: null });

    expect(hasDrillTarget('softwareActivity')).toBe(false);
    expect(drillHref(drill)).toBeNull();
  });
});
