<script lang="ts" module>
  import {
    type BoardFilter,
    type BoardFilterDisplay,
    type BoardFilterPlace,
    type BoardFilterWidth,
  } from '@template/shared/schemas/dashboard-board.schema';

  import { type BoardFilterPlaceChange } from '$lib/utils/board-draft.util';

  /**
   * MONTANDO OS FILTROS, como as variáveis do Grafana: uma lista, na ordem em que aparecem na
   * barra. Cada linha arrasta (ou sobe e desce pelas setas, no teclado), escolhe o desenho e sai.
   * A ordem volta em `onPlaceChange`, gravada como a ordem de leitura da grade; o "Guardar" grava.
   */
  export type AzuosBoardFilterListEditorProps = {
    data: { filters: (BoardFilter & { place: BoardFilterPlace })[] };
    actions: {
      onPlaceChange?: (places: readonly BoardFilterPlaceChange[]) => void;
      onDisplayChange?: (id: string, display: BoardFilterDisplay) => void;
      onWidthChange?: (id: string, width: BoardFilterWidth) => void;
      onRemove?: (id: string) => void;
    };
  };
</script>

<script lang="ts">
  import ArrowDown from '@lucide/svelte/icons/arrow-down';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import GripVertical from '@lucide/svelte/icons/grip-vertical';
  import X from '@lucide/svelte/icons/x';
  import {
    BOARD_FILTER_DISPLAY_LABELS,
    BOARD_FILTER_KIND_LABELS,
    BOARD_FILTER_WIDTH_LABELS,
    BOARD_FILTER_WIDTHS,
    FILTER_GRID_COLUMNS,
  } from '@template/shared/schemas/dashboard-board.schema';

  import AzuosActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import AzuosSelectField from '$lib/components/azuos-select-field/azuos-select-field.svelte';
  import { moveInList, placesInOrder, toolbarDisplayOf, toolbarDisplaysOf } from '$lib/utils/board-filter.util';
  import { cn } from '$lib/utils/cn';

  let { data, actions }: AzuosBoardFilterListEditorProps = $props();

  /* Puramente visual: a linha que está sendo arrastada e a linha por cima da qual ela passa. */
  let dragged = $state<number | null>(null);
  let over = $state<number | null>(null);

  function move(from: number, to: number) {
    const ids = moveInList(
      data.filters.map((filter) => filter.id),
      from,
      to,
    );
    actions.onPlaceChange?.(placesInOrder(ids, FILTER_GRID_COLUMNS));
  }

  function drop(index: number) {
    if (dragged !== null) move(dragged, index);
    dragged = null;
    over = null;
  }

  const WIDTH_OPTIONS = BOARD_FILTER_WIDTHS.map((width) => ({ value: width, label: BOARD_FILTER_WIDTH_LABELS[width] }));

  function displayOptionsOf(filter: BoardFilter) {
    return toolbarDisplaysOf(filter.kind).map((display) => ({ value: display, label: BOARD_FILTER_DISPLAY_LABELS[display] }));
  }
</script>

<ol class="flex flex-col gap-2" aria-label="Os filtros do painel, na ordem da barra">
  {#each data.filters as filter, index (filter.id)}
    <li
      draggable="true"
      ondragstart={(event) => {
        dragged = index;
        event.dataTransfer?.setData('text/plain', filter.id);
      }}
      ondragover={(event) => {
        event.preventDefault();
        over = index;
      }}
      ondragleave={() => (over = over === index ? null : over)}
      ondrop={(event) => {
        event.preventDefault();
        drop(index);
      }}
      ondragend={() => {
        dragged = null;
        over = null;
      }}
      class={cn(
        'rounded-control bg-card shadow-card flex flex-wrap items-center gap-2 p-2 transition-opacity',
        dragged === index && 'opacity-50',
        over === index && dragged !== index && 'bg-accent',
      )}
    >
      <GripVertical class="text-muted-foreground size-4 shrink-0 cursor-grab" aria-hidden="true" />
      <span class="flex min-w-0 flex-1 flex-col">
        <span class="text-foreground truncate text-sm font-semibold">{filter.label}</span>
        <span class="text-muted-foreground text-xs">{BOARD_FILTER_KIND_LABELS[filter.kind]}</span>
      </span>
      {#if actions.onDisplayChange}
        <AzuosSelectField
          data={{ value: toolbarDisplayOf(filter), options: displayOptionsOf(filter) }}
          ui={{ ariaLabel: `Mostrar ${filter.label} como`, className: 'w-40' }}
          actions={{ onChange: (display) => actions.onDisplayChange?.(filter.id, display as BoardFilterDisplay) }}
        />
      {/if}
      {#if actions.onWidthChange}
        <AzuosSelectField
          data={{ value: filter.width ?? 'auto', options: WIDTH_OPTIONS }}
          ui={{ ariaLabel: `Largura de ${filter.label}`, className: 'w-40' }}
          actions={{ onChange: (width) => actions.onWidthChange?.(filter.id, width as BoardFilterWidth) }}
        />
      {/if}
      <AzuosActionButton
        data={{ label: `Subir o filtro ${filter.label}` }}
        ui={{ variant: 'ghost', icon: ArrowUp, isIconOnly: true }}
        state={{ isDisabled: index === 0 }}
        actions={{ onClick: () => move(index, index - 1) }}
      />
      <AzuosActionButton
        data={{ label: `Descer o filtro ${filter.label}` }}
        ui={{ variant: 'ghost', icon: ArrowDown, isIconOnly: true }}
        state={{ isDisabled: index === data.filters.length - 1 }}
        actions={{ onClick: () => move(index, index + 1) }}
      />
      {#if actions.onRemove}
        <AzuosActionButton
          data={{ label: `Tirar o filtro ${filter.label}` }}
          ui={{ variant: 'ghost', icon: X, isIconOnly: true }}
          actions={{ onClick: () => actions.onRemove?.(filter.id) }}
        />
      {/if}
    </li>
  {/each}
</ol>
