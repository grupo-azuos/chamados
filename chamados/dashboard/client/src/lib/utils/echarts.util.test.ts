import { describe, expect, it } from 'vitest';

import {
  formatCount,
  resolveColor,
  resolveCssColors,
  selectionOf,
  shareOf,
  shortenLabel,
  withChartTheme,
} from './echarts.util';

const THEME = {
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

describe('echarts.util', () => {
  // feliz
  it('keeps a plain colour as it is', () => {
    expect(resolveColor('#3b82f6')).toBe('#3b82f6');
  });

  /* Todo gráfico herda o balão com a cara do popover: quem chama só escreve o que é dele. */
  it('dresses the tooltip with the theme and keeps what the chart asked for', () => {
    const option = withChartTheme({ tooltip: { trigger: 'item' } }, THEME);
    const tooltip = option.tooltip as {
      trigger: string;
      backgroundColor: string;
      confine: boolean;
    };

    expect(tooltip).toMatchObject({ trigger: 'item', backgroundColor: '#ffffff', confine: true });
    expect(option.backgroundColor).toBe('transparent');
  });

  /* REGRESSÃO: dentro de um quadro com rolagem, o balão no próprio gráfico fazia a barra de
     rolagem aparecer e sumir, e o gráfico piscava no hover. O balão mora no `body`. */
  it('puts the tooltip in the page body, outside any scrolling box', () => {
    const tooltip = withChartTheme({ tooltip: { trigger: 'item' } }, THEME).tooltip as {
      appendTo: string;
    };

    expect(tooltip.appendTo).toBe('body');
  });

  it('reads the clicked item, with row and column on a heatmap cell', () => {
    expect(selectionOf({ name: 'Goiânia', dataType: 'node' })).toEqual({
      name: 'Goiânia',
      kind: 'node',
    });
    expect(selectionOf({ name: '', data: { row: 'Ana', column: 'Parado' } })).toMatchObject({
      row: 'Ana',
      column: 'Parado',
    });
  });

  it('writes counts the Brazilian way and cuts long names with an ellipsis', () => {
    expect(formatCount(6351)).toBe('6.351');
    expect(shortenLabel('Departamento Jurídico', 13)).toBe('Departamento…');
  });

  // triste
  it('does not divide by zero for the share of an empty total', () => {
    expect(shareOf(5, 0)).toBe(0);
  });

  // regressão: a fatia da rosca sumia no hover do Insights do chamados — o ECharts clareava
  // `var(--chart-5)`, não entendia, e pintava `none`
  it('hands ECharts no CSS variable, however deep the colour is', () => {
    document.documentElement.style.setProperty('--chart-5', 'rgb(255, 0, 0)');
    const formatter = () => 'balão';
    const option = withChartTheme(
      {
        tooltip: { trigger: 'item', formatter },
        series: [{ type: 'pie', data: [{ name: 'Mais memória', value: 3, itemStyle: { color: 'var(--chart-5)' } }] }],
      },
      THEME,
    );

    expect(JSON.stringify(option)).not.toContain('var(');
    expect(JSON.stringify(option.series)).toContain('rgb(255, 0, 0)');
    expect((option.tooltip as { formatter: unknown }).formatter).toBe(formatter);
    document.documentElement.style.removeProperty('--chart-5');
  });

  it('keeps numbers, arrays and plain colours untouched while resolving', () => {
    expect(resolveCssColors({ radius: ['62%', '100%'], value: 3, color: '#fff', show: false })).toEqual({
      radius: ['62%', '100%'],
      value: 3,
      color: '#fff',
      show: false,
    });
  });

  it('draws no tooltip when the chart asked for none', () => {
    expect(withChartTheme({}, THEME).tooltip).toBeUndefined();
  });
});
