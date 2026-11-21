import { describe, expect, it } from 'vitest';

import { cellItemOf, itemOfLabel, sankeyItemOf, statItemOf } from './widget-items.util';

const SERIES = [
  { key: 'open', label: 'Em aberto', value: 7 },
  { key: 'done', label: 'Resolvido', value: 4 },
];
const CELLS = [{ row: 'high', rowLabel: 'Alta', column: 'open', columnLabel: 'Em aberto', value: 3 }];

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
