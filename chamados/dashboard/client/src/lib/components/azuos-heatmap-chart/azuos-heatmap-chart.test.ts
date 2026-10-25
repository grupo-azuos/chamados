import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import HeatmapChart, { cellsOf, HEADER_HEIGHT, ROW_HEIGHT } from './azuos-heatmap-chart.svelte';

const DATA = {
  rows: ['Ana', 'Bia'],
  columns: ['Aberto', 'Fechado'],
  cells: [
    { row: 'Ana', column: 'Aberto', value: 9 },
    { row: 'Bia', column: 'Fechado', value: 4 },
  ],
  seriesLabel: 'Chamados',
};

describe('cellsOf', () => {
  // feliz
  it('fills every row and column, with zero where no cell came', () => {
    expect(cellsOf(DATA)).toEqual([
      { row: 'Ana', column: 'Aberto', value: 9 },
      { row: 'Ana', column: 'Fechado', value: 0 },
      { row: 'Bia', column: 'Aberto', value: 0 },
      { row: 'Bia', column: 'Fechado', value: 4 },
    ]);
  });
});

describe('AzuosHeatmapChart', () => {
  // feliz
  /* Uma linha por pessoa: a equipe inteira cabe, rolando, em vez de achatar cada linha. */
  it('grows the drawing with the rows and scrolls inside the box', () => {
    render(HeatmapChart, { props: { data: DATA, ui: { heightClass: 'h-40' } } });

    expect(screen.getByRole('img')).toHaveStyle({ height: `${2 * ROW_HEIGHT + HEADER_HEIGHT}px` });
  });

  // triste
  it('says there is no data instead of drawing an empty grid', () => {
    render(HeatmapChart, {
      props: { data: { ...DATA, cells: [] }, ui: { emptyLabel: 'Sem dados' } },
    });

    expect(screen.getByText('Sem dados')).toBeInTheDocument();
  });
});
