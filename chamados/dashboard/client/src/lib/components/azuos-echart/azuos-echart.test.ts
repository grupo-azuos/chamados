import { render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type * as EchartsUtil from '$lib/utils/echarts.util';

import Echart, { RESIZE_SETTLE_MS } from './azuos-echart.svelte';

/* Um ECharts de mentira: o teste do redimensionamento só quer contar quantas vezes ele redesenha. */
const fakeChart = vi.hoisted(() => {
  /* A superfície de desenho: guarda o clique registrado, para o teste disparar um clique na área. */
  const surface = { click: null as ((event: { offsetX: number; offsetY: number }) => void) | null };

  return {
    surface,
    on: vi.fn(),
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
    getZr: () => ({
      on: (_name: string, handler: (event: { offsetX: number; offsetY: number }) => void) => {
        surface.click = handler;
      },
    }),
    containPixel: vi.fn(() => true),
    convertFromPixel: vi.fn(() => [2.4, 0]),
  };
});

vi.mock('$lib/utils/echarts.util', async (importOriginal) => ({
  ...(await importOriginal<typeof EchartsUtil>()),
  loadECharts: () => Promise.resolve({ init: () => fakeChart }),
}));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  fakeChart.resize.mockClear();
  fakeChart.setOption.mockClear();
});

const OPTION = { series: [{ type: 'bar' as const, data: [1, 2, 3] }] };

describe('AzuosEchart', () => {
  // feliz
  /* O gráfico de área não tem símbolo para clicar: o clique na área vira a posição no eixo. */
  it('turns a click anywhere in the plot into the nearest axis position', async () => {
    const onAxisSelect = vi.fn();
    render(Echart, { props: { data: { option: OPTION, description: 'x' }, actions: { onAxisSelect } } });

    await waitFor(() => expect(fakeChart.surface.click).not.toBeNull());
    fakeChart.surface.click?.({ offsetX: 10, offsetY: 10 });
    expect(onAxisSelect).toHaveBeenCalledWith(2);
  });

  // triste
  it('ignores a click outside the plot', async () => {
    const onAxisSelect = vi.fn();
    fakeChart.containPixel.mockReturnValueOnce(false);
    render(Echart, { props: { data: { option: OPTION, description: 'x' }, actions: { onAxisSelect } } });

    await waitFor(() => expect(fakeChart.surface.click).not.toBeNull());
    fakeChart.surface.click?.({ offsetX: 900, offsetY: 900 });
    expect(onAxisSelect).not.toHaveBeenCalled();
  });

  // feliz
  /* O desenho é uma imagem com descrição: quem usa leitor de tela ouve o que o gráfico mostra. */
  it('draws the chart as an image with a description', () => {
    render(Echart, { props: { data: { option: OPTION, description: 'Chamados por dia' } } });

    expect(screen.getByRole('img', { name: 'Chamados por dia' })).toBeInTheDocument();
  });

  /* Desenho maior que a caixa: a caixa vira janela e o desenho rola dentro dela. */
  it('scrolls a drawing taller than its box', () => {
    render(Echart, {
      props: {
        data: { option: OPTION, description: 'x' },
        ui: { heightClass: 'h-40', scrollHeight: 900 },
      },
    });

    expect(screen.getByRole('img')).toHaveStyle({ height: '900px' });
    expect(screen.getByRole('img').parentElement).toHaveClass('overflow-y-auto', 'h-40');
  });

  /* Abrir o menu anima a largura e o observador dispara a cada quadro: o gráfico só pode se
     redesenhar UMA vez, quando o tamanho para de mudar — senão o FPS da tela toda despenca. */
  it('redraws once, after the size stops changing', async () => {
    const callbacks: ResizeObserverCallback[] = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          callbacks.push(callback);
        }
        observe() {}
        disconnect() {}
      },
    );
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(Echart, { props: { data: { option: OPTION, description: 'x' } } });
    await waitFor(() => expect(callbacks).toHaveLength(1));

    for (const width of [500, 520, 540, 560]) {
      callbacks[0]!(
        [{ contentRect: { width, height: 300 } } as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    }
    expect(fakeChart.resize).not.toHaveBeenCalled();

    vi.advanceTimersByTime(RESIZE_SETTLE_MS);
    expect(fakeChart.resize).toHaveBeenCalledOnce();
    expect(fakeChart.resize).toHaveBeenCalledWith(expect.objectContaining({ width: 560 }));
  });

  /* REGRESSÃO: a tela recria os dados a cada consulta, mesmo iguais. Redesenhar com eles apagava
     o balão aberto e o gráfico piscava no hover — com dado igual, o desenho não é refeito. */
  it('does not redraw when the screen hands over the same data again', async () => {
    const { rerender } = render(Echart, { props: { data: { option: OPTION, description: 'x' } } });
    await waitFor(() => expect(fakeChart.setOption).toHaveBeenCalledTimes(1));

    await rerender({
      data: { option: { series: [{ type: 'bar' as const, data: [1, 2, 3] }] }, description: 'x' },
    });
    expect(fakeChart.setOption).toHaveBeenCalledTimes(1);

    await rerender({
      data: { option: { series: [{ type: 'bar' as const, data: [4, 5, 6] }] }, description: 'x' },
    });
    expect(fakeChart.setOption).toHaveBeenCalledTimes(2);
  });

  // triste
  it('says there is no data instead of drawing an empty box', () => {
    render(Echart, {
      props: {
        data: { option: OPTION, description: 'x' },
        state: { isEmpty: true },
        ui: { emptyLabel: 'Nada aqui' },
      },
    });

    expect(screen.getByText('Nada aqui')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('keeps the box while loading, so the panel does not reflow', () => {
    const { container } = render(Echart, {
      props: {
        data: { option: OPTION, description: 'x' },
        state: { isLoading: true },
        ui: { heightClass: 'h-40' },
      },
    });

    expect(container.querySelector('[aria-busy="true"]')).toHaveClass('h-40');
  });
});
