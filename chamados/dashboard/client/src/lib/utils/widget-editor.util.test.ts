import { describe, expect, it } from 'vitest';

import { type Widget, widgetSchema } from '@template/shared/schemas/dashboard-board.schema';

import {
  ageBandsText,
  fitGroup,
  groupOptions,
  newWidget,
  parseAgeBands,
  usesAgeBands,
} from './widget-editor.util';

const COLUMN: Widget = {
  id: 'w1',
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

describe('the cumulative block in the editor', () => {
  // feliz
  it('offers the day, week and month groupings, as the contract asks', () => {
    const values = groupOptions({ ...COLUMN, kind: 'cumulative' }).map((option) => option.value);

    expect(values).toEqual([
      'createdDay',
      'createdWeek',
      'createdMonth',
      'resolvedDay',
      'resolvedWeek',
      'resolvedMonth',
    ]);
  });

  // feliz
  it('turns a category block into a cumulative one the contract accepts', () => {
    const fitted = fitGroup({ ...COLUMN, kind: 'cumulative' });

    expect(fitted.groupBy).toBe('createdDay');
    expect(widgetSchema.safeParse(fitted).success).toBe(true);
  });

  // triste
  it('offers nothing in time for a source without dates', () => {
    expect(
      groupOptions({ ...COLUMN, kind: 'cumulative', source: 'softwareProjects', groupBy: 'status' }).map(
        (option) => option.value,
      ),
    ).toEqual(['createdMonth']);
    expect(groupOptions({ ...COLUMN, kind: 'calendar', source: 'quotes', groupBy: 'status' })).toEqual([]);
  });
});

describe('weeks and age bands in the editor', () => {
  // feliz
  it('offers the weeks in time and the age bands among the categories', () => {
    const inTime = groupOptions({ ...COLUMN, kind: 'area' }).map((option) => option.value);
    const asCategory = groupOptions(COLUMN).map((option) => option.value);

    expect(inTime).toEqual(expect.arrayContaining(['createdWeek', 'resolvedWeek', 'resolvedMonth']));
    expect(inTime).not.toContain('openAge');
    expect(asCategory).toEqual(expect.arrayContaining(['openAge', 'priority']));
    expect(asCategory).not.toContain('createdWeek');
  });

  // feliz
  it('asks for bands only when the block groups or splits by an age band', () => {
    expect(usesAgeBands({ ...COLUMN, groupBy: 'openAge' })).toBe(true);
    expect(usesAgeBands({ ...COLUMN, splitBy: 'openAge' })).toBe(true);
    expect(usesAgeBands(COLUMN)).toBe(false);
    expect(parseAgeBands('2, 7; 15 30')).toEqual([2, 7, 15, 30]);
    expect(ageBandsText([2, 7])).toBe('2, 7');
  });

  // triste
  it('lets the contract refuse bands typed out of order', () => {
    const widget = { ...COLUMN, groupBy: 'openAge', ageBands: parseAgeBands('15, 7') };

    expect(widgetSchema.safeParse(widget).success).toBe(false);
  });
});

describe('newWidget', () => {
  // feliz
  it('starts a block on the first source of the module, with a suggested title', () => {
    const widget = newWidget('manutencao', 'donut', 'w9');

    expect(widget).toMatchObject({ id: 'w9', kind: 'donut', source: 'maintenanceTickets', groupBy: 'status' });
    expect(widget.title).toBe('Chamados por situação');
    expect(widgetSchema.safeParse(widget).success).toBe(true);
  });

  // triste
  it('keeps the agenda inside the module, on a source that has days', () => {
    const widget = fitGroup({ ...newWidget('manutencao', 'column', 'w1'), source: 'inventoryItems', kind: 'agenda' });

    expect(widget.source).not.toBe('quotes');
    expect(widget.groupBy).toBe('createdDay');
    expect(widget.window).not.toBeNull();
  });
});
