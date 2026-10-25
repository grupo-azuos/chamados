import { render } from '@testing-library/svelte';
import { getInstanceByDom } from 'echarts/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AzuosSparkline, {
	pointsOf,
	RESIZE_SETTLE_MS,
	sparklineOption
} from './azuos-sparkline.svelte';

type DrawnOption = {
	series: { data: [number, number][] }[];
	yAxis: { max?: number }[];
};

function drawnOf(container: HTMLElement) {
	const chart = getInstanceByDom(container.firstElementChild as HTMLElement);
	return { chart, option: chart?.getOption() as unknown as DrawnOption | undefined };
}

describe('AzuosSparkline', () => {
	afterEach(() => vi.useRealTimers());

	// feliz
	it('draws the series with ECharts, in SVG, when provided with valid data', () => {
		// O desenho em SVG é o que roda no WebView2 do agente — e o que o jsdom consegue montar
		const { container } = render(AzuosSparkline, {
			props: {
				data: { timestamps: [0, 1, 2], series: [[10, 20, 15]] },
				ui: { colorVars: ['--chart-5'], fixedMax: 100 }
			}
		});
		const { option } = drawnOf(container);
		expect(container.querySelector('svg')).toBeInTheDocument();
		expect(option?.series[0]?.data).toEqual([
			[0, 10],
			[1, 20],
			[2, 15]
		]);
		expect(option?.yAxis[0]?.max).toBe(100);
	});

	// feliz
	it('supports multiple series and custom color variables', () => {
		// Download/upload ou leitura/escrita lado a lado, uma curva por série
		const { container } = render(AzuosSparkline, {
			props: {
				data: {
					timestamps: [0, 1, 2],
					series: [
						[10, 20, 15],
						[5, 12, 8]
					]
				},
				ui: { colorVars: ['--chart-5', '--chart-2'], height: 60 }
			}
		});
		expect(drawnOf(container).option?.series).toHaveLength(2);
		expect((container.firstElementChild as HTMLElement).style.height).toBe('60px');
	});

	// feliz
	it('redraws the new sample on the same chart instead of rebuilding it', async () => {
		// A amostra chega a cada segundo: recriar o gráfico a cada uma piscaria o card
		const { container, rerender } = render(AzuosSparkline, {
			props: { data: { timestamps: [0, 1], series: [[5, 10]] }, ui: { colorVars: ['--chart-5'] } }
		});
		const before = drawnOf(container).chart;

		await rerender({
			data: { timestamps: [0, 1, 2], series: [[5, 10, 30]] },
			ui: { colorVars: ['--chart-5'] }
		});

		const after = drawnOf(container);
		expect(after.chart).toBe(before);
		expect(after.option?.series[0]?.data.at(-1)).toEqual([2, 30]);
	});

	// regressão: redesenhar a cada quadro da animação de largura derrubava o FPS (ver echarts-padrao)
	it('resizes once, after the width stops changing', () => {
		vi.useFakeTimers();
		const stubbed = globalThis.ResizeObserver;
		let notify: ResizeObserverCallback = () => {};
		vi.stubGlobal(
			'ResizeObserver',
			class {
				constructor(callback: ResizeObserverCallback) {
					notify = callback;
				}
				observe() {}
				unobserve() {}
				disconnect() {}
			}
		);
		const { container } = render(AzuosSparkline, {
			props: { data: { timestamps: [0, 1], series: [[5, 10]] }, ui: { colorVars: ['--chart-5'] } }
		});
		const chart = drawnOf(container).chart!;
		const resize = vi.spyOn(chart, 'resize');
		const widthOf = (width: number) =>
			[{ contentRect: { width } }] as unknown as ResizeObserverEntry[];

		// A janela aparece pela primeira vez (saindo do zero): redesenha na hora
		notify(widthOf(300), {} as ResizeObserver);
		expect(resize).toHaveBeenCalledTimes(1);

		// A largura anima: nada até parar
		notify(widthOf(280), {} as ResizeObserver);
		notify(widthOf(260), {} as ResizeObserver);
		vi.advanceTimersByTime(RESIZE_SETTLE_MS - 1);
		expect(resize).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(1);
		expect(resize).toHaveBeenCalledTimes(2);
		expect(resize).toHaveBeenLastCalledWith(expect.objectContaining({ width: 260 }));
		vi.stubGlobal('ResizeObserver', stubbed);
	});

	// triste
	it('mounts safely without throwing when series data is empty (edge case)', () => {
		// Na inicialização do agente antes de coletar a primeira amostra, os dados chegam vazios
		const { container } = render(AzuosSparkline, {
			props: {
				data: { timestamps: [], series: [[]] },
				ui: { colorVars: ['--chart-5'] }
			}
		});
		expect(drawnOf(container).option?.series[0]?.data).toEqual([]);
	});

	// triste
	it('handles undefined ui options gracefully using default values (edge case)', () => {
		// Sem ui definido, usa a altura padrão, escala automática e nenhuma curva
		const { container } = render(AzuosSparkline, {
			props: {
				data: { timestamps: [0, 1], series: [[5, 10]] },
				ui: undefined
			}
		});
		expect((container.firstElementChild as HTMLElement).style.height).toBe('90px');
		expect(drawnOf(container).option?.series).toHaveLength(0);
	});

	// triste
	it('falls back to the position when a value has no timestamp', () => {
		expect(pointsOf([0], [5, 7])).toEqual([
			[0, 5],
			[1, 7]
		]);
		expect(sparklineOption({ timestamps: [], series: [] }, [], undefined)).toMatchObject({
			animation: false,
			series: []
		});
	});
});
