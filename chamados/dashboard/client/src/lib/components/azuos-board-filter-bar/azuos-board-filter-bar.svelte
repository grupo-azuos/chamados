<script lang="ts" module>
  import {
    type BoardFilter,
    type BoardFilterDisplay,
    type BoardFilterKind,
    type BoardFilterValues,
  } from '@template/shared/schemas/dashboard-board.schema';

  import { type FilterCounts } from '$lib/hooks/use-dashboard-board/use-dashboard-board.svelte';
  import { type BoardFilterPlaceChange } from '$lib/utils/board-draft.util';

  /**
   * OS FILTROS DO PAINEL, no estilo do Grafana — uma BARRA compacta acima dos blocos, que recorta
   * TODOS de uma vez: "Pessoa", "Situação", "Prioridade", "Departamento" à esquerda, na ordem que
   * quem montou escolheu, e o "Período" por último, como o seletor de tempo do Grafana. Cada
   * filtro é uma peça só ("Situação | Todos ▾"), num cartão, em grade que se ajusta à largura.
   *
   * O valor escolhido é de quem está vendo, e não se grava.
   *
   * Montando, a barra aparece como fica e, embaixo, a lista dos filtros (como as variáveis do
   * Grafana): arrastar para ordenar, escolher o desenho, tirar; e os que faltam, para pôr.
   */
  export type AzuosBoardFilterBarProps = {
    data: {
      filters: BoardFilter[];
      values: BoardFilterValues;
      /** A conta de cada opção, pelo id do filtro — as pessoas e os departamentos. */
      counts: Record<string, FilterCounts>;
    };
    state?: { isEditing?: boolean };
    actions: {
      onChange: (patch: Partial<BoardFilterValues>) => void;
      /** "Limpar filtros": todos voltam a "todos". Sem ela, o botão não aparece. */
      onClear?: () => void;
      onAdd?: (kind: BoardFilterKind) => void;
      onRemove?: (id: string) => void;
      /** Montando: troca o desenho do filtro. */
      onDisplayChange?: (id: string, display: BoardFilterDisplay) => void;
      /** Montando: a ordem nova dos filtros na barra. */
      onPlaceChange?: (places: readonly BoardFilterPlaceChange[]) => void;
    };
  };
</script>

<script lang="ts">
  import Plus from '@lucide/svelte/icons/plus';
  import {
    BOARD_FILTER_KIND_LABELS,
    BOARD_FILTER_KINDS,
    placedBoardFilters,
  } from '@template/shared/schemas/dashboard-board.schema';

  import AzuosActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import AzuosCardSurface from '$lib/components/azuos-card-surface/azuos-card-surface.svelte';
  import AzuosClearFiltersButton from '$lib/components/azuos-clear-filters-button/azuos-clear-filters-button.svelte';
  import { activeSummary, readingOrder, toolbarDisplayOf } from '$lib/utils/board-filter.util';

  import FilterControl from './azuos-board-filter-control.svelte';
  import FilterListEditor from './azuos-board-filter-list-editor.svelte';

  let { data, state: barState, actions }: AzuosBoardFilterBarProps = $props();

  const isEditing = $derived(Boolean(barState?.isEditing));
  const active = $derived(activeSummary(data.filters, data.values, data.counts));
  const ordered = $derived(readingOrder(placedBoardFilters(data.filters)));
  /* O período vai por último, como o seletor de tempo do Grafana; o resto, na ordem. */
  const fields = $derived(ordered.filter((filter) => filter.kind !== 'period'));
  const periods = $derived(ordered.filter((filter) => filter.kind === 'period'));
  const missing = $derived(BOARD_FILTER_KINDS.filter((kind) => !data.filters.some((filter) => filter.kind === kind)));
</script>

{#snippet control(filter: BoardFilter)}
  <FilterControl
    data={{ filter, display: toolbarDisplayOf(filter), values: data.values, counts: data.counts[filter.id] ?? null }}
    actions={{ onChange: actions.onChange }}
  />
{/snippet}

{#snippet toolbar()}
  <!-- O cartão que junta os filtros numa faixa só. Dentro, uma GRADE que se ajusta à largura: cada
       peça tem no mínimo 18rem e as colunas se dividem por igual — no celular, uma por linha; numa
       tela larga, todas lado a lado, sem sobra torta no fim. O período vem por último. -->
  <AzuosCardSurface ui={{ className: 'flex flex-col gap-2 p-3 sm:flex-row sm:items-start' }}>
    <div class="grid min-w-0 flex-1 grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-2">
      {#each [...fields, ...periods] as filter (filter.id)}{@render control(filter)}{/each}
    </div>
    {#if actions.onClear && !isEditing && active.length > 0}
      <div class="flex shrink-0 items-center justify-end sm:h-10">
        <AzuosClearFiltersButton state={{ hasFilter: true }} actions={{ onClear: actions.onClear }} />
      </div>
    {/if}
  </AzuosCardSurface>
{/snippet}

{#if isEditing}
  <section aria-label="Filtros do painel" class="flex flex-col gap-4">
    {#if ordered.length > 0}
      <div class="flex flex-col gap-2">
        <span class="text-muted-foreground text-sm font-medium">Como a barra aparece</span>
        {@render toolbar()}
      </div>
      <FilterListEditor
        data={{ filters: ordered }}
        actions={{ onPlaceChange: actions.onPlaceChange, onDisplayChange: actions.onDisplayChange, onRemove: actions.onRemove }}
      />
    {/if}
    {#if actions.onAdd && missing.length > 0}
      <div class="flex flex-wrap items-center gap-2">
        {#each missing as kind (kind)}
          <AzuosActionButton
            data={{ label: BOARD_FILTER_KIND_LABELS[kind] }}
            ui={{ variant: 'secondary', icon: Plus }}
            actions={{ onClick: () => actions.onAdd?.(kind) }}
          />
        {/each}
      </div>
    {/if}
    {#if data.filters.length === 0}
      <p class="text-muted-foreground text-sm">Ponha um filtro para quem vê recortar todos os blocos de uma vez.</p>
    {/if}
  </section>
{:else if ordered.length > 0}
  <section aria-label="Filtros do painel">
    {@render toolbar()}
  </section>
{/if}
