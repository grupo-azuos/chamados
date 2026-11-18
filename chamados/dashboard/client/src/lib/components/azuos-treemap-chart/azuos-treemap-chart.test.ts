import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import TreemapChart, { OTHERS_ID, treemapOption, withOthers } from './azuos-treemap-chart.svelte';

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

describe('treemapOption', () => {
  // feliz
  it('writes the name with the count in the block and the share in the balloon, greying "Outros"', () => {
    const option = treemapOption(withOthers(SLICES, 2), 'Chamados', { surface: '#fff', muted: '#888' }) as {
      tooltip: { formatter: (params: unknown) => string };
      series: { label: { formatter: (params: unknown) => string }; data: { itemStyle: { color: string } }[] }[];
    };

    expect(option.tooltip.formatter({ name: 'Contábil', value: 335 })).toBe('<b>Contábil</b><br/>Chamados: 335 (85%)');
    expect(option.series[0]!.label.formatter({ name: 'RH', value: 1234 })).toBe('RH\n1.234');
    expect(option.series[0]!.data.at(-1)!.itemStyle.color).toBe('#888');
    expect(option.series[0]!.data[0]!.itemStyle.color).not.toBe('#888');
  });

  // feliz
  it('marks the chart clickable when a block opens detail', () => {
    render(TreemapChart, { props: { data: { slices: SLICES, seriesLabel: 'Chamados' }, ui: { maxItems: 2 }, actions: { onSelect: vi.fn() } } });
    expect(document.querySelector('.cursor-pointer')).not.toBeNull();
  });
});
