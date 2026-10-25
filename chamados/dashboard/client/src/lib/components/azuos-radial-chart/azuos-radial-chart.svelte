<script lang="ts" module>
  import { resolveColor, type ChartOption, type ChartTheme } from '$lib/utils/echarts.util';

  /**
   * MEDIDOR RADIAL — um número só, contra o quanto ele poderia ser.
   *
   * É o gráfico certo para "quanto de 100", e o errado para comparar categorias: um arco não
   * se compara com outro arco de outro cartão. Serve para "84 das 96 máquinas estão de pé" e
   * não serve para "qual departamento abriu mais chamados" — isso é barra.
   *
   * O arco de trás (a trilha) é o que faz o gráfico ser lido: sem ele, um arco de 20% e um de
   * 80% parecem só dois riscos de tamanhos diferentes, sem escala nenhuma.
   *
   * O número no meio vem sempre escrito. O arco é o reforço, nunca a única informação.
   */
  export type AzuosRadialChartProps = {
    data: {
      value: number;
      /** O teto da escala — o "de quanto". @default 100 */
      max?: number;
      /** O que está sendo medido: "Máquinas de pé". */
      label: string;
      /** O número grande no meio. Sem isto, o próprio valor. */
      display?: string;
      /** A linha pequena embaixo do número: "de 96 cadastradas". */
      hint?: string | null;
    };
    state?: { isLoading?: boolean };
    ui?: {
      /** A cor do arco. @default 'var(--chart-1)' */
      color?: string;
      className?: string;
      /** A altura da caixa de desenho. @default 'h-40' */
      heightClass?: string;
    };
  };


  /**
   * A fração preenchida, entre 0 e 1.
   *
   * Exportada para ter teste próprio: teto zero é divisão por zero, e valor acima do teto
   * desenharia um arco dando mais de uma volta — os dois viram um gráfico que mente.
   */
  export function fractionOf(value: number, max: number): number {
    if (max <= 0) return 0;

    return Math.min(1, Math.max(0, value / max));
  }

  /**
   * O arco: começa no topo e anda no sentido do relógio, com a TRILHA de trás na cor apagada do
   * tema — é ela que faz o arco ser lido como "quanto de quanto". A escala é fixa em 0–1.
   */
  export function radialOption(fraction: number, color: string, theme: Pick<ChartTheme, 'track'>): ChartOption {
    return {
      series: [
        {
          type: 'gauge',
          startAngle: 90,
          endAngle: -270,
          min: 0,
          max: 1,
          radius: '100%',
          pointer: { show: false },
          progress: { show: true, roundCap: true, width: 12, itemStyle: { color: resolveColor(color) } },
          axisLine: { roundCap: true, lineStyle: { width: 12, color: [[1, theme.track]] } },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          detail: { show: false },
          title: { show: false },
          data: [{ value: fraction }],
        },
      ],
    };
  }
</script>

<script lang="ts">
  import Echart from '$lib/components/azuos-echart/azuos-echart.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, state: chartState, ui }: AzuosRadialChartProps = $props();

  const max = $derived(data.max ?? 100);
  const color = $derived(ui?.color ?? 'var(--chart-1)');
  const fraction = $derived(fractionOf(data.value, max));
</script>

{#if chartState?.isLoading}
  <div
    class={cn('bg-muted w-full animate-pulse rounded-box', ui?.heightClass ?? 'h-40', ui?.className)}
  ></div>
{:else}
  <div class={cn('flex w-full flex-col items-center', ui?.className)}>
    <div class={cn('relative w-full', ui?.heightClass ?? 'h-40')}>
      <Echart
        data={{
          option: (theme) => radialOption(fraction, color, theme),
          description: `${data.label}: ${data.display ?? data.value} de ${max}`,
        }}
        ui={{ heightClass: 'h-full' }}
      />

      <!-- No MEIO do anel vai só o que cabe no buraco: o número e o que ele mede.
           `px-[20%]` é a folga que impede o rótulo de encostar no arco. -->
      <div
        class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-[20%] text-center"
      >
        <span class="text-foreground text-2xl leading-tight font-bold tabular-nums">
          {data.display ?? data.value}
        </span>
        <span class="text-muted-foreground text-xs leading-tight tracking-wide uppercase">
          {data.label}
        </span>
      </div>
    </div>

    <!-- A explicação vai FORA do anel, embaixo. Dentro, ela não cabe: o buraco tem pouco mais
         de cem pixels de largura, e uma frase como "7 manutenções feitas no período" atravessa
         o arco e fica ilegível por cima dele. -->
    {#if data.hint}
      <p class="text-muted-foreground mt-1 text-center text-xs leading-tight">{data.hint}</p>
    {/if}
  </div>
{/if}
