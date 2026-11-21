<script lang="ts" module>
  import {
    DATA_SOURCES,
    type LayoutItem,
    type Widget,
    WIDGET_PERIOD_LABELS,
    weightLabel,
    widgetWeight,
  } from '@template/shared/schemas/dashboard-board.schema';

  import { type WidgetState } from '$lib/hooks/use-dashboard-board/use-dashboard-board.svelte';

  /**
   * O CANVAS DO PAINEL — a grade de 4 colunas com os blocos. Vendo, só mostra. Montando, cada
   * bloco ganha a alça de mover (arrastar, ou as setas do teclado), o canto de redimensionar e os
   * botões de editar e tirar. Quem decide onde cada bloco fica são as regras puras
   * (`board-layout.util`); o canvas só mede o ponteiro e avisa a tela no fim do gesto.
   *
   * No celular os blocos se empilham, um embaixo do outro, na ordem da grade.
   */
  export type AzuosBoardCanvasProps = {
    data: {
      widgets: Widget[];
      layout: LayoutItem[];
      results: Record<string, WidgetState>;
      /** O nome de cada filtro salvo, pelo id — a linha pequena do bloco. */
      filterNames?: Record<string, string>;
      /** A nota do "Período" do painel, por fonte ("Recorte pela abertura"). */
      periodNotes?: Record<string, string | null>;
    };
    state: { isEditing: boolean };
    actions: {
      onLayoutChange: (layout: LayoutItem[]) => void;
      onEditWidget: (id: string) => void;
      onRemoveWidget: (id: string) => void;
    };
  };

  /** A altura de um andar da grade e o espaço entre as casas, em pixels. */
  export const ROW_HEIGHT = 160;
  export const GRID_GAP = 16;
  /** A largura do canvas a partir da qual os blocos ficam na grade de 4 colunas. */
  export const WIDE_CANVAS = 720;

  /** A linha pequena embaixo do título: o período, o filtro, "só os meus" e o peso (montando). */
  export function hintOf(
    widget: Widget,
    filterNames: Record<string, string> = {},
    periodNote: string | null = null,
    isEditing = false,
  ): string | null {
    const parts = [
      periodNote ?? periodLabelOf(widget),
      filterLabelOf(widget, filterNames),
      widget.onlyMine ? 'Só os meus' : null,
      isEditing ? weightLabel(widgetWeight(widget)) : null,
    ].filter((part): part is string => Boolean(part));

    return parts.length > 0 ? parts.join(' · ') : null;
  }

  function periodLabelOf(widget: Widget): string | null {
    return widget.period === 'all' ? null : WIDGET_PERIOD_LABELS[widget.period];
  }

  function filterLabelOf(widget: Widget, filterNames: Record<string, string>): string | null {
    if (!widget.filterId) return null;

    return filterNames[widget.filterId] ?? 'Filtro salvo';
  }
</script>

<script lang="ts">
  import GripVertical from '@lucide/svelte/icons/grip-vertical';
  import MoveDiagonal2 from '@lucide/svelte/icons/move-diagonal-2';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  import BoardWidget from '$lib/components/azuos-board-widget/azuos-board-widget.svelte';
  import { cellAt, isCompactKind, moveItem, resizeItem, rowsOf } from '$lib/utils/board-layout.util';

  let { data, state: canvasState, actions }: AzuosBoardCanvasProps = $props();

  let width = $state(0);
  let container = $state<HTMLElement | null>(null);
  /* O gesto em andamento: a grade como ela fica se a pessoa soltar agora. Visual, e só. */
  let gesture = $state<{ id: string; kind: 'move' | 'resize'; layout: LayoutItem[] } | null>(null);

  const layout = $derived(gesture?.layout ?? data.layout);
  const cellWidth = $derived(Math.max(1, (width - GRID_GAP * 3) / 4));
  /* A grade de 4 colunas só a partir de uma largura em que cada casa ainda lê um gráfico; antes
     disso, os blocos se empilham. É a largura do PRÓPRIO canvas, e não da janela. */
  const isWide = $derived(width >= WIDE_CANVAS);
  const ordered = $derived(
    [...data.widgets].sort((a, b) => {
      const one = layout.find((item) => item.i === a.id);
      const other = layout.find((item) => item.i === b.id);

      return (one?.y ?? 0) - (other?.y ?? 0) || (one?.x ?? 0) - (other?.x ?? 0);
    }),
  );

  function placeOf(id: string): LayoutItem {
    return layout.find((item) => item.i === id) ?? { i: id, x: 0, y: rowsOf(layout), w: 2, h: 2 };
  }

  function pointerIn(event: PointerEvent): { x: number; y: number } {
    const rect = container?.getBoundingClientRect();

    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
  }

  function startGesture(event: PointerEvent, widget: Widget, kind: 'move' | 'resize') {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    gesture = { id: widget.id, kind, layout: data.layout };
  }

  function followGesture(event: PointerEvent, widget: Widget) {
    if (!gesture || gesture.id !== widget.id) return;
    const point = pointerIn(event);
    const cell = { width: cellWidth, height: ROW_HEIGHT, gap: GRID_GAP };
    if (gesture.kind === 'move') {
      const target = cellAt(point, cell);
      gesture = { ...gesture, layout: moveItem(data.layout, widget.id, target.x, target.y) };
      return;
    }
    const item = placeOf(widget.id);
    const w = Math.ceil((point.x - item.x * (cellWidth + GRID_GAP)) / (cellWidth + GRID_GAP));
    const h = Math.ceil((point.y - item.y * (ROW_HEIGHT + GRID_GAP)) / (ROW_HEIGHT + GRID_GAP));
    gesture = { ...gesture, layout: resizeItem(data.layout, widget.id, w, h, isCompactKind(widget.kind)) };
  }

  function endGesture(widget: Widget) {
    if (!gesture || gesture.id !== widget.id) return;
    const next = gesture.layout;
    gesture = null;
    actions.onLayoutChange(next);
  }

  /* Sem mouse: as setas movem o bloco uma casa; com Shift, mudam o tamanho. */
  const STEPS: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  };

  function onHandleKey(event: KeyboardEvent, widget: Widget) {
    const step = STEPS[event.key];
    if (!step) return;
    event.preventDefault();
    const item = placeOf(widget.id);
    actions.onLayoutChange(
      event.shiftKey
        ? resizeItem(data.layout, widget.id, item.w + step[0], item.h + step[1], isCompactKind(widget.kind))
        : moveItem(data.layout, widget.id, item.x + step[0], item.y + step[1]),
    );
  }
</script>

<div
  bind:this={container}
  bind:clientWidth={width}
  class={isWide ? 'grid grid-cols-4 gap-4' : 'grid grid-cols-1 gap-4'}
  style:grid-auto-rows={`${ROW_HEIGHT}px`}
  data-testid="board-canvas"
>
  {#each ordered as widget (widget.id)}
    {@const place = placeOf(widget.id)}
    <div
      class="relative min-w-0"
      style:grid-column={isWide ? `${place.x + 1} / span ${place.w}` : undefined}
      style:grid-row={isWide ? `${place.y + 1} / span ${place.h}` : `span ${place.h}`}
      data-widget-id={widget.id}
    >
      <BoardWidget
        data={{
          widget,
          result: data.results[widget.id] ?? null,
          noun: DATA_SOURCES[widget.source].noun,
          hint: hintOf(widget, data.filterNames, data.periodNotes?.[widget.source] ?? null, canvasState.isEditing),
        }}
        ui={{ className: 'h-full' }}
      >
        {#snippet tools()}
          {#if canvasState.isEditing}
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="text-ink-500 hover:bg-muted rounded-control control-icon-sm flex cursor-grab touch-none items-center justify-center"
                aria-label={`Mover o bloco ${widget.title} (setas do teclado; com Shift, muda o tamanho)`}
                onpointerdown={(event) => startGesture(event, widget, 'move')}
                onpointermove={(event) => followGesture(event, widget)}
                onpointerup={() => endGesture(widget)}
                onkeydown={(event) => onHandleKey(event, widget)}
              >
                <GripVertical class="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="text-ink-500 hover:bg-muted rounded-control control-icon-sm flex items-center justify-center"
                aria-label={`Editar o bloco ${widget.title}`}
                onclick={() => actions.onEditWidget(widget.id)}
              >
                <Pencil class="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="text-destructive hover:bg-muted rounded-control control-icon-sm flex items-center justify-center"
                aria-label={`Tirar o bloco ${widget.title}`}
                onclick={() => actions.onRemoveWidget(widget.id)}
              >
                <Trash2 class="size-4" aria-hidden="true" />
              </button>
            </div>
          {/if}
        {/snippet}
      </BoardWidget>
      {#if canvasState.isEditing && isWide}
        <button
          type="button"
          class="text-ink-500 bg-muted rounded-control absolute right-1 bottom-1 flex size-6 cursor-se-resize touch-none items-center justify-center border border-transparent"
          aria-label={`Redimensionar o bloco ${widget.title}`}
          onpointerdown={(event) => startGesture(event, widget, 'resize')}
          onpointermove={(event) => followGesture(event, widget)}
          onpointerup={() => endGesture(widget)}
        >
          <MoveDiagonal2 class="size-3.5" aria-hidden="true" />
        </button>
      {/if}
    </div>
  {/each}
</div>
