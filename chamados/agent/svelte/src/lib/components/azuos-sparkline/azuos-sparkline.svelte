<script module lang="ts">
	// Gráfico de série temporal com ECharts — a mesma biblioteca de todos os
	// gráficos do grupo Azuos (ver docs/architecture.md). Só o núcleo, o
	// gráfico de linha, a grade e o desenho em SVG entram no pacote: o resto
	// do ECharts (pizza, mapa, barras…) não pesa no agente.
	import { LineChart } from 'echarts/charts';
	import { GridComponent } from 'echarts/components';
	import * as echarts from 'echarts/core';
	import { SVGRenderer } from 'echarts/renderers';

	echarts.use([LineChart, GridComponent, SVGRenderer]);

	export type AzuosSparklineProps = {
		data: { timestamps: number[]; series: number[][] };
		ui?: { colorVars: string[]; height?: number; fixedMax?: number };
	};

	/** Quanto o tamanho precisa ficar parado pra o gráfico se redesenhar —
	 *  um pouco mais que a animação de troca de tela. */
	export const RESIZE_SETTLE_MS = 250;

	export const DEFAULT_HEIGHT = 90;

	/** Cada série vira pares [instante, valor] — o eixo X é o tempo de verdade,
	 *  não a posição na lista. */
	export function pointsOf(timestamps: number[], values: number[]): [number, number][] {
		return values.map((value, index) => [timestamps[index] ?? index, value]);
	}

	/**
	 * O desenho: curva suavizada com a área até a base pintada — visual de
	 * "onda", que lê melhor num card pequeno do que uma linha seca. Sem eixo,
	 * sem legenda e sem balão (o card ao lado já diz o número), e sem animação:
	 * a amostra chega a cada segundo, e animar cada uma deixaria a curva
	 * sempre atrasada e o processador do usuário ocupado à toa.
	 */
	export function sparklineOption(
		data: AzuosSparklineProps['data'],
		colors: string[],
		fixedMax: number | undefined
	): echarts.EChartsCoreOption {
		const first = data.timestamps[0];
		const last = data.timestamps[data.timestamps.length - 1];

		return {
			animation: false,
			grid: { left: 0, right: 0, top: 2, bottom: 0 },
			xAxis: { type: 'value', show: false, min: first, max: last },
			yAxis: { type: 'value', show: false, min: 0, max: fixedMax },
			series: colors.map((color, index) => ({
				type: 'line',
				silent: true,
				smooth: true,
				showSymbol: false,
				lineStyle: { color, width: 1.5 },
				areaStyle: { color, opacity: 0.22 },
				data: pointsOf(data.timestamps, data.series[index] ?? [])
			}))
		};
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { useTheme } from '$lib/theme/theme.svelte';

	let { data, ui }: AzuosSparklineProps = $props();

	let container: HTMLDivElement;
	let chart: echarts.ECharts | undefined;
	const theme = useTheme();
	const height = $derived(ui?.height ?? DEFAULT_HEIGHT);

	function cssVar(name: string): string {
		return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	}

	function draw() {
		const colors = (ui?.colorVars ?? []).map(cssVar);
		chart?.setOption(sparklineOption(data, colors, ui?.fixedMax), { notMerge: true });
	}

	// A janela nasce escondida (StartHidden, ver app.go) — nesse estado o
	// WebView2 ainda executa o JS, mas o container tem clientWidth 0 (não há
	// layout de verdade pra medir), e mostrar a janela não dispara "resize" na
	// window. O ResizeObserver dispara assim que o elemento ganha um tamanho
	// de verdade, então corrige sozinho tanto esse caso quanto trocas de tela
	// (popup ↔ dashboard).
	//
	// Saindo do zero, redesenha na hora (é a primeira vez que a janela
	// aparece). Fora isso, espera o tamanho PARAR de mudar: redesenhar a cada
	// quadro de uma animação de largura derruba o FPS da tela inteira.
	onMount(() => {
		chart = echarts.init(container, null, {
			renderer: 'svg',
			width: container.clientWidth || 1,
			height
		});
		draw();

		let drawnWidth = container.clientWidth;
		let resizeTimer: ReturnType<typeof setTimeout> | undefined;
		const observer = new ResizeObserver((entries) => {
			const width = entries[0]?.contentRect.width;
			if (!width) return;
			const resize = () => {
				drawnWidth = width;
				chart?.resize({ width, height, animation: { duration: 0 } });
			};
			clearTimeout(resizeTimer);
			if (drawnWidth === 0) resize();
			else resizeTimer = setTimeout(resize, RESIZE_SETTLE_MS);
		});
		observer.observe(container);

		return () => {
			clearTimeout(resizeTimer);
			observer.disconnect();
			chart?.dispose();
			chart = undefined;
		};
	});

	// Cores vêm de variáveis CSS; ao trocar de tema os valores computados
	// mudam, e a nova amostra também redesenha — os dois leem daqui.
	$effect(() => {
		theme.value;
		void data.timestamps;
		void data.series;
		draw();
	});
</script>

<div bind:this={container} class="w-full" style="height: {height}px"></div>
