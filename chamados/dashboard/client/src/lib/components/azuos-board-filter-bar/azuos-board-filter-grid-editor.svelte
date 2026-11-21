<script lang="ts" module>
  import {
    type BoardFilter,
    type BoardFilterDisplay,
    type BoardFilterPlace,
  } from '@template/shared/schemas/dashboard-board.schema';
  import { type Snippet } from 'svelte';

  import { type BoardFilterPlaceChange } from '$lib/utils/board-draft.util';

  /**
   * MONTANDO: os filtros na mesma grade dos blocos, com o arrastar e os puxadores deles. O filtro
   * tem o MESMO tamanho vendo e montando; as ferramentas (a alça, o "Mostrar como" e o "Tirar")
   * ficam numa faixa logo acima dele, no espaço entre as casas, e não por cima do campo. Cada
   * mudança volta em `onPlaceChange`; o "Guardar" grava.
   */
  export type AzuosBoardFilterGridEditorProps = {
    data: { filters: (BoardFilter & { place: BoardFilterPlace })[] };
    actions: {
      onPlaceChange?: (places: readonly BoardFilterPlaceChange[]) => void;
      onDisplayChange?: (id: string, display: BoardFilterDisplay) => void;
      onRemove?: (id: string) => void;
    };
    block: Snippet<[BoardFilter & { place: BoardFilterPlace }]>;
  };

  /** A casa dos filtros é a dos blocos do painel. */
  const ROW_PX = 140;
  /** O espaço entre as colunas montando: o mesmo dos blocos (o tracejado e os puxadores). */
  const COLUMN_GAP_PX = 32;
  /**
   * O espaço vertical entre os filtros montando: a faixa de ferramentas (28px, a 44px do topo do
   * filtro) mais a folga dos puxadores do filtro de cima (11px) e do contorno tracejado.
   */
  const TOOLS_GAP_PX = 60;
  /** Quanto os puxadores (11px) e o tracejado (4px) passam da borda do filtro, com folga. */
  const HANDLES_GAP_PX = 16;
</script>

<script lang="ts">
  import GripVertical from '@lucide/svelte/icons/grip-vertical';
  import X from '@lucide/svelte/icons/x';
  import {
    BOARD_FILTER_DISPLAY_LABELS,
    boardFilterDisplay,
    boardFilterDisplaysOf,
    FILTER_GRID_COLUMNS,
    FILTER_GRID_MAX_ROWS,
    type LayoutItem,
  } from '@template/shared/schemas/dashboard-board.schema';

  import AzuosActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import AzuosSelectField from '$lib/components/azuos-select-field/azuos-select-field.svelte';
  import {
    moveItem,
    RESIZE_HANDLES,
    type ResizeHandle,
    resizeFromHandle,
    resizeItem,
    rowsOf,
  } from '$lib/utils/board-layout.util';
  import { cn } from '$lib/utils/cn';

  let { data, actions, block }: AzuosBoardFilterGridEditorProps = $props();

  let width = $state(0);
  let container = $state<HTMLElement | null>(null);
  let gesture = $state<{ id: string; handle: ResizeHandle | null; offset: { x: number; y: number }; layout: LayoutItem[] } | null>(null);

  const saved = $derived<LayoutItem[]>(data.filters.map((filter) => ({ i: filter.id, ...filter.place })));
  const layout = $derived(gesture?.layout ?? saved);
  const inner = $derived(Math.max(0, width - HANDLES_GAP_PX * 2));
  const cellWidth = $derived(Math.max(1, (inner - COLUMN_GAP_PX * (FILTER_GRID_COLUMNS - 1)) / FILTER_GRID_COLUMNS));
  const height = $derived(rowsOf(layout) * (ROW_PX + TOOLS_GAP_PX) + TOOLS_GAP_PX);

  function rectOf(item: Pick<LayoutItem, 'x' | 'y' | 'w' | 'h'>) {
    return {
      left: HANDLES_GAP_PX + item.x * (cellWidth + COLUMN_GAP_PX),
      top: TOOLS_GAP_PX + item.y * (ROW_PX + TOOLS_GAP_PX),
      width: item.w * cellWidth + (item.w - 1) * COLUMN_GAP_PX,
      height: item.h * ROW_PX + (item.h - 1) * TOOLS_GAP_PX,
    };
  }

  function cellUnder(point: { x: number; y: number }) {
    return {
      x: Math.max(0, Math.min(FILTER_GRID_COLUMNS - 1, Math.floor((point.x - HANDLES_GAP_PX) / (cellWidth + COLUMN_GAP_PX)))),
      y: Math.max(0, Math.floor((point.y - TOOLS_GAP_PX) / (ROW_PX + TOOLS_GAP_PX))),
    };
  }

  function pointerIn(event: PointerEvent) {
    const rect = container?.getBoundingClientRect();

    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
  }

  function start(event: PointerEvent, id: string, handle: ResizeHandle | null) {
    if (event.button !== 0) return;
    event.preventDefault();
    const point = pointerIn(event);
    const item = saved.find((candidate) => candidate.i === id);
    if (!item) return;
    const rect = rectOf(item);
    gesture = { id, handle, offset: { x: point.x - rect.left, y: point.y - rect.top }, layout: saved };
    window.addEventListener('pointermove', follow);
    window.addEventListener('pointerup', finish, { once: true });
  }

  function follow(event: PointerEvent) {
    if (!gesture) return;
    const point = pointerIn(event);
    const item = saved.find((candidate) => candidate.i === gesture?.id);
    if (!item) return;
    if (gesture.handle) {
      const next = resizeFromHandle(item, gesture.handle, cellUnder(point));
      const moved = moveItem(saved, item.i, next.x, next.y);
      gesture = { ...gesture, layout: resizeItem(moved, item.i, next.w, next.h, true, FILTER_GRID_MAX_ROWS) };
      return;
    }
    const target = cellUnder({ x: point.x - gesture.offset.x + cellWidth / 2, y: point.y - gesture.offset.y + ROW_PX / 2 });
    gesture = { ...gesture, layout: moveItem(saved, item.i, Math.min(target.x, FILTER_GRID_COLUMNS - item.w), target.y) };
  }

  function finish() {
    window.removeEventListener('pointermove', follow);
    if (!gesture) return;
    const next = gesture.layout;
    gesture = null;
    actions.onPlaceChange?.(next.map(({ i, x, y, w, h }) => ({ id: i, place: { x, y, w, h } })));
  }

  function placeOf(id: string): LayoutItem {
    return layout.find((item) => item.i === id) ?? { i: id, x: 0, y: 0, w: 1, h: 1 };
  }

  function displayOptionsOf(filter: BoardFilter) {
    return boardFilterDisplaysOf(filter.kind).map((display) => ({ value: display, label: BOARD_FILTER_DISPLAY_LABELS[display] }));
  }
</script>

<div bind:this={container} bind:clientWidth={width} class="relative w-full" style:height={`${height}px`}>
  {#each data.filters as filter (filter.id)}
    {@const rect = rectOf(placeOf(filter.id))}
    <div
      class={cn(
        'outline-ink-500 hover:outline-ink-900 absolute outline-2 outline-offset-4 outline-dashed',
        gesture?.id !== filter.id && 'transition-[left,top,width,height] duration-200 ease-out',
        gesture?.id === filter.id && 'z-20',
      )}
      style={`left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px`}
    >
      <!-- As ferramentas do filtro, numa faixa acima do bloco, como a barra dos blocos. -->
      <div class="absolute -top-11 right-0 left-0 z-10 flex h-7 items-center gap-1">
        <button
          type="button"
          aria-label={`Arrastar o filtro ${filter.label}`}
          onpointerdown={(event) => start(event, filter.id, null)}
          class="rounded-control text-ink-700 focus-visible:ring-ring/50 flex h-8 min-w-0 flex-1 cursor-grab touch-none items-center gap-1.5 px-1 text-xs font-semibold focus-visible:ring-[3px] focus-visible:outline-none active:cursor-grabbing"
        >
          <GripVertical class="text-primary size-4 shrink-0" aria-hidden="true" />
          <span class="truncate">{filter.label}</span>
        </button>
        <span class="flex shrink-0 items-center gap-1">
          {#if actions.onDisplayChange}
            <AzuosSelectField
              data={{ value: boardFilterDisplay(filter), options: displayOptionsOf(filter) }}
              ui={{ ariaLabel: `Mostrar ${filter.label} como`, className: 'control-sm w-36 min-w-32 text-xs' }}
              actions={{ onChange: (display) => actions.onDisplayChange?.(filter.id, display as BoardFilterDisplay) }}
            />
          {/if}
          {#if actions.onRemove}
            <AzuosActionButton
              data={{ label: `Tirar o filtro ${filter.label}` }}
              ui={{ variant: 'ghost', icon: X, isIconOnly: true, size: 'sm' }}
              actions={{ onClick: () => actions.onRemove?.(filter.id) }}
            />
          {/if}
        </span>
      </div>
      {@render block(filter)}
      {#each RESIZE_HANDLES as handle (handle)}
        <button
          type="button"
          tabindex="-1"
          aria-label={`Redimensionar o filtro ${filter.label} pelo puxador ${handle}`}
          onpointerdown={(event) => start(event, filter.id, handle)}
          class={cn(
            'rounded-chip border-ink-900 bg-card absolute z-10 size-3.5 touch-none border-2',
            handle === 'n' && '-top-[11px] left-[calc(50%-7px)] cursor-ns-resize',
            handle === 's' && '-bottom-[11px] left-[calc(50%-7px)] cursor-ns-resize',
            handle === 'e' && 'top-[calc(50%-7px)] -right-[11px] cursor-ew-resize',
            handle === 'w' && 'top-[calc(50%-7px)] -left-[11px] cursor-ew-resize',
            handle === 'ne' && '-top-[11px] -right-[11px] cursor-nesw-resize',
            handle === 'sw' && '-bottom-[11px] -left-[11px] cursor-nesw-resize',
            handle === 'nw' && '-top-[11px] -left-[11px] cursor-nwse-resize',
            handle === 'se' && '-right-[11px] -bottom-[11px] cursor-nwse-resize',
          )}
        ></button>
      {/each}
    </div>
  {/each}
</div>
