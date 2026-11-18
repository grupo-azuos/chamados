import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import StackedBarChart, { stackedBarOption, totalOf } from './azuos-stacked-bar-chart.svelte';

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

describe('stackedBarOption', () => {
  // feliz
  it('rounds only the last series, writes the row total at its end and shortens long labels', () => {
    const option = stackedBarOption({ categories: CATEGORIES, series: SERIES, seriesLabel: 'Tipos' }, { foreground: '#111', muted: '#888' }) as {
      yAxis: { axisLabel: { formatter: (label: string) => string } };
      series: { itemStyle: { borderRadius: number | number[] }; label?: { formatter: (params: unknown) => string }; data: number[] }[];
    };

    expect(option.series[0]!.itemStyle.borderRadius).toBe(0);
    expect(option.series[1]!.itemStyle.borderRadius).toEqual([0, 6, 6, 0]);
    expect(option.series[0]!.label).toBeUndefined();
    expect(option.series[1]!.label!.formatter({ dataIndex: 0 })).toBe('9');
    expect(option.series[1]!.label!.formatter({ dataIndex: 9 })).toBe('0');
    expect(option.series[1]!.data).toEqual([3, 4]);
    expect(option.yAxis.axisLabel.formatter('Um rótulo comprido demais para a coluna')).toMatch(/…$/);
  });

  // triste
  it('reads zero for a series the row does not have, and marks the chart clickable', () => {
    const option = stackedBarOption({ categories: [{ label: 'Só aberto', values: { open: 2 } }], series: SERIES, seriesLabel: 'Tipos' }, { foreground: '#111', muted: '#888' }) as { series: { data: number[] }[] };
    expect(option.series[0]!.data).toEqual([0]);

    render(StackedBarChart, { props: { data: { categories: CATEGORIES, series: SERIES, seriesLabel: 'Tipos' }, actions: { onSelect: vi.fn() } } });
    expect(document.querySelector('.cursor-pointer')).not.toBeNull();
  });
});
