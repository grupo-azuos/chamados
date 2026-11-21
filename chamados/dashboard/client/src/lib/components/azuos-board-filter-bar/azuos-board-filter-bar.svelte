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
   * OS FILTROS DO PAINEL — a faixa no alto do painel que recorta TODOS os blocos de uma vez:
   * "Pessoa", "Período", "Situação", "Prioridade" e "Departamento" (cada bloco só onde a fonte tem
   * o campo). O valor escolhido é de quem está vendo, e não se grava.
   *
   * Vendo, só os campos, na grade do painel. Montando, cada filtro arrasta e redimensiona como um
   * bloco, ganha o "Mostrar como" e o "Tirar", e os que faltam aparecem para pôr.
   *
   * A faixa RECOLHE: o título é o botão. Recolhida, mostra em uma linha o que está filtrado e o
   * "Limpar filtros" — quem recolheu não esquece que o painel está recortado.
   */
  export type AzuosBoardFilterBarProps = {
    data: {
      filters: BoardFilter[];
      values: BoardFilterValues;
      /** A conta de cada opção, pelo id do filtro — os cards e as pessoas e departamentos. */
      counts: Record<string, FilterCounts>;
    };
    /** `isInitiallyOpen`: a faixa nasce aberta. O padrão é recolhida — o painel aparece primeiro. */
    ui?: { isInitiallyOpen?: boolean };
    state?: { isEditing?: boolean };
    actions: {
      onChange: (patch: Partial<BoardFilterValues>) => void;
      /** "Limpar filtros": todos voltam a "todos". Sem ela, o botão não aparece. */
      onClear?: () => void;
      onAdd?: (kind: BoardFilterKind) => void;
      onRemove?: (id: string) => void;
      /** Montando: troca o componente que representa o filtro. */
      onDisplayChange?: (id: string, display: BoardFilterDisplay) => void;
      /** Montando: os filtros foram arrastados ou redimensionados na grade deles. */
      onPlaceChange?: (places: readonly BoardFilterPlaceChange[]) => void;
    };
  };

  /** A casa dos filtros é a dos blocos do painel. */
  const FILTER_ROW_PX = 140;
</script>

<script lang="ts">
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Funnel from '@lucide/svelte/icons/funnel';
  import Plus from '@lucide/svelte/icons/plus';
  import {
    BOARD_FILTER_KIND_LABELS,
    BOARD_FILTER_KINDS,
    type BoardFilterPlace,
    boardFilterDisplay,
    placedBoardFilters,
  } from '@template/shared/schemas/dashboard-board.schema';
  import { untrack } from 'svelte';

  import AzuosActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import AzuosClearFiltersButton from '$lib/components/azuos-clear-filters-button/azuos-clear-filters-button.svelte';
  import { activeSummary, readingOrder } from '$lib/utils/board-filter.util';
  import { cn } from '$lib/utils/cn';

  import FilterControl from './azuos-board-filter-control.svelte';
  import FilterGridEditor from './azuos-board-filter-grid-editor.svelte';

  let { data, ui, state: barState, actions }: AzuosBoardFilterBarProps = $props();

  /* Puramente visual: a faixa aberta ou recolhida. Nasce recolhida; montando, fica sempre aberta. */
  let isOpen = $state(untrack(() => ui?.isInitiallyOpen === true));
  const isEditing = $derived(Boolean(barState?.isEditing));
  const isShown = $derived(isOpen || isEditing);
  const active = $derived(activeSummary(data.filters, data.values, data.counts));
  const placed = $derived(placedBoardFilters(data.filters));
  const missing = $derived(BOARD_FILTER_KINDS.filter((kind) => !data.filters.some((filter) => filter.kind === kind)));

  /** O lugar do filtro como coluna e linha da grade do CSS (que começam em 1). */
  function placeStyle(place: BoardFilterPlace): string {
    return `--filter-col:${place.x + 1} / span ${place.w};--filter-row:${place.y + 1} / span ${place.h}`;
  }
</script>

{#snippet filterBlock(filter: BoardFilter & { place: BoardFilterPlace })}
  {@const display = boardFilterDisplay(filter)}
  <!-- Um filtro como bloco: a moldura dos blocos do painel e o campo dele. Em "cards" (a fileira
       de números), o bloco não é card: os números já são cards, e card não vai dentro de card. -->
  <section
    aria-label={filter.label}
    class={cn(
      'flex h-full min-w-0 flex-col',
      display === 'cards' ? 'py-1' : 'rounded-surface bg-card shadow-card p-4',
      filter.place.h === 1 ? 'justify-center' : 'justify-start',
    )}
  >
    <FilterControl
      data={{ filter, display, values: data.values, counts: data.counts[filter.id] ?? null, rows: filter.place.h }}
      actions={{ onChange: actions.onChange }}
    />
  </section>
{/snippet}

{#if data.filters.length > 0 || isEditing}
  <!-- Padrão Apple: o painel que agrupa os blocos de filtro não tem fundo próprio — os blocos são
       cards sobre o fundo da página, e card não vai dentro de card. -->
  <section aria-label="Filtros do painel" class="flex flex-col">
    <div class="flex flex-wrap items-center gap-2">
      <!-- Com cara de BOTÃO (fundo, sombra e hover), como o "Filtros" das listas. -->
      <button
        type="button"
        aria-expanded={isShown}
        disabled={isEditing}
        onclick={() => (isOpen = !isOpen)}
        class="control-lg rounded-button bg-card text-foreground shadow-card hover:bg-muted focus-visible:ring-ring/50 disabled:hover:bg-card flex cursor-pointer items-center gap-2 px-4 text-sm font-semibold focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-default"
      >
        <Funnel class="size-4" aria-hidden="true" />
        Filtros
        {#if active.length > 0}
          <span class="rounded-chip bg-primary text-primary-foreground px-1.5 text-xs">{active.length}</span>
        {/if}
        {#if !isEditing}
          <ChevronDown
            aria-hidden="true"
            class={cn('size-4 transition-transform duration-300', isShown && 'rotate-180')}
          />
        {/if}
      </button>
      {#if !isShown}
        {#if active.length === 0}
          <span class="text-muted-foreground text-sm">Nenhum filtro escolhido</span>
        {:else}
          <ul class="flex min-w-0 flex-wrap gap-1.5" aria-label="Filtros escolhidos">
            {#each active as item (item.label)}
              <li class="rounded-chip bg-muted text-foreground px-2 py-0.5 text-xs">
                <span class="text-muted-foreground">{item.label}:</span> {item.value}
              </li>
            {/each}
          </ul>
        {/if}
      {/if}
      {#if actions.onClear}
        <AzuosClearFiltersButton ui={{ className: 'ml-auto' }} state={{ hasFilter: active.length > 0 }} actions={{ onClear: actions.onClear }} />
      {/if}
    </div>

    <!-- Abre e fecha deslizando: a linha da grade vai de 0 à altura do conteúdo. -->
    <div
      class={cn(
        'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
        isShown ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
    >
      <!-- O recorte da animação passa 16px para os lados e tem folga embaixo: sem isso, ele
           cortava a sombra dos cards nas bordas e embaixo. -->
      <div class="-mx-4 min-h-0 overflow-hidden px-4" inert={!isShown}>
        <div class="flex flex-col gap-3 pt-3 pb-4">
          {#if placed.length > 0}
            {#if isEditing}
              <FilterGridEditor
                data={{ filters: placed }}
                actions={{ onPlaceChange: actions.onPlaceChange, onDisplayChange: actions.onDisplayChange, onRemove: actions.onRemove }}
                block={filterBlock}
              />
            {:else}
              <!-- VENDO: os filtros na grade do painel — as mesmas 4 colunas e as mesmas casas de
                   140px dos blocos. Em tela estreita, uma coluna só. A casa tem 140px NO MÍNIMO:
                   muitas pessoas em duas fileiras fazem a linha crescer, em vez de rolar. -->
              <div class="grid grid-cols-1 gap-4 lg:grid-cols-4" style:grid-auto-rows={`minmax(${FILTER_ROW_PX}px, auto)`}>
                {#each readingOrder(placed) as filter (filter.id)}
                  <div class="min-w-0 lg:[grid-column:var(--filter-col)] lg:[grid-row:var(--filter-row)]" style={placeStyle(filter.place)}>
                    {@render filterBlock(filter)}
                  </div>
                {/each}
              </div>
            {/if}
          {/if}
          {#if isEditing && actions.onAdd}
            <!-- Montando: os filtros que ainda faltam, numa faixa própria embaixo. -->
            <div class="border-border flex flex-wrap items-center gap-2 border-t pt-3">
              {#each missing as kind (kind)}
                <AzuosActionButton
                  data={{ label: BOARD_FILTER_KIND_LABELS[kind] }}
                  ui={{ variant: 'secondary', icon: Plus, size: 'lg' }}
                  actions={{ onClick: () => actions.onAdd?.(kind) }}
                />
              {/each}
              {#if data.filters.length === 0}
                <p class="text-ink-500 text-xs">Ponha um filtro para quem vê recortar todos os blocos de uma vez.</p>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </section>
{/if}
