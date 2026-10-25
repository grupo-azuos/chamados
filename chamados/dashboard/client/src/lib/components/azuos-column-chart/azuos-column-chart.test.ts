import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import ColumnChart, { columnOption, shorten } from './azuos-column-chart.svelte';

const slices = [
  { label: 'Ana', value: 12 },
  { label: 'Bia', value: 9 },
];

describe('shorten', () => {
  // feliz
  it('leaves a short label alone', () => {
    expect(shorten('Ana')).toBe('Ana');
  });

  /* Cortar no lugar errado é como "CONTABIL-01" e "CONTABIL-02" viram duas barras com o
     mesmo nome na tela. */
  it('cuts a long label and marks that it was cut', () => {
    expect(shorten('Departamento Financeiro')).toBe('Departamento…');
    expect(shorten('Departamento Financeiro')).toHaveLength(13);
  });

  // triste
  it('has nothing to cut in an empty label', () => {
    expect(shorten('')).toBe('');
  });
});

const THEME = { foreground: '#111111', muted: '#666666' };

describe('columnOption', () => {
  // feliz
  it('names the series with what the screen called it', () => {
    const option = columnOption({ slices, seriesLabel: 'Chamados' }, undefined, THEME);

    expect((option.series as { name: string }[])[0]?.name).toBe('Chamados');
  });

  /* Deitado, o maior fica EM CIMA: é a ordem em que se lê um ranking. */
  it('puts the categories on the side when lying down, first on top', () => {
    const option = columnOption(
      { slices, seriesLabel: 'Chamados' },
      { orientation: 'horizontal' },
      THEME,
    );

    expect(option.yAxis).toMatchObject({ type: 'category', inverse: true, data: ['Ana', 'Bia'] });
  });

  /* Série no tempo: uma cor só, porque cada barra é a mesma medida. */
  it('paints every bar with one colour when asked', () => {
    const option = columnOption({ slices, seriesLabel: 'Chamados' }, { color: '#123456' }, THEME);
    const bars = (option.series as { data: { itemStyle: { color: string } }[] }[])[0]!.data;

    expect(new Set(bars.map((bar) => bar.itemStyle.color))).toEqual(new Set(['#123456']));
  });
});

describe('AzuosColumnChart', () => {
  // feliz
  /* O desenho é SVG, e SVG não se tabula nem se lê: quem usa leitor de tela ou só o teclado
     chega aos números por esta lista. */
  it('announces every slice with its own value', () => {
    render(ColumnChart, { props: { data: { slices, seriesLabel: 'Chamados' } } });

    expect(screen.getByRole('img', { name: 'Chamados' })).toBeInTheDocument();
    expect(screen.getByLabelText('Ana: 12')).toBeInTheDocument();
    expect(screen.getByLabelText('Bia: 9')).toBeInTheDocument();
  });

  /* O gráfico é o caminho para a lista filtrada, não um enfeite. */
  it('turns each slice into a button and reports which one was chosen', async () => {
    const onSelect = vi.fn();
    render(ColumnChart, {
      props: { data: { slices, seriesLabel: 'Chamados' }, actions: { onSelect } },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Ana: 12' }));

    expect(onSelect).toHaveBeenCalledWith('Ana');
  });

  it('draws lying down when asked, and still announces the same slices', () => {
    render(ColumnChart, {
      props: { data: { slices, seriesLabel: 'Chamados' }, ui: { orientation: 'horizontal' } },
    });

    expect(screen.getByLabelText('Ana: 12')).toBeInTheDocument();
  });

  // triste
  /* Um `<button>` que não leva a lugar nenhum aparece na tabulação como se levasse. */
  it('is not clickable when there is nowhere to go', () => {
    render(ColumnChart, { props: { data: { slices, seriesLabel: 'Chamados' } } });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Ana: 12')).toBeInTheDocument();
  });

  /* Nada a mostrar não é um gráfico vazio: é uma frase dizendo isso. */
  it('says there is nothing instead of drawing an empty chart (edge case)', () => {
    render(ColumnChart, {
      props: {
        data: { slices: [], seriesLabel: 'Chamados' },
        ui: { emptyLabel: 'Nenhum chamado ainda' },
      },
    });

    expect(screen.getByText('Nenhum chamado ainda')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  /* Durante o carregamento não se diz "sem dados": faria a pessoa achar que sumiram. */
  it('shows neither the chart nor the empty message while loading (edge case)', () => {
    render(ColumnChart, {
      props: { data: { slices: [], seriesLabel: 'Chamados' }, state: { isLoading: true } },
    });

    expect(screen.queryByText('Sem dados para mostrar')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
