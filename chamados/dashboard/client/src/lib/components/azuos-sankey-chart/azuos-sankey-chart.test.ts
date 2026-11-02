import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import SankeyChart, { flowTotalOf, sankeyOption } from './azuos-sankey-chart.svelte';

const DATA = {
  nodes: [
    { id: 'type:Rede', label: 'Rede', color: '#3b82f6' },
    { id: 'owner:N/A', label: 'N/A', color: '#10b981' },
    { id: 'stage:Aberto', label: 'Aberto', color: '#f59e0b' },
  ],
  links: [
    { from: 'type:Rede', to: 'owner:N/A', value: 5 },
    { from: 'owner:N/A', to: 'stage:Aberto', value: 5 },
  ],
  seriesLabel: 'Chamados',
};

describe('AzuosSankeyChart', () => {
  // feliz
  /* O total é o que ENTRA no fluxo: somar todas as faixas contaria o mesmo chamado por coluna. */
  it('counts what enters the flow, not every band', () => {
    expect(flowTotalOf(DATA.links)).toBe(5);
  });

  it('keys the nodes by id and writes the label', () => {
    const series = (
      sankeyOption(DATA, { foreground: '#111' }).series as {
        data: { name: string }[];
        label: { formatter: (params: unknown) => string };
      }[]
    )[0]!;

    expect(series.data.map((node) => node.name)).toEqual([
      'type:Rede',
      'owner:N/A',
      'stage:Aberto',
    ]);
    expect(series.label.formatter({ name: 'owner:N/A' })).toBe('N/A');
  });

  it('describes the flow in writing', () => {
    render(SankeyChart, { props: { data: DATA } });

    expect(screen.getByRole('img', { name: /fluxo de 5 entre 3 etapas/ })).toBeInTheDocument();
  });

  // triste
  it('says there is no flow instead of drawing an empty box', () => {
    render(SankeyChart, {
      props: { data: { ...DATA, links: [] }, ui: { emptyLabel: 'Sem fluxo' } },
    });

    expect(screen.getByText('Sem fluxo')).toBeInTheDocument();
  });
});

describe('sankeyOption — what the balloon and the labels say', () => {
  const option = sankeyOption(DATA, { foreground: '#111' }) as {
    tooltip: { formatter: (params: unknown) => string };
    series: { label: { formatter: (params: unknown) => string } }[];
  };

  // feliz
  it('names both ends of a band and the count of a node', () => {
    expect(option.tooltip.formatter({ dataType: 'edge', value: 5, data: { source: 'type:Rede', target: 'owner:N/A' } })).toContain('Rede → N/A');
    expect(option.tooltip.formatter({ dataType: 'node', name: 'stage:Aberto', value: 5, data: {} })).toContain('<b>Aberto</b>');
    expect(option.series[0]!.label.formatter({ name: 'type:Rede' })).toBe('Rede');
  });

  // triste
  it('does not break on a band or node it does not know', () => {
    expect(option.tooltip.formatter({ dataType: 'edge', value: 1, data: {} })).toContain(' → ');
    expect(option.tooltip.formatter({ dataType: 'node', name: 'x', value: 1, data: {} })).toContain('<b>x</b>');
    expect(option.series[0]!.label.formatter({ name: 'nope' })).toBe('');
  });

  // feliz
  it('marks the chart as clickable when a node opens detail', () => {
    render(SankeyChart, { props: { data: DATA, actions: { onSelect: vi.fn() } } });
    expect(document.querySelector('.cursor-pointer')).not.toBeNull();
  });
});
