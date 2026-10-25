import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import TreemapChart, { OTHERS_ID, withOthers } from './azuos-treemap-chart.svelte';

const SLICES = [
  { label: 'Financeiro', value: 54 },
  { label: 'Contábil', value: 335 },
  { label: 'RH', value: 3 },
  { label: 'TI', value: 1 },
];

describe('withOthers', () => {
  // feliz
  it('keeps the biggest ones, biggest first, and sums the rest into "Outros"', () => {
    expect(withOthers(SLICES, 2)).toEqual([
      { id: 'Contábil', label: 'Contábil', value: 335 },
      { id: 'Financeiro', label: 'Financeiro', value: 54 },
      { id: OTHERS_ID, label: 'Outros (2)', value: 4 },
    ]);
  });

  // triste
  it('draws no "Outros" block when everything fits', () => {
    expect(withOthers(SLICES, 10).some((slice) => slice.id === OTHERS_ID)).toBe(false);
  });
});

describe('AzuosTreemapChart', () => {
  // feliz
  it('gives every block to a screen reader', () => {
    render(TreemapChart, { props: { data: { slices: SLICES, seriesLabel: 'Chamados' } } });

    expect(screen.getByText('Contábil: 335')).toBeInTheDocument();
  });

  // triste
  it('says there is no data instead of drawing an empty box', () => {
    render(TreemapChart, {
      props: { data: { slices: [], seriesLabel: 'Chamados' }, ui: { emptyLabel: 'Nada' } },
    });

    expect(screen.getByText('Nada')).toBeInTheDocument();
  });
});
