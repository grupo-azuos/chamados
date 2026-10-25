import { describe, expect, it } from 'vitest';

import {
  formatCount,
  resolveColor,
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

  it('draws no tooltip when the chart asked for none', () => {
    expect(withChartTheme({}, THEME).tooltip).toBeUndefined();
  });
});
