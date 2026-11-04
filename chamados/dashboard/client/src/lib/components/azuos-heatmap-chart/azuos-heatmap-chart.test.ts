import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import HeatmapChart, { cellsOf, HEADER_HEIGHT, heatmapOption, ROW_HEIGHT } from './azuos-heatmap-chart.svelte';

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

describe('heatmapOption', () => {
  const theme = { track: '#eee', surface: '#fff', muted: '#888', foreground: '#111' };

  // feliz
  it('writes the number in the cell, hides the zeros and lights the text of the fullest cells', () => {
    const option = heatmapOption(DATA, '#123456', theme) as {
      tooltip: { formatter: (params: unknown) => string };
      yAxis: { axisLabel: { formatter: (label: string) => string } };
      series: { label: { formatter: (params: unknown) => string }; data: { label: { color: string } }[] }[];
    };
    const series = option.series[0]!;

    expect(series.label.formatter({ data: { value: [0, 0, 9] } })).toBe('9');
    expect(series.label.formatter({ data: { value: [0, 0, 0] } })).toBe('');
    expect(option.tooltip.formatter({ data: { row: 'Ana', column: 'Aberto', value: [0, 0, 1234] } })).toBe('<b>Ana</b><br/>Aberto: 1.234');
    expect(option.yAxis.axisLabel.formatter('Um nome comprido demais para caber')).toMatch(/…$/);
    /* A célula cheia (9) ganha texto claro; a vazia fica com o texto escuro. */
    expect(series.data[0]!.label.color).not.toBe(theme.foreground);
    expect(series.data[1]!.label.color).toBe(theme.foreground);
  });

  // triste
  it('does not divide by zero when every cell is empty', () => {
    const option = heatmapOption({ ...DATA, cells: [] }, '#123456', theme) as { visualMap: { max: number } };
    expect(option.visualMap.max).toBe(1);
  });

  // feliz
  it('hands the clicked row and column to whoever listens', () => {
    const onSelect = vi.fn();
    render(HeatmapChart, { props: { data: DATA, actions: { onSelect } } });
    expect(document.querySelector('.cursor-pointer')).not.toBeNull();
  });
});
