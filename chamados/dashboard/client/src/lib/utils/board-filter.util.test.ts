import { EMPTY_BOARD_FILTER_VALUES, ME_VALUE } from '@template/shared/schemas/dashboard-board.schema';
import { describe, expect, it } from 'vitest';

import {
  activeSummary,
  clampRange,
  fieldFilterOptions,
  personOptions,
  presetOf,
  readingOrder,
  windowOfPreset,
} from './board-filter.util';

const COUNTS = { total: 3, series: [{ key: 'TI', label: 'TI', value: 2 }, { key: '(Sem departamento)', label: '(Sem departamento)', value: 1 }] };

describe('board filter rules', () => {
  // feliz
  it('turns a ready period into the window and back', () => {
    const window = windowOfPreset('last-30-day', '2026-11-21');

    expect(window).toEqual({ mode: 'relative', direction: 'last', count: 30, unit: 'day' });
    expect(presetOf(window)).toBe('last-30-day');
    expect(presetOf(null)).toBe('each');
    expect(windowOfPreset('custom', '2026-11-21')).toMatchObject({ mode: 'custom', to: '2026-11-21' });
  });

  // triste
  it('pulls an exact date range back to 90 days, and puts it in order', () => {
    expect(clampRange('2026-01-01', '2026-12-31')).toEqual({ from: '2026-01-01', to: '2026-03-31' });
    expect(clampRange('2026-02-10', '2026-02-01')).toEqual({ from: '2026-02-01', to: '2026-02-10' });
  });

  // feliz
  it('offers the counted options without the "no value" group, people with their face', () => {
    expect(fieldFilterOptions('department', COUNTS)).toEqual([{ value: 'TI', label: 'TI' }]);
    expect(fieldFilterOptions('ticketStatus', null).length).toBeGreaterThan(0);
    expect(personOptions(COUNTS)[0]).toMatchObject({ personName: 'TI' });
  });

  // feliz
  it('summarises what is filtering, as the person read it on screen', () => {
    const filters = [
      { id: 'person', kind: 'person' as const, label: 'Pessoa' },
      { id: 'department', kind: 'department' as const, label: 'Departamento' },
    ];
    const values = { ...EMPTY_BOARD_FILTER_VALUES, person: ME_VALUE, department: 'TI' };

    expect(activeSummary(filters, values, { department: COUNTS })).toEqual([
      { label: 'Pessoa', value: 'Eu' },
      { label: 'Departamento', value: 'TI' },
    ]);
    // triste
    expect(activeSummary(filters, EMPTY_BOARD_FILTER_VALUES, {})).toEqual([]);
  });

  // feliz
  it('reads the grid from top to bottom and left to right', () => {
    const one = { id: 'a', place: { x: 2, y: 0, w: 1, h: 1 } };
    const two = { id: 'b', place: { x: 0, y: 1, w: 1, h: 1 } };
    const three = { id: 'c', place: { x: 0, y: 0, w: 1, h: 1 } };

    expect(readingOrder([one, two, three]).map((filter) => filter.id)).toEqual(['c', 'a', 'b']);
  });
});
