import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import { toTimeRows } from '$lib/utils/time-series';

import AreaChart, { areaOption } from './azuos-area-chart.svelte';

const series = [
  { key: 'opened', label: 'Abertos', color: 'var(--chart-1)' },
  { key: 'resolved', label: 'Resolvidos', color: 'var(--chart-4)' },
];

const points = [
  { at: '2026-09-22T00:00:00.000Z', values: { opened: 4, resolved: 2 } },
  { at: '2026-09-23T00:00:00.000Z', values: { opened: 1, resolved: 5 } },
];

const THEME = { border: '#dddddd', muted: '#666666' };

describe('areaOption', () => {
  // feliz
  it('carries the name of every series, in the order given', () => {
    const option = areaOption(toTimeRows(points, series), series, undefined, THEME);

    expect((option.series as { name: string }[]).map((item) => item.name)).toEqual([
      'Abertos',
      'Resolvidos',
    ]);
  });

  /* Porcentagem trava em 0–100 com folga: um pico de 100% não pode parecer cortado na borda. */
  it('locks the scale for a percentage, with room above 100', () => {
    const option = areaOption(toTimeRows(points, series), series, { isPercent: true }, THEME);

    expect(option.yAxis).toMatchObject({ min: 0, max: 105 });
  });

  // triste
  it('has nothing to draw without series (edge case)', () => {
    expect(areaOption([], [], undefined, THEME).series).toEqual([]);
  });
});

describe('AzuosAreaChart', () => {
  // feliz
  /* Cor sozinha não é informação para quem não distingue cor. */
  it('names every series in writing', () => {
    render(AreaChart, { props: { data: { points, series } } });

    expect(screen.getByText('Abertos')).toBeInTheDocument();
    expect(screen.getByText('Resolvidos')).toBeInTheDocument();
  });

  // triste
  it('says there is no reading instead of drawing an empty chart', () => {
    render(AreaChart, { props: { data: { points: [], series } } });

    expect(screen.getByText('Sem leituras no período.')).toBeInTheDocument();
  });

  /* Toda leitura com data quebrada é descartada; sobrando nenhuma, o gráfico não desenha um
     quadro vazio — ele diz que não há leitura. */
  it('falls back to the empty message when no reading has a valid instant (edge case)', () => {
    render(AreaChart, {
      props: { data: { points: [{ at: 'ontem', values: { opened: 3 } }], series } },
    });

    expect(screen.getByText('Sem leituras no período.')).toBeInTheDocument();
  });

  /* Durante o carregamento não se diz "sem leituras": faria a pessoa achar que sumiram. */
  it('says nothing about emptiness while loading (edge case)', () => {
    render(AreaChart, { props: { data: { points: [], series }, state: { isLoading: true } } });

    expect(screen.queryByText('Sem leituras no período.')).not.toBeInTheDocument();
  });
});
