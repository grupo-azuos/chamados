<script lang="ts" module>
  import {
    type BoardFilter,
    type BoardFilterDisplay,
    type BoardFilterKind,
    type BoardFilterValues,
    type LayoutItem,
    type Widget,
    type WidgetKind,
    weightLabel,
  } from '@template/shared/schemas/dashboard-board.schema';

  import { type FilterCounts, type WidgetState } from '$lib/hooks/use-dashboard-board/use-dashboard-board.svelte';
  import { type BoardFilterPlaceChange } from '$lib/utils/board-draft.util';

  /**
   * MONTAR O PAINEL — a tela cheia que abre por cima de tudo (sem o menu do sistema). À esquerda o
   * tabuleiro, com as casas da grade à mostra; à direita os tipos de bloco, para ARRASTAR até a
   * casa onde ele deve nascer (ou pôr embaixo com um clique). "Guardar" é a única ação principal;
   * "Restaurar" desiste. O mesmo desenho do paralegal.
   */
  export type AzuosBoardStudioProps = {
    data: {
      scopeLabel: string;
      widgets: Widget[];
      layout: LayoutItem[];
      results: Record<string, WidgetState>;
      filterNames: Record<string, string>;
      boardFilters: BoardFilter[];
      filterValues: BoardFilterValues;
      filterCounts: Record<string, FilterCounts>;
      /** Os pontos que o painel já gasta, da cota de `MAX_BOARD_WEIGHT`. */
      weight: number;
    };
    state: { isOpen: boolean; isSaving: boolean; canAdd: boolean; error: string | null };
    actions: {
      onFilterValueChange: (patch: Partial<BoardFilterValues>) => void;
      onAddBoardFilter: (kind: BoardFilterKind) => void;
      onRemoveBoardFilter: (id: string) => void;
      onBoardFilterDisplayChange: (id: string, display: BoardFilterDisplay) => void;
      onBoardFilterPlaceChange: (places: readonly BoardFilterPlaceChange[]) => void;
      onClearFilterValues: () => void;
      onLayoutChange: (layout: LayoutItem[]) => void;
      onNewWidget: (kind: WidgetKind, place: Omit<LayoutItem, 'i'>) => void;
      onEditWidget: (id: string) => void;
      onRemoveWidget: (id: string) => void;
      onChangeKind: (id: string, kind: WidgetKind) => void;
      onOpenFilters: () => void;
      onCancel: () => void;
      onSave: () => void;
    };
  };

  /** O que a lateral diz sobre a cota: quanto sobra, ou que acabou (ou passou, num painel antigo). */
  export function paletteHint(left: number): string {
    if (left < 0) return `O painel passou ${-left} da cota. Tire ou troque um bloco para pôr outro.`;
    if (left === 0) return 'O painel usou a cota toda. Tire ou troque um bloco para pôr outro.';

    return `Sobram ${weightLabel(left)}. Arraste para a grade, ou clique para pôr no fim.`;
  }

  /** O tamanho de uma casa na miniatura que segue o mouse. */
  const GHOST_CELL = { width: 56, height: 32 };

  /**
   * A MINIATURA QUE SEGUE O MOUSE: no formato do bloco (2×2, 4×2, 1×2…), com o nome — e não a
   * "foto" do botão que o navegador tiraria. Ela só precisa existir no instante do `dragstart`;
   * o navegador copia o desenho, e o elemento sai da página no quadro seguinte.
   */
  export function attachDragGhost(
    transfer: Pick<DataTransfer, 'setDragImage'>,
    label: string,
    size: { w: number; h: number },
  ): HTMLElement {
    const ghost = document.createElement('div');
    ghost.textContent = `${label} · ${size.w} × ${size.h}`;
    ghost.className =
      'fixed -top-[999px] left-0 flex items-center justify-center rounded-box bg-card px-2 text-center text-xs font-semibold text-ink-900 shadow-card';
    ghost.style.width = `${size.w * GHOST_CELL.width}px`;
    ghost.style.height = `${size.h * GHOST_CELL.height}px`;
    document.body.append(ghost);
    transfer.setDragImage(ghost, 16, 16);
    requestAnimationFrame(() => ghost.remove());

    return ghost;
  }
</script>

<script lang="ts">
  import GripVertical from '@lucide/svelte/icons/grip-vertical';
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
  import ListFilter from '@lucide/svelte/icons/list-filter';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import Save from '@lucide/svelte/icons/save';
  import { MAX_BOARD_WEIGHT, WIDGET_WEIGHTS } from '@template/shared/schemas/dashboard-board.schema';

  import AzuosActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import AzuosBoardCanvas, { KIND_DRAG_TYPE, kindDragTypeOf } from '$lib/components/azuos-board-canvas/azuos-board-canvas.svelte';
  import AzuosBoardFilterBar from '$lib/components/azuos-board-filter-bar/azuos-board-filter-bar.svelte';
  import AzuosExpandableScreen from '$lib/components/azuos-expandable-screen/azuos-expandable-screen.svelte';
  import { bottomPlace, defaultSizeOf } from '$lib/utils/board-layout.util';
  import { cn } from '$lib/utils/cn';
  import { MAIN_KINDS, OTHER_KINDS, WIDGET_KIND_LOOK } from '$lib/utils/widget-kind.util';

  let { data, state: studioState, actions }: AzuosBoardStudioProps = $props();

  /* A cota é de PONTOS, não de blocos: cada tipo pesa o quanto custa ao banco, e o tipo que não
     cabe no que sobra fica desligado — os mais leves continuam à mão. `canAdd` é a palavra final
     do hook: sem ela, nada sobra para pôr. */
  const left = $derived(
    studioState.canAdd ? MAX_BOARD_WEIGHT - data.weight : Math.min(MAX_BOARD_WEIGHT - data.weight, 0),
  );

  function onDragStart(event: DragEvent, kind: WidgetKind) {
    const transfer = event.dataTransfer;
    if (!transfer) return;
    transfer.setData(KIND_DRAG_TYPE, kind);
    transfer.setData(kindDragTypeOf(kind), kind);
    transfer.effectAllowed = 'copy';
    attachDragGhost(transfer, WIDGET_KIND_LOOK[kind].short, defaultSizeOf(kind));
  }
</script>

{#snippet kindGroup(title: string, kinds: readonly WidgetKind[])}
  <section aria-label={title} class="mt-4">
    <p class="text-ink-500 mb-1.5 text-xs font-medium">{title}</p>
    <ul class="flex flex-col gap-1.5">
      {#each kinds as kind (kind)}
        {@const look = WIDGET_KIND_LOOK[kind]}
        {@const size = defaultSizeOf(kind)}
        {@const weight = WIDGET_WEIGHTS[kind]}
        {@const fits = studioState.canAdd && weight <= left}
        <li>
          <button
            type="button"
            draggable={fits}
            disabled={!fits}
            aria-label={`Pôr bloco ${look.short}`}
            ondragstart={(event) => onDragStart(event, kind)}
            onclick={() => actions.onNewWidget(kind, bottomPlace(data.layout, kind))}
            class={cn(
              'group rounded-box bg-muted flex min-h-12 w-full cursor-grab items-center gap-3 px-2.5 py-2 text-left transition-colors active:cursor-grabbing',
              'hover:bg-accent focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <span class="rounded-icon bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center">
              <look.icon class="size-4" aria-hidden="true" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="text-ink-900 block text-sm font-semibold">{look.short}</span>
              <span class="text-ink-500 block text-xs">{size.w} × {size.h} casas · {weightLabel(weight)}</span>
            </span>
            <GripVertical class="text-ink-500 size-4 group-disabled:hidden" aria-hidden="true" />
          </button>
        </li>
      {/each}
    </ul>
  </section>
{/snippet}

<AzuosExpandableScreen
  data={{
    title: `Montar o painel ${data.scopeLabel}`,
    description: 'Arraste um bloco da lateral para uma casa da grade. Pela alça ele muda de lugar; pelos cantos, de tamanho.',
  }}
  state={{ isOpen: studioState.isOpen }}
  actions={{ onClose: actions.onCancel }}
>
  {#snippet footer()}
    <AzuosActionButton
      data={{ label: 'Restaurar' }}
      ui={{ variant: 'ghost', icon: RotateCcw }}
      state={{ isDisabled: studioState.isSaving }}
      actions={{ onClick: actions.onCancel }}
    />
    <AzuosActionButton
      data={{ label: 'Guardar', loadingLabel: 'Guardando…' }}
      ui={{ icon: Save, size: 'lg' }}
      state={{ isLoading: studioState.isSaving }}
      actions={{ onClick: actions.onSave }}
    />
  {/snippet}

  <!-- Duas colunas da altura da tela, cada uma rolando sozinha: o tabuleiro rola e a paleta de
       blocos fica PARADA e inteira ao lado. No celular, uma embaixo da outra. -->
  <div class="grid min-h-full lg:h-full lg:grid-cols-[minmax(0,1fr)_21rem]">
    <section aria-label="O painel" class="bg-mantle min-w-0 p-6 lg:min-h-0 lg:overflow-y-auto">
      {#if studioState.error}
        <p role="alert" class="rounded-box bg-card text-destructive mb-4 p-3 text-sm">{studioState.error}</p>
      {/if}
      <!-- Os filtros do painel montam aqui mesmo, no alto: é onde quem vê vai encontrá-los. -->
      <div class="mb-6">
        <AzuosBoardFilterBar
          data={{ filters: data.boardFilters, values: data.filterValues, counts: data.filterCounts }}
          state={{ isEditing: true }}
          actions={{
            onChange: actions.onFilterValueChange,
            onAdd: actions.onAddBoardFilter,
            onRemove: actions.onRemoveBoardFilter,
            onDisplayChange: actions.onBoardFilterDisplayChange,
            onPlaceChange: actions.onBoardFilterPlaceChange,
            onClear: actions.onClearFilterValues,
          }}
        />
      </div>
      <AzuosBoardCanvas
        data={{
          widgets: data.widgets,
          layout: data.layout,
          results: data.results,
          filterNames: data.filterNames,
          boardPeriod: data.filterValues.period,
        }}
        state={{ isEditing: true, canDrop: studioState.canAdd }}
        actions={{
          onLayoutChange: actions.onLayoutChange,
          onEditWidget: actions.onEditWidget,
          onRemoveWidget: actions.onRemoveWidget,
          onChangeKind: actions.onChangeKind,
          onDropKind: actions.onNewWidget,
        }}
      />
    </section>
    <!-- A lateral fica parada enquanto o painel rola, com a rolagem própria dos tipos. -->
    <aside class="border-border bg-card flex flex-col gap-5 border-l p-5 lg:min-h-0 lg:overflow-y-auto">
      <AzuosActionButton
        data={{ label: 'Montar filtros' }}
        ui={{ variant: 'secondary', size: 'lg', icon: ListFilter }}
        actions={{ onClick: actions.onOpenFilters }}
      />
      <div>
        <h3 class="text-ink-900 flex items-center gap-2 text-sm font-bold">
          <LayoutDashboard class="size-4" aria-hidden="true" />
          Blocos
          <span class="rounded-chip bg-muted text-ink-700 ml-auto px-2 py-0.5 text-xs font-medium">
            {data.weight} de {MAX_BOARD_WEIGHT} pontos
          </span>
        </h3>
        <p class="text-ink-500 mt-0.5 text-xs">{paletteHint(left)}</p>
        <!-- Os seis mais usados à frente e os outros abaixo (Lei de Hick). Cada um arrasta até a
             grade — ou, com um clique (ou Enter), entra embaixo de tudo. -->
        {@render kindGroup('Mais usados', MAIN_KINDS)}
        {@render kindGroup('Outros', OTHER_KINDS)}
      </div>
    </aside>
  </div>
</AzuosExpandableScreen>
