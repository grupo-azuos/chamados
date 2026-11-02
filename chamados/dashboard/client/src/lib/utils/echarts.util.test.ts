import { describe, expect, it, vi } from 'vitest';

import {
  formatCount,
  readChartTheme,
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

describe('echarts.util — colours the browser cannot resolve', () => {
  // triste
  it('falls back to the light token, or to the reserve colour, for an unresolved variable', () => {
    document.documentElement.style.setProperty('--primary', 'var(--brand)');
    document.documentElement.style.setProperty('--nope', 'var(--none)');
    try {
      expect(resolveColor('var(--primary)')).not.toContain('var(');
      expect(resolveColor('var(--nope)', '#abcdef')).toBe('#abcdef');
    } finally {
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--nope');
    }
  });

  // feliz
  it('reads the clicked item by its id and without row or column', () => {
    expect(selectionOf({ name: 'x', data: { id: 'node:1' }, dataType: 'node' })).toEqual({ name: 'node:1', kind: 'node', row: undefined, column: undefined });
    expect(selectionOf({})).toEqual({ name: '', kind: undefined, row: undefined, column: undefined });
  });

  // feliz
  it('keeps short labels whole and reads the theme from the document', () => {
    expect(shortenLabel('Curto')).toBe('Curto');
    expect(readChartTheme().font).toBeTruthy();
  });
});

describe('echarts.util — edge cases', () => {
  // feliz
  it('keeps a resolved color when the probe element resolves the variable', () => {
    const spy = vi
      .spyOn(window, 'getComputedStyle')
      .mockReturnValue({ color: 'rgb(1, 2, 3)', getPropertyValue: () => '' } as unknown as CSSStyleDeclaration);
    try {
      expect(resolveColor('var(--foreground)')).toBe('rgb(1, 2, 3)');
    } finally {
      spy.mockRestore();
    }
  });

  it('themes the first tooltip when the option carries a list of them', () => {
    const themed = withChartTheme({ tooltip: [{ trigger: 'item' }] }, THEME);

    expect(themed.tooltip).toMatchObject({ trigger: 'item', backgroundColor: THEME.surface });
  });

  it('walks objects without a prototype like plain ones', () => {
    const bare = Object.assign(Object.create(null) as Record<string, unknown>, { color: '#123456' });

    expect(resolveCssColors(bare)).toEqual({ color: '#123456' });
  });

  // triste
  /* Sem `document` (servidor), o tema é o de reserva e a cor vem do token conhecido ou da reserva. */
  it('uses the fallback theme and token colors without a document', () => {
    vi.stubGlobal('document', undefined);
    try {
      expect(readChartTheme()).toEqual(readChartTheme());
      expect(resolveColor('var(--success)')).toMatch(/^#|^rgb|^oklch/);
      expect(resolveColor('var(--nope)', '#abcdef')).toBe('#abcdef');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
