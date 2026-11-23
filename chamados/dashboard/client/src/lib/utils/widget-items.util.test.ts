import { describe, expect, it } from 'vitest';

import { cellItemOf, itemOfLabel, sankeyItemOf, statItemOf, timeItemOf } from './widget-items.util';

const SERIES = [
  { key: 'open', label: 'Em aberto', value: 7 },
  { key: 'done', label: 'Resolvido', value: 4 },
];
const CELLS = [
  { row: 'high', rowLabel: 'Alta', column: 'open', columnLabel: 'Em aberto', value: 3 },
];

describe('widget items', () => {
  // feliz
  it('turns a clicked label back into the key the server grouped by', () => {
    expect(itemOfLabel(SERIES, 'Resolvido')).toEqual({ key: 'done', label: 'Resolvido' });
    expect(cellItemOf(CELLS, 'Alta', 'Em aberto')).toEqual({
      key: 'high',
      label: 'Alta',
      key2: 'open',
      label2: 'Em aberto',
    });
    expect(sankeyItemOf(CELLS, 'b:open')).toEqual({ key: null, key2: 'open', label2: 'Em aberto' });
    expect(statItemOf(false, SERIES, 'Chamados')).toEqual({ key: null });
  });

  // triste
  it('keeps an unknown label as its own key, and ignores a node that is not of the flow', () => {
    expect(itemOfLabel(SERIES, 'Outro')).toEqual({ key: 'Outro', label: 'Outro' });
    expect(cellItemOf([], 'Alta')).toEqual({ key: 'Alta', label: 'Alta' });
    expect(sankeyItemOf(CELLS, 'x:1')).toBeNull();
  });
});

describe('timeItemOf', () => {
  const TIME = [
    { key: '2026-11-20', label: '20/11', value: 3 },
    { key: '2026-10', label: 'out/2026', value: 9 },
  ];

  // feliz
  it('finds the day or the month that was drawn at the clicked point', () => {
    expect(timeItemOf(TIME, '2026-11-20T12:00:00.000Z')).toEqual({
      key: '2026-11-20',
      label: '20/11',
    });
    expect(timeItemOf(TIME, '2026-10-01T12:00:00.000Z')).toEqual({
      key: '2026-10',
      label: 'out/2026',
    });
  });

  // triste
  it('finds nothing for a point outside the series', () => {
    expect(timeItemOf(TIME, '2025-01-01T12:00:00.000Z')).toBeNull();
  });
});
