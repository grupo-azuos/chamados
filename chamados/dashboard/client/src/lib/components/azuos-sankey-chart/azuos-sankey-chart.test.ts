import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

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
