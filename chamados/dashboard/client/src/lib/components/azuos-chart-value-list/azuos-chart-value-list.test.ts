import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import ChartValueList from './azuos-chart-value-list.svelte';

describe('AzuosChartValueList', () => {
  // feliz
  it('writes every category with its value, for a screen reader', () => {
    render(ChartValueList, { props: { data: { slices: [{ label: 'Rede', value: 1240 }] } } });

    expect(screen.getByText('Rede: 1.240')).toBeInTheDocument();
  });

  // triste
  it('writes nothing when there is nothing to read', () => {
    const { container } = render(ChartValueList, { props: { data: { slices: [] } } });

    expect(container.querySelector('ul')).not.toBeInTheDocument();
  });
});
