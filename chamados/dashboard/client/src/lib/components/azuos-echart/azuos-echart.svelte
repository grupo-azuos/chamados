<script lang="ts" module>
  import type { ChartOption, ChartSelection, ChartTheme } from '$lib/utils/echarts.util';

  /**
   * A MOLDURA DE TODO GRÁFICO — onde o ECharts é montado.
   *
   * Todo gráfico do projeto passa por aqui, e é aqui que mora o que não pode variar de um para
   * outro:
   *
   *  1. **A altura como decisão de quem chama** (`heightClass`): dois quadros lado a lado só
   *     alinham se tiverem a mesma caixa.
   *  2. **Carregando e vazio iguais em todos**: o bloco pulsando com a altura do gráfico e o
   *     vazio como FRASE (um quadro em branco se lê como defeito).
   *  3. **O tema claro/escuro acompanhando a troca na hora**: a moldura observa a classe/atributo
   *     de tema do documento e entrega ao gráfico as cores novas.
   *  4. **O tamanho acompanhando o quadro — uma vez só**: abrir ou fechar o menu anima a largura,
   *     e o gráfico só se redesenha quando o tamanho PARA de mudar (`RESIZE_SETTLE_MS`), sem
   *     animação. Redesenhar a cada quadro derrubava o FPS da tela inteira.
   *  5. **Uma descrição em texto** (`description`) para leitor de tela.
   *
   * `option` pode ser uma FUNÇÃO do tema, para o gráfico que precisa das cores do tema no
   * próprio desenho (a trilha do medidor, o texto do rótulo).
   */
  export type AzuosEchartProps = {
    data: {
      option: ChartOption | ((theme: ChartTheme) => ChartOption);
      /** O que o gráfico mostra, em uma frase — lido pelo leitor de tela. */
      description: string;
    };
    ui?: {
      className?: string;
      /** A altura da caixa de desenho. @default 'h-48' */
      heightClass?: string;
      /** O texto do vazio. @default 'Sem dados para mostrar' */
      emptyLabel?: string;
      /**
       * A altura do DESENHO, quando ele é maior que a caixa: uma barra por linha, a equipe
       * inteira. A caixa vira janela e o desenho ROLA dentro dela.
       */
      scrollHeight?: number;
    };
    state?: { isLoading?: boolean; isEmpty?: boolean };
    actions?: { onSelect?: (selection: ChartSelection) => void };
  };

  /** Quanto o tamanho precisa ficar parado para o gráfico se redesenhar — um pouco mais que a animação do menu. */
  export const RESIZE_SETTLE_MS = 250;
</script>

<script lang="ts">
  import type { EChartsType } from 'echarts/core';

  import { cn } from '$lib/utils/cn';
  import { loadECharts, readChartTheme, selectionOf, withChartTheme } from '$lib/utils/echarts.util';

  /* O prop precisa de outro nome aqui dentro: um binding local chamado `state` faz o compilador
     ler `$state(...)` como inscrição numa store `state`, em vez da rune. */
  let { data, ui, state: chartState, actions }: AzuosEchartProps = $props();

  let box: HTMLDivElement | undefined = $state();
  let chart: EChartsType | null = null;
  let isReady = $state(false);
  let theme = $state(readChartTheme());

  const heightClass = $derived(ui?.heightClass ?? 'h-48');
  const resolved = $derived(
    withChartTheme(typeof data.option === 'function' ? data.option(theme) : data.option, theme),
  );

  /* O tema do documento, relido quando ele troca (o botão de tema claro/escuro). */
  $effect(() => {
    const observer = new MutationObserver(() => (theme = readChartTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });

    return () => observer.disconnect();
  });

  $effect(() => {
    const element = box;
    if (!element) return;
    let isDisposed = false;
    let observer: ResizeObserver | null = null;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;

    void loadECharts().then((echarts) => {
      if (isDisposed) return;
      /* Tamanho explícito na montagem: escondido, o elemento mede zero e o ECharts desenharia
         num quadro de 0×0 até a próxima medida. */
      const instance = echarts.init(element, null, {
        renderer: 'svg',
        width: element.clientWidth || 600,
        height: element.clientHeight || 300,
      });
      instance.on('click', (params) => actions?.onSelect?.(selectionOf(params)));
      chart = instance;

      observer = new ResizeObserver(([entry]) => {
        if (!entry || entry.contentRect.width === 0) return;
        const { width, height } = entry.contentRect;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(
          () => instance.resize({ width, height, animation: { duration: 0 } }),
          RESIZE_SETTLE_MS,
        );
      });
      observer.observe(element);
      isReady = true;
    });

    return () => {
      isDisposed = true;
      clearTimeout(resizeTimer);
      observer?.disconnect();
      chart?.dispose();
      chart = null;
      isReady = false;
    };
  });

  $effect(() => {
    if (!isReady) return;
    chart?.setOption(resolved, { notMerge: true });
  });
</script>

{#if chartState?.isLoading}
  <div class={cn('bg-muted w-full animate-pulse rounded-box', heightClass, ui?.className)} aria-busy="true"></div>
{:else if chartState?.isEmpty}
  <p class={cn('text-muted-foreground flex w-full items-center justify-center text-xs', heightClass, ui?.className)}>
    {ui?.emptyLabel ?? 'Sem dados para mostrar'}
  </p>
{:else if ui?.scrollHeight !== undefined}
  <div class={cn('overflow-y-auto pr-1', heightClass, ui?.className)}>
    <div
      bind:this={box}
      role="img"
      aria-label={data.description}
      data-slot="chart"
      class={cn('w-full', actions?.onSelect && 'cursor-pointer')}
      style="height: {ui.scrollHeight}px"
    ></div>
  </div>
{:else}
  <div
    bind:this={box}
    role="img"
    aria-label={data.description}
    data-slot="chart"
    class={cn('w-full', heightClass, ui?.className, actions?.onSelect && 'cursor-pointer')}
  ></div>
{/if}
