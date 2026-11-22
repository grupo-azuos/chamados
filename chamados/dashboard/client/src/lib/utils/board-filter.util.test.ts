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
  moveInList,
  placesInOrder,
  toolbarDisplayOf,
  toolbarDisplaysOf,
  withDepartmentCatalog,
  withPersonPhotos,
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

describe('the Grafana-like filter toolbar', () => {
  // feliz
  it('keeps a compact display and offers only compact ones', () => {
    expect(toolbarDisplayOf({ kind: 'ticketStatus', display: 'chips' })).toBe('chips');
    expect(toolbarDisplaysOf('ticketStatus')).toEqual(['select', 'search', 'chips']);
    expect(toolbarDisplaysOf('person')).toEqual(['search', 'chips']);
  });

  // triste
  it('falls back to a compact display for boards saved with the big ones', () => {
    expect(toolbarDisplayOf({ kind: 'ticketStatus', display: 'cards' })).toBe('select');
    expect(toolbarDisplayOf({ kind: 'person', display: 'avatars' })).toBe('search');
  });

  // feliz
  it('saves the toolbar order as reading order on the grid', () => {
    expect(placesInOrder(['a', 'b', 'c', 'd', 'e'], 4)).toEqual([
      { id: 'a', place: { x: 0, y: 0, w: 1, h: 1 } },
      { id: 'b', place: { x: 1, y: 0, w: 1, h: 1 } },
      { id: 'c', place: { x: 2, y: 0, w: 1, h: 1 } },
      { id: 'd', place: { x: 3, y: 0, w: 1, h: 1 } },
      { id: 'e', place: { x: 0, y: 1, w: 1, h: 1 } },
    ]);
  });

  // feliz
  it('moves an item to a new position', () => {
    expect(moveInList(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  // triste
  it('keeps the list when the move goes out of bounds', () => {
    expect(moveInList(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
    expect(moveInList(['a', 'b'], -1, 0)).toEqual(['a', 'b']);
  });

  // feliz
  it('puts the photo of each person on the person filter counts, found by name', () => {
    const filters = [
      { id: 'pessoa', kind: 'person' as const },
      { id: 'dep', kind: 'department' as const },
    ];
    const people = { total: 1, series: [{ key: 'Ana Lima', label: 'Ana Lima', value: 1 }] };
    const counts = withPersonPhotos(filters, { pessoa: people, dep: COUNTS }, [{ name: 'Ana Lima', avatarUrl: 'https://x/ana.png' }]);

    expect(personOptions(counts.pessoa)[0]).toMatchObject({ personName: 'Ana Lima', avatarUrl: 'https://x/ana.png' });
    expect(counts.dep).toBe(COUNTS);
  });

  // triste
  it('keeps the initials when the person is not in the list or the count is missing', () => {
    const people = { total: 1, series: [{ key: 'Caio Reis', label: 'Caio Reis', value: 1 }] };
    const counts = withPersonPhotos([{ id: 'pessoa', kind: 'person' as const }, { id: 'outra', kind: 'person' as const }], { pessoa: people }, []);

    expect(personOptions(counts.pessoa)[0]?.avatarUrl).toBeNull();
    expect(counts.outra).toBeUndefined();
  });
});

describe('withDepartmentCatalog', () => {
  const FILTERS = [
    { id: 'dep', kind: 'department' as const },
    { id: 'who', kind: 'person' as const },
  ];
  const COUNTS = {
    dep: { total: 3, series: [{ key: 'Tecnologia', label: 'Tecnologia', value: 2 }, { key: 'Antigo', label: 'Antigo', value: 1 }] },
    who: { total: 3, series: [{ key: 'Ana', label: 'Ana', value: 3 }] },
  };

  // feliz
  it('lists every department of the catalog, the ones still at zero included, and keeps the old names at the end', () => {
    const next = withDepartmentCatalog(FILTERS, COUNTS, ['Contábil', 'Tecnologia']);

    expect(next.dep?.series.map((item) => [item.key, item.value])).toEqual([
      ['Contábil', 0],
      ['Tecnologia', 2],
      ['Antigo', 1],
    ]);
    expect(next.who).toBe(COUNTS.who);
  });

  // triste
  it('keeps what the count brought while the catalog has not arrived', () => {
    expect(withDepartmentCatalog(FILTERS, COUNTS, [])).toBe(COUNTS);
    expect(withDepartmentCatalog(FILTERS, { who: COUNTS.who }, ['Contábil'])).toEqual({ who: COUNTS.who });
  });
});

