import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import StackedBarChart, { totalOf } from './azuos-stacked-bar-chart.svelte';

const SERIES = [
  { key: 'done', label: 'Resolvido', color: '#047857' },
  { key: 'open', label: 'Aberto', color: '#b45309' },
];
const CATEGORIES = [
  { label: 'Rede', values: { done: 6, open: 3 } },
  { label: 'Impressora', values: { done: 2, open: 4 } },
];

describe('AzuosStackedBarChart', () => {
  // feliz
  it('sums each row for the number at its end', () => {
    expect(totalOf(CATEGORIES[0]!)).toBe(9);
  });

  /* As partes vêm com o nome ESCRITO na legenda, não só pela cor. */
  it('names every part in the legend', () => {
    render(StackedBarChart, {
      props: { data: { categories: CATEGORIES, series: SERIES, seriesLabel: 'Tipos' } },
    });

    expect(screen.getByText('Resolvido')).toBeInTheDocument();
    expect(screen.getByText('Aberto')).toBeInTheDocument();
  });

  // triste
  it('says there is no data instead of drawing empty rows', () => {
    render(StackedBarChart, {
      props: {
        data: { categories: [], series: SERIES, seriesLabel: 'Tipos' },
        ui: { emptyLabel: 'Nenhum tipo' },
      },
    });

    expect(screen.getByText('Nenhum tipo')).toBeInTheDocument();
  });
});
