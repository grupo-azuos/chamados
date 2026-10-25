<script lang="ts" module>
  import { formatCount, resolveColor, shortenLabel, type ChartOption, type ChartTheme } from '$lib/utils/echarts.util';

  /**
   * FLUXO (Sankey) — para onde o volume vai, etapa por etapa.
   *
   * Cada coluna é uma etapa (tipo → responsável → situação, por exemplo) e a espessura de cada
   * faixa é a quantidade que passa por ali. **Poucos nós por coluna** (até uns dez): quem monta a
   * tela agrupa a cauda em "Outros" antes de entregar. Passar o ponteiro num nó acende só as faixas
   * dele; clicar num nó abre o detalhamento (`actions.onSelect`, com o `id` do nó).
   *
   * O `id` é único no gráfico todo e o `label` é o que aparece: o mesmo nome pode existir em duas
   * colunas sem os dois virarem um nó só.
   */
  export type SankeyNode = { id: string; label: string; color: string };

  export type SankeyLink = { from: string; to: string; value: number };

  export type AzuosSankeyChartProps = {
    data: { nodes: readonly SankeyNode[]; links: readonly SankeyLink[]; seriesLabel: string };
    state?: { isLoading?: boolean };
    ui?: { emptyLabel?: string; heightClass?: string };
    actions?: { onSelect?: (nodeId: string) => void };
  };

  /** O que ENTRA no fluxo (as faixas da primeira coluna): somar todas contaria o mesmo item por coluna. */
  export function flowTotalOf(links: readonly SankeyLink[]): number {
    const targets = new Set(links.map((link) => link.to));

    return links.filter((link) => !targets.has(link.from)).reduce((sum, link) => sum + link.value, 0);
  }

  export function sankeyOption(
    data: AzuosSankeyChartProps['data'],
    theme: Pick<ChartTheme, 'foreground'>,
  ): ChartOption {
    const labels = new Map(data.nodes.map((node) => [node.id, node.label]));
    const unit = data.seriesLabel.toLowerCase();

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const item = params as { dataType: string; name: string; value: number; data: { source?: string; target?: string } };
          if (item.dataType === 'edge') {
            return `${labels.get(item.data.source ?? '') ?? ''} → ${labels.get(item.data.target ?? '') ?? ''}<br/><b>${formatCount(item.value)}</b> ${unit}`;
          }

          return `<b>${labels.get(item.name) ?? item.name}</b><br/>${formatCount(item.value)} ${unit}`;
        },
      },
      series: [
        {
          type: 'sankey',
          /* Folga à direita: os nomes da última coluna ficam do lado de fora dos nós. */
          left: 4,
          right: 96,
          top: 8,
          bottom: 8,
          nodeWidth: 12,
          nodeGap: 8,
          layoutIterations: 32,
          draggable: false,
          emphasis: { focus: 'adjacency' },
          lineStyle: { color: 'gradient', opacity: 0.35, curveness: 0.5 },
          label: {
            color: theme.foreground,
            fontSize: 11,
            formatter: (params: unknown) => shortenLabel(labels.get((params as { name: string }).name) ?? '', 16),
          },
          data: data.nodes.map((node) => ({ name: node.id, itemStyle: { color: resolveColor(node.color), borderWidth: 0 } })),
          links: data.links.map((link) => ({ source: link.from, target: link.to, value: link.value })),
        },
      ],
    };
  }
</script>

<script lang="ts">
  import Echart from '$lib/components/azuos-echart/azuos-echart.svelte';

  /* O prop precisa de outro nome aqui dentro: um binding local chamado `state` faz o compilador
     ler `$state(...)` como inscrição numa store `state`, em vez da rune. */
  let { data, state: chartState, ui, actions }: AzuosSankeyChartProps = $props();
</script>

<Echart
  data={{
    option: (theme) => sankeyOption(data, theme),
    description: `${data.seriesLabel}: fluxo de ${formatCount(flowTotalOf(data.links))} entre ${data.nodes.length} etapas`,
  }}
  ui={{ heightClass: ui?.heightClass ?? 'h-96', emptyLabel: ui?.emptyLabel }}
  state={{ isLoading: chartState?.isLoading, isEmpty: data.links.length === 0 }}
  actions={{
    onSelect: actions?.onSelect
      ? (selection) => {
          /* Só o nó abre detalhamento: a faixa cruza duas dimensões, e o detalhamento filtra uma. */
          if (selection.kind === 'node') actions?.onSelect?.(selection.name);
        }
      : undefined,
  }}
/>
