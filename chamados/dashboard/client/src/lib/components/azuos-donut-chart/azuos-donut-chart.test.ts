import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import { withChartTheme } from '$lib/utils/echarts.util';

import DonutChart, { donutOption, percentOf } from './azuos-donut-chart.svelte';

const slices = [
  { label: 'Em andamento', value: 10 },
  { label: 'Concluído', value: 6 },
];

describe('percentOf', () => {
  // feliz
  it('answers the whole percentage of the slice', () => {
    expect(percentOf(10, 40)).toBe(25);
  });

  // triste
  /* Total zero é a rosca recém-aberta, não uma divisão por zero na tela. */
  it('answers zero when there is no total (edge case)', () => {
    expect(percentOf(0, 0)).toBe(0);
  });
});

describe('donutOption', () => {
  // feliz
  it('names every slice for the tooltip, in a clean ring', () => {
    const series = (
      donutOption(slices, 'Status', { surface: '#ffffff' }).series as {
        data: { name: string }[];
        label: { show: boolean };
      }[]
    )[0]!;

    expect(series.data.map((slice) => slice.name)).toEqual(['Em andamento', 'Concluído']);
    expect(series.label.show).toBe(false);
  });
});

describe('donutOption — cor no hover', () => {
  // regressão: com uma fatia só (Insights → "De que os upgrades são feitos"), o anel sumia ao passar
  // o mouse, porque a cor chegava ao ECharts como `var(--chart-5)` e o tom do hover virava `none`
  it('reaches ECharts with real colours, never a CSS variable', () => {
    const option = donutOption([{ label: 'Mais memória', value: 3 }], 'Máquinas', { surface: '#ffffff' });
    const drawn = withChartTheme(option, { ...THEME_FOR_HOVER });

    expect(JSON.stringify(drawn)).not.toContain('var(');
  });
});

const THEME_FOR_HOVER = {
  foreground: '#111111',
  muted: '#666666',
  border: '#dddddd',
  surface: '#ffffff',
  track: '#f3f4f6',
  font: 'Inter',
  success: '#047857',
  info: '#1d4ed8',
  warning: '#b45309',
  danger: '#dc2626',
};

describe('AzuosDonutChart', () => {
  // feliz
  /* A legenda escreve o nome: cor sozinha não diz o que é a fatia. */
  it('names every slice in the legend, with value and percentage', () => {
    render(DonutChart, { props: { data: { slices, seriesLabel: 'Status' } } });

    expect(screen.getByRole('img', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
    expect(screen.getByText('63%')).toBeInTheDocument();
  });

  /* O total no meio do anel poupa a soma de cabeça. */
  it('sums the slices in the middle of the ring', () => {
    render(DonutChart, { props: { data: { slices, seriesLabel: 'Status' } } });

    expect(screen.getByText('16')).toBeInTheDocument();
  });

  /* A fatia é o caminho para "quais são esses 10", não um enfeite. */
  it('turns the legend into a button and reports which slice was chosen', async () => {
    const onSelect = vi.fn();
    render(DonutChart, {
      props: { data: { slices, seriesLabel: 'Status' }, actions: { onSelect } },
    });

    await fireEvent.click(screen.getByRole('button', { name: /Em andamento/ }));

    expect(onSelect).toHaveBeenCalledWith('Em andamento');
  });

  // triste
  it('does not turn the legend into a button when there is nowhere to go', () => {
    render(DonutChart, { props: { data: { slices, seriesLabel: 'Status' } } });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
  });

  it('says there is nothing instead of drawing an empty ring (edge case)', () => {
    render(DonutChart, {
      props: {
        data: { slices: [], seriesLabel: 'Status' },
        ui: { emptyLabel: 'Nenhum cliente neste filtro' },
      },
    });

    expect(screen.getByText('Nenhum cliente neste filtro')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows neither the ring nor the empty message while loading (edge case)', () => {
    render(DonutChart, {
      props: { data: { slices: [], seriesLabel: 'Status' }, state: { isLoading: true } },
    });

    expect(screen.queryByText('Sem dados para mostrar')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
