<script lang="ts" module>
  import {
    DATA_SOURCES,
    type Widget,
    WIDGET_PERIOD_LABELS,
    windowLabel,
  } from '@template/shared/schemas/dashboard-board.schema';

  import { type WidgetState } from '$lib/hooks/use-dashboard-board/use-dashboard-board.svelte';
  import { type BoardItem } from '$lib/utils/widget-items.util';

  /**
   * UM BLOCO DO PAINEL — a fonte contada, desenhada no formato escolhido. O mesmo bloco serve a
   * ver e a montar: montando, ganha a alça de arrastar, o peso, o "trocar o gráfico", o
   * "configurar" e o "remover". Vendo, ganha o "expandir", que abre o gráfico em tela cheia.
   *
   * Função pura de props: os números chegam prontos (`data.result`), e o bloco só desenha.
   */
  export type AzuosBoardWidgetProps = {
    data: {
      widget: Widget;
      result: WidgetState;
      /** O nome do filtro salvo do bloco — um selo do recorte. */
      filterName: string | null;
      /** A nota da data que o "Período" do painel recorta nesta fonte. @default nenhuma */
      periodNote?: string | null;
    };
    /**
     * `isPreview`: o bloco desenhado dentro do editor. Ali não expande — uma tela cheia aberta de
     * dentro do diálogo brigava com ele e com a tela de montar o painel.
     */
    state: { isEditing: boolean; isPreview?: boolean };
    actions: {
      onEdit: (id: string) => void;
      onRemove: (id: string) => void;
      /** Trocar o gráfico direto no bloco, sem abrir o editor (só montando o painel). */
      onChangeKind?: (id: string, kind: Widget['kind']) => void;
      /**
       * Clicou num item (barra, fatia, linha, card): a tela leva à lista do que ele conta. Sem
       * ela — montando, ou com os itens não clicáveis — o bloco fica de leitura.
       */
      onOpenItem?: (widget: Widget, item: BoardItem) => void;
    };
  };

  /**
   * A classe da alça de arrastar — o canvas só arrasta por ela, para o gráfico seguir clicável.
   * Nos gráficos, é o cabeçalho inteiro (alvo grande); nos cards e no destaque, a alça da barra.
   */
  export const DRAG_HANDLE = 'board-drag-handle';

  /** O que, dentro da alça, é clique e não começo de arrasto: os botões do cabeçalho. */
  export const NO_DRAG = 'board-no-drag';

  /** "Contagem de chamados por situação" — o que o bloco conta, e como agrupa. */
  export function measureOf(widget: Widget): string {
    const source = DATA_SOURCES[widget.source];
    const dimensions = source.dimensions as Record<string, { label: string }>;
    const group = widget.groupBy ? dimensions[widget.groupBy]?.label : null;
    const split = widget.splitBy ? dimensions[widget.splitBy]?.label : null;
    const parts = [`Contagem de ${source.noun}`];
    if (group) parts.push(`por ${group.toLowerCase()}`);
    if (split) parts.push(`e ${split.toLowerCase()}`);

    return parts.join(' ');
  }

  /** O recorte em selos: o total, o período, "só os meus" e o filtro — o que mudou o número. */
  export function scopeChipsOf(data: AzuosBoardWidgetProps['data']): string[] {
    const { widget, result } = data;

    return [
      result.data ? `${result.data.total.toLocaleString('pt-BR')} ${DATA_SOURCES[widget.source].noun}` : null,
      widget.period !== 'all' ? WIDGET_PERIOD_LABELS[widget.period] : null,
      widget.window ? windowLabel(widget.window) : null,
      widget.onlyMine ? 'Só os meus' : null,
      data.filterName,
      data.periodNote ?? null,
    ].filter((chip): chip is string => Boolean(chip));
  }
</script>

<script lang="ts">
  import GripVertical from '@lucide/svelte/icons/grip-vertical';
  import Maximize2 from '@lucide/svelte/icons/maximize-2';

  import AzuosActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import AzuosExpandableScreen from '$lib/components/azuos-expandable-screen/azuos-expandable-screen.svelte';
  import { cn } from '$lib/utils/cn';
  import { WIDGET_KIND_LOOK } from '$lib/utils/widget-kind.util';

  import WidgetBody from './azuos-board-widget-body.svelte';
  import WidgetEditTools from './azuos-board-widget-edit-tools.svelte';

  let { data, state: widgetState, actions }: AzuosBoardWidgetProps = $props();

  let isExpanded = $state(false);
  const widget = $derived(data.widget);
  /* Os cards e o destaque já são superfícies; os gráficos ganham a moldura do bloco. */
  const isCard = $derived(widget.kind === 'stats' || widget.kind === 'hero' || widget.kind === 'ringCard');
  const Icon = $derived(WIDGET_KIND_LOOK[widget.kind].icon);
  const chips = $derived(scopeChipsOf(data));
</script>

{#snippet dragHandle()}
  <!-- A alça de arrastar: um botão de verdade, de 40px, no lugar do ícone do bloco. -->
  <button
    type="button"
    aria-label={`Arrastar ${widget.title}`}
    class={cn(
      DRAG_HANDLE,
      'rounded-box bg-primary-soft text-primary flex size-10 shrink-0 cursor-grab items-center justify-center active:cursor-grabbing',
      'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
    )}
  >
    <GripVertical class="size-5" aria-hidden="true" />
  </button>
{/snippet}

{#snippet editBar()}
  <!-- A BARRA DO BLOCO, montando: flutua ACIMA do bloco, no vão entre os andares, como a etiqueta
       de um quadro num editor de design. O bloco embaixo fica igual ao do painel — nada por cima do
       título, do número ou do gráfico. -->
  <div
    class="rounded-button bg-card shadow-card ring-foreground/8 absolute bottom-full left-0 z-10 mb-4 flex max-w-full items-center gap-1 p-1 ring-1"
  >
    {@render dragHandle()}
    <WidgetEditTools data={{ widget }} {actions} />
  </div>
{/snippet}

{#if isCard}
  <!-- Sem a faixa de selos, a nota do período do painel vai num selo acima dos cards. -->
  <div class="relative flex h-full flex-col gap-1">
    {#if data.periodNote}
      <span class="rounded-chip bg-muted text-ink-700 self-start px-2 py-0.5 text-xs font-semibold">
        {data.periodNote}
      </span>
    {/if}
    <div class="min-h-0 flex-1">
      <WidgetBody data={{ widget, result: data.result }} {actions} />
    </div>
    {#if widgetState.isEditing}
      {@render editBar()}
    {/if}
  </div>
{:else}
  <!-- O cartão: a faixa do cabeçalho (ícone, título, o que conta, o recorte em selos) e as
       ferramentas dentro dela — nada solto embaixo (conectividade uniforme). Montando, quem
       desenha a seleção é o canvas (o contorno tracejado e os puxadores). -->
  <section aria-label={widget.title} class="rounded-surface bg-card shadow-card relative flex h-full min-h-0 flex-col">
    {#if widgetState.isEditing}
      {@render editBar()}
    {/if}
    <header
      class={cn(
        'border-border flex items-start gap-3 border-b px-4 pt-3.5 pb-3',
        widgetState.isEditing && cn(DRAG_HANDLE, 'cursor-grab active:cursor-grabbing'),
      )}
    >
      <span class="rounded-box bg-primary-soft text-primary flex size-10 shrink-0 items-center justify-center">
        <Icon class="size-5" aria-hidden="true" />
      </span>
      <span class="min-w-0 flex-1">
        <h3 class="text-ink-900 truncate text-sm font-bold tracking-tight">{widget.title}</h3>
        <span class="text-ink-500 block truncate text-xs">{measureOf(widget)}</span>
        {#if chips.length > 0}
          <span class="mt-1.5 flex flex-wrap gap-1">
            {#each chips as chip, index (chip)}
              <span
                class={cn(
                  'rounded-chip px-2 py-0.5 text-xs font-semibold',
                  index === 0 ? 'bg-primary-soft text-primary' : 'bg-muted text-ink-700',
                )}
              >
                {chip}
              </span>
            {/each}
          </span>
        {/if}
      </span>
      <span class={cn('flex shrink-0 items-center gap-1', NO_DRAG)}>
        {#if !widgetState.isEditing && !widgetState.isPreview}
          <AzuosActionButton
            data={{ label: `Expandir ${widget.title}` }}
            ui={{ variant: 'ghost', icon: Maximize2, isIconOnly: true }}
            actions={{ onClick: () => (isExpanded = true) }}
          />
        {/if}
      </span>
    </header>
    <div class="min-h-0 flex-1 p-4">
      <WidgetBody data={{ widget, result: data.result }} {actions} />
    </div>
    <AzuosExpandableScreen
      data={{ title: widget.title, description: measureOf(widget) }}
      state={{ isOpen: isExpanded }}
      actions={{ onClose: () => (isExpanded = false) }}
    >
      <div class="h-[70vh] p-6">
        <WidgetBody data={{ widget, result: data.result }} {actions} />
      </div>
    </AzuosExpandableScreen>
  </section>
{/if}
