<!--
  @component
  OS FILTROS DO PAINEL, no estilo do Grafana — uma BARRA compacta acima dos blocos, que recorta
  TODOS de uma vez, na ordem que quem montou escolheu — o Período inclusive. Cada
  filtro é uma peça só ("Situação | Todos ▾"), num cartão, em grade que se ajusta à largura.

  O valor escolhido é de quem está vendo, e não se grava. A faixa abre e fecha pela seta dos
  "Filtros", no cabeçalho do cartão, com o "Limpar filtros" na outra ponta; nasce aberta.

  Montando, a barra aparece como fica e, embaixo, a lista dos filtros (como as variáveis do
  Grafana): arrastar para ordenar, escolher o desenho, tirar; e os que faltam, para pôr. A
  lista nasce FECHADA: aberta, uma linha por filtro empurrava a grade dos blocos para baixo.

  - `data`: os filtros, os valores escolhidos, a conta de cada opção e os filtros que o módulo
    aceita.
  - `ui`: `part` — só o Período (`period`), só os outros (`fields`) ou todos.
  - `state`: montando, `isListOpen` (a lista dos filtros já nasce aberta) e `isOpen` (a faixa
    dos filtros nasce aberta — o padrão — ou fechada, a escolha lembrada).
  - `actions`: mudar o valor, limpar, abrir e fechar a faixa e, montando, pôr, tirar, trocar o
    desenho, a largura e a ordem.
-->
<script lang="ts" module>
  import {
    type BoardFilter,
    type BoardFilterDisplay,
    type BoardFilterKind,
    type BoardFilterValues,
    type BoardFilterWidth,
  } from '@template/shared/schemas/dashboard-board.schema';

  import { type FilterCounts } from '$lib/hooks/use-dashboard-board/use-dashboard-board.svelte';
  import { type BoardFilterPlaceChange } from '$lib/utils/board-draft.util';

  export type AzuosBoardFilterBarProps = {
    data: {
      filters: BoardFilter[];
      values: BoardFilterValues;
      /** A conta de cada opção, pelo id do filtro — as pessoas e os departamentos. */
      counts: Record<string, FilterCounts>;
      /** Os filtros que o módulo aceita, para pôr. Sem a lista, todos. */
      kinds?: readonly BoardFilterKind[];
    };
    /**
     * `part`: qual pedaço da barra desenhar. `period` é o seletor de tempo do Grafana, no canto de
     * cima do painel; `fields` são os outros filtros, na faixa acima dos blocos. Sem ele, todos.
     */
    ui?: { part?: 'fields' | 'period' };
    /**
     * `isListOpen`: montando, a lista dos filtros já nasce aberta (nas configurações do painel).
     * `isOpen`: a faixa dos filtros nasce aberta (o padrão) ou fechada — a escolha lembrada.
     */
    state?: { isEditing?: boolean; isListOpen?: boolean; isOpen?: boolean };
    actions: {
      onChange: (patch: Partial<BoardFilterValues>) => void;
      /** "Limpar filtros": todos voltam a "todos". Sem ela, o botão não aparece. */
      onClear?: () => void;
      /** A seta dos "Filtros" abriu ou fechou a faixa — para a tela lembrar. */
      onOpenChange?: (isOpen: boolean) => void;
      onAdd?: (kind: BoardFilterKind) => void;
      onRemove?: (id: string) => void;
      /** Montando: troca o desenho do filtro. */
      onDisplayChange?: (id: string, display: BoardFilterDisplay) => void;
      /** Montando: o filtro numa peça ou na linha inteira. */
      onWidthChange?: (id: string, width: BoardFilterWidth) => void;
      /** Montando: a ordem nova dos filtros na barra. */
      onPlaceChange?: (places: readonly BoardFilterPlaceChange[]) => void;
    };
  };

  /** O selo do cabeçalho: quantos filtros estão ligados; sem nenhum, selo nenhum. */
  export function activeBadge(count: number): string | undefined {
    if (count === 0) return undefined;

    return count === 1 ? '1 ativo' : `${count} ativos`;
  }
</script>

<script lang="ts">
  import Plus from '@lucide/svelte/icons/plus';
  import {
    BOARD_FILTER_KIND_LABELS,
    BOARD_FILTER_KINDS,
    placedBoardFilters,
  } from '@template/shared/schemas/dashboard-board.schema';

  import AzuosActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ContentCard from '$lib/components/azuos-content-card/azuos-content-card.svelte';
  import AzuosCollapsible from '$lib/components/azuos-collapsible/azuos-collapsible.svelte';
  import AzuosClearFiltersButton from '$lib/components/azuos-clear-filters-button/azuos-clear-filters-button.svelte';
  import { cn } from '$lib/utils/cn';
  import { activeSummary, readingOrder, toolbarDisplayOf } from '$lib/utils/board-filter.util';

  import FilterControl from './azuos-board-filter-control.svelte';
  import FilterListEditor from './azuos-board-filter-list-editor.svelte';

  let { data, ui, state: barState, actions }: AzuosBoardFilterBarProps = $props();

  const isEditing = $derived(Boolean(barState?.isEditing));
  const active = $derived(activeSummary(data.filters, data.values, data.counts));
  const ordered = $derived(
    readingOrder(placedBoardFilters(data.filters)).filter((filter) => {
      if (ui?.part === 'period') return filter.kind === 'period';
      if (ui?.part === 'fields') return filter.kind !== 'period';

      return true;
    }),
  );
  const missing = $derived((data.kinds ?? BOARD_FILTER_KINDS).filter((kind) => !data.filters.some((filter) => filter.kind === kind)));
</script>

{#snippet control(filter: BoardFilter)}
  <FilterControl
    data={{ filter, display: toolbarDisplayOf(filter), values: data.values, counts: data.counts[filter.id] ?? null }}
    actions={{ onChange: actions.onChange }}
  />
{/snippet}

{#snippet toolbar()}
  <!-- O cartão que junta os filtros numa faixa só. No alto, o cabeçalho: "Filtros" com a seta, que
       abre e fecha a faixa, e o selo de quantos estão ligados — fechada, a pessoa ainda sabe que o
       painel está recortado; na outra ponta, o "Limpar filtros". Ele mora no cabeçalho, e não na
       grade: como célula, empurrava as peças e quebrava a faixa dos cards.

       Dentro, uma GRADE que se ajusta à largura: cada peça tem no mínimo 18rem e as colunas se
       dividem por igual — no celular, uma por linha; numa tela larga, todas lado a lado, sem sobra
       torta no fim. A ordem é a da lista de quem montou. O bloco que abre e fecha é transparente:
       o cartão é a superfície (card dentro de card não). -->
  <ContentCard data={{ label: '', title: '' }}>
{#snippet body()}
<div class="">
    <AzuosCollapsible
      data={{ title: 'Filtros', badge: activeBadge(active.length) }}
      ui={{ className: 'rounded-none bg-transparent shadow-none' }}
      state={{ isOpen: barState?.isOpen ?? true }}
      actions={{ onOpenChange: actions.onOpenChange }}
    >
      {#snippet aside()}
        {#if actions.onClear && !isEditing && active.length > 0}
          <AzuosClearFiltersButton state={{ hasFilter: true }} actions={{ onClear: () => actions.onClear?.() }} />
        {/if}
      {/snippet}
      <div class="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-2">
        {#each ordered as filter (filter.id)}
          <!-- "Linha inteira" (e os cards, que são uma faixa): a peça ocupa a linha toda, sozinha. -->
          <div class={cn('min-w-0', (filter.width === 'full' || toolbarDisplayOf(filter) === 'cards') && 'col-span-full')}>{@render control(filter)}</div>
        {/each}
      </div>
    </AzuosCollapsible>
  </div>
{/snippet}
</ContentCard>
{/snippet}

{#if isEditing}
  <section aria-label="Filtros do painel" class="flex flex-col gap-4">
    {#if ordered.length > 0}
      <div class="flex flex-col gap-2">
        <span class="text-muted-foreground text-sm font-medium">Como a barra aparece</span>
        {@render toolbar()}
      </div>
    {/if}
    {#if ordered.length > 0 || (actions.onAdd && missing.length > 0)}
      <AzuosCollapsible data={{ title: `Ajustar os filtros (${ordered.length})` }} state={{ isOpen: barState?.isListOpen }}>
        <div class="flex flex-col gap-3">
          {#if ordered.length > 0}
            <FilterListEditor
              data={{ filters: ordered }}
              actions={{ onPlaceChange: actions.onPlaceChange, onDisplayChange: actions.onDisplayChange, onWidthChange: actions.onWidthChange, onRemove: actions.onRemove }}
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
        </div>
      </AzuosCollapsible>
    {/if}
    {#if data.filters.length === 0}
      <p class="text-muted-foreground text-sm">Ponha um filtro para quem vê recortar todos os blocos de uma vez.</p>
    {/if}
  </section>
{:else if ui?.part === 'period' && ordered.length > 0}
  <!-- O SELETOR DE TEMPO, no canto de cima, ao lado do "Atualizar" — sem cartão: é um controle da
       barra de cima, como no Grafana. -->
  <!-- Em "Datas exatas", as datas entram ao lado dele, na mesma fileira (a peça cresce para caber
       as duas). -->
  <div role="group" aria-label="Período do painel" class="flex flex-wrap items-start gap-2">
    {#each ordered as filter (filter.id)}
      <div class={cn('max-w-full min-w-0', data.values.period?.mode !== 'custom' && 'w-72')}>{@render control(filter)}</div>
    {/each}
  </div>
{:else if ordered.length > 0}
  <section aria-label="Filtros do painel">
    {@render toolbar()}
  </section>
{/if}
