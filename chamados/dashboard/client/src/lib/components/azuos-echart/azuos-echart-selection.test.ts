import { render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as EchartsUtil from '$lib/utils/echarts.util';

import ColumnChart from '$lib/components/azuos-column-chart/azuos-column-chart.svelte';
import DonutChart from '$lib/components/azuos-donut-chart/azuos-donut-chart.svelte';
import HeatmapChart from '$lib/components/azuos-heatmap-chart/azuos-heatmap-chart.svelte';
import TreemapChart, { OTHERS_ID } from '$lib/components/azuos-treemap-chart/azuos-treemap-chart.svelte';

/**
 * O clique que o ECharts dispara — cada gráfico traduz a seleção do seu jeito. Um ECharts de
 * mentira guarda o tratador do clique para o teste o chamar com o que o gráfico real mandaria.
 */
const fakeChart = vi.hoisted(() => {
  const handlers: Record<string, (params: unknown) => void> = {};

  return {
    handlers,
    on: vi.fn((event: string, handler: (params: unknown) => void) => {
      handlers[event] = handler;
    }),
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  };
});

vi.mock('$lib/utils/echarts.util', async (importOriginal) => ({
  ...(await importOriginal<typeof EchartsUtil>()),
  loadECharts: () => Promise.resolve({ init: () => fakeChart }),
}));

async function clickOnChart(params: unknown): Promise<void> {
  await waitFor(() => expect(fakeChart.handlers.click).toBeTypeOf('function'));
  fakeChart.handlers.click?.(params);
}

beforeEach(() => {
  delete fakeChart.handlers.click;
  if (typeof ResizeObserver === 'undefined') {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
  }
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('chart selections', () => {
  // feliz
  it('hands the clicked row and column of the heatmap to whoever listens', async () => {
    const onSelect = vi.fn();
    render(HeatmapChart, {
      props: {
        data: { rows: ['Ana'], columns: ['Aberto'], cells: [{ row: 'Ana', column: 'Aberto', value: 9 }], seriesLabel: 'Chamados' },
        actions: { onSelect },
      },
    });

    await clickOnChart({ data: { row: 'Ana', column: 'Aberto', value: 9 } });

    expect(onSelect).toHaveBeenCalledWith({ row: 'Ana', column: 'Aberto' });
  });

  it('names the clicked block of the treemap and the clicked column', async () => {
    const onSelect = vi.fn();
    render(TreemapChart, {
      props: { data: { slices: [{ label: 'Financeiro', value: 54 }], seriesLabel: 'Chamados' }, actions: { onSelect } },
    });
    await clickOnChart({ name: 'Financeiro' });
    expect(onSelect).toHaveBeenCalledWith('Financeiro');

    const onColumn = vi.fn();
    render(ColumnChart, {
      props: { data: { slices: [{ label: 'Ana', value: 12 }], seriesLabel: 'Chamados' }, actions: { onSelect: onColumn } },
    });
    delete fakeChart.handlers.click;
    await clickOnChart({ name: 'Ana' });
    expect(onColumn).toHaveBeenCalledWith('Ana');
  });

  it('names the clicked slice of the donut', async () => {
    const onSelect = vi.fn();
    render(DonutChart, {
      props: { data: { slices: [{ label: 'Em andamento', value: 10 }], seriesLabel: 'Status' }, actions: { onSelect } },
    });

    await clickOnChart({ name: 'Em andamento' });

    expect(onSelect).toHaveBeenCalledWith('Em andamento');
  });

  // triste
  it('ignores a heatmap click outside a cell and a click on the "others" block', async () => {
    const onHeatmap = vi.fn();
    render(HeatmapChart, {
      props: {
        data: { rows: ['Ana'], columns: ['Aberto'], cells: [{ row: 'Ana', column: 'Aberto', value: 9 }], seriesLabel: 'Chamados' },
        actions: { onSelect: onHeatmap },
      },
    });
    await clickOnChart({ name: 'Ana' });
    expect(onHeatmap).not.toHaveBeenCalled();

    const onTreemap = vi.fn();
    render(TreemapChart, {
      props: { data: { slices: [{ label: 'Financeiro', value: 54 }], seriesLabel: 'Chamados' }, actions: { onSelect: onTreemap } },
    });
    delete fakeChart.handlers.click;
    await clickOnChart({ data: { id: OTHERS_ID } });
    expect(onTreemap).not.toHaveBeenCalled();
  });
});
