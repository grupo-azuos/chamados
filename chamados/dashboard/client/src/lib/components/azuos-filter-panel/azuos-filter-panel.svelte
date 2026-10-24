<script lang="ts" module>
  import { type OptionPickerOption } from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';

  /**
   * Um filtro do painel. `control` diz o formato: `pills` para poucas opções (escolha num
   * clique, à vista) e `select` para muitas (lista suspensa com busca). Alternar os dois na grade
   * é o desenho do painel.
   */
  export type FilterPanelField = {
    key: string;
    label: string;
    control: 'pills' | 'select';
    ariaLabel: string;
    /** O rótulo da opção "sem filtro" — "Todas", "Toda a saúde". */
    allLabel: string;
    value: string;
    options: OptionPickerOption[];
    searchPlaceholder?: string;
  };

  /** Uma etiqueta de filtro ligado: o que ela diz. Tirar é `actions.onRemoveChip(key)`. */
  export type FilterPanelChip = { key: string; label: string };

  /**
   * A BARRA DE FILTROS de uma lista — o mesmo desenho no Inventário e nas filas de chamados.
   *
   * Em cima, o que se usa toda hora: a busca, um filtro principal em lista suspensa (o
   * departamento) e o botão "Filtros", que conta quantos estão ligados. O resto mora num painel
   * que desliza, numa grade que INTERCALA pastilhas e listas suspensas: 3 colunas no computador
   * grande, 2 no tablet e 1 no celular. Embaixo, uma etiqueta por filtro ligado, com o X que o
   * desliga, e "Limpar filtros".
   *
   * Função pura de props. O único estado próprio é visual — o painel aberto ou fechado.
   */
  export type AzuosFilterPanelProps = {
    data: {
      search: { value: string; placeholder: string };
      /** O filtro que fica à vista, ao lado da busca. */
      primary?: FilterPanelField;
      fields: FilterPanelField[];
      chips: FilterPanelChip[];
      /** Há o que limpar — inclusive a busca e o filtro principal, que não viram etiqueta. */
      canClear: boolean;
    };
    ui?: {
      /** O nome da região para o leitor de tela: "Filtros do inventário". */
      ariaLabel?: string;
      /** Mostra a troca tabela/cards no fim da barra. */
      showViewToggle?: boolean;
    };
    state?: {
      /** O filtro escondeu tudo: quem oferece "Limpar filtros" é o aviso de lista vazia. */
      isFilteredOut?: boolean;
    };
    actions: {
      onSearchChange: (search: string) => void;
      onFieldChange: (key: string, value: string) => void;
      onRemoveChip: (key: string) => void;
      onClearFilters: () => void;
    };
  };
</script>

<script lang="ts">
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import FilterX from '@lucide/svelte/icons/filter-x';
  import Search from '@lucide/svelte/icons/search';
  import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
  import X from '@lucide/svelte/icons/x';
  import { untrack } from 'svelte';
  import { flip } from 'svelte/animate';
  import { scale, slide } from 'svelte/transition';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import FilterField from '$lib/components/azuos-filter-field/azuos-filter-field.svelte';
  import InputGroup from '$lib/components/azuos-input-group/azuos-input-group.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import TableViewToggle from '$lib/components/azuos-table-view-toggle/azuos-table-view-toggle.svelte';
  import { DURATION, prefersReducedMotion } from '$lib/motion/motion';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: panelState, actions }: AzuosFilterPanelProps = $props();

  /* Estado VISUAL: o painel aberto. Nasce aberto quando a tela chega filtrada lá dentro (um
     cartão do painel, um filtro salvo) — senão a pessoa veria a lista recortada sem saber por quê. */
  let isOpen = $state(untrack(() => data.chips.length > 0));

  /* Quem pede "reduzir movimento" no sistema não vê a animação — vira troca seca. */
  const motionMs = (seconds: number) => (prefersReducedMotion() ? 0 : seconds * 1000);
  const panelId = `filter-panel-${Math.random().toString(36).slice(2, 9)}`;

  /**
   * Pastilhas com até três escolhas (contando "todas") dividem a largura da célula, como
   * colunas. Com mais, ficam do tamanho das opções — esticadas, sobrava faixa vazia.
   */
  function fillsCell(field: FilterPanelField): boolean {
    return field.control === 'select' || field.options.length + 1 <= 3;
  }
</script>

<section
  aria-label={ui?.ariaLabel ?? 'Filtros'}
  class="border-border/70 bg-card rounded-surface flex min-w-0 flex-col border shadow-xs"
>
  <!-- A barra: busca ocupa o que sobrar; no celular cada peça ganha a própria linha. -->
  <div class="flex min-w-0 flex-col gap-3 p-3 sm:p-4 md:flex-row md:items-end">
    <InputGroup
      data={{
        label: 'Buscar',
        name: 'search',
        value: data.search.value,
        placeholder: data.search.placeholder,
      }}
      ui={{ className: 'md:flex-1' }}
      actions={{ onChange: actions.onSearchChange }}
    >
      {#snippet prefix()}
        <Search class="text-muted-foreground size-4" aria-hidden="true" />
      {/snippet}
    </InputGroup>

    {#if data.primary}
      {@const primary = data.primary}
      <FilterField data={{ label: primary.label }} ui={{ className: 'md:w-60' }}>
        <OptionPicker
          data={{ value: primary.value, options: primary.options }}
          ui={{
            ariaLabel: primary.ariaLabel,
            allLabel: primary.allLabel,
            mode: 'combobox',
            fullWidth: true,
            searchPlaceholder: primary.searchPlaceholder ?? 'Buscar…',
          }}
          actions={{ onChange: (value: string) => actions.onFieldChange(primary.key, value) }}
        />
      </FilterField>
    {/if}

    <div class="flex items-center gap-2">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onclick={() => (isOpen = !isOpen)}
        class={cn(
          'control-lg rounded-control inline-flex flex-1 items-center justify-center gap-2 border text-sm font-medium transition-colors md:flex-none',
          'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          isOpen || data.chips.length > 0
            ? 'border-transparent bg-primary-soft text-primary'
            : 'border-border bg-card text-foreground hover:bg-accent/50',
        )}
      >
        <SlidersHorizontal class="size-4" aria-hidden="true" />
        <span>Filtros</span>
        {#if data.chips.length > 0}
          {#key data.chips.length}
            <span
              in:scale={{ duration: motionMs(DURATION.fast), start: 0.6 }}
              class="bg-primary text-primary-foreground inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums"
              aria-label={`${data.chips.length} ${data.chips.length === 1 ? 'ativo' : 'ativos'}`}
            >
              {data.chips.length}
            </span>
          {/key}
        {/if}
        <ChevronDown
          class={cn(
            'size-4 transition-transform duration-200 motion-reduce:transition-none',
            isOpen && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>
      {#if ui?.showViewToggle !== false}
        <TableViewToggle />
      {/if}
    </div>
  </div>

  {#if isOpen}
    <!-- O painel desliza: some e aparece sem empurrar a lista num salto. A grade INTERCALA
         pastilhas (poucas opções, à vista num clique) e listas suspensas (muitas): 3 colunas no
         computador grande, 2 no tablet e 1 no celular, todas com a altura de campo do sistema.
         No celular as pastilhas viram lista, pelo próprio seletor. -->
    <div
      id={panelId}
      transition:slide={{ duration: motionMs(DURATION.base) }}
      class="border-border/60 border-t"
    >
      <div class="grid min-w-0 gap-x-4 gap-y-3 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
        {#each data.fields as field (field.key)}
          <FilterField
            data={{ label: field.label }}
            ui={{ className: fillsCell(field) ? 'sm:w-full' : 'items-start sm:w-full' }}
          >
            <OptionPicker
              data={{ value: field.value, options: field.options }}
              ui={{
                ariaLabel: field.ariaLabel,
                allLabel: field.allLabel,
                mode: field.control === 'select' ? 'combobox' : 'auto',
                fullWidth: fillsCell(field),
                searchPlaceholder: field.searchPlaceholder ?? 'Buscar…',
              }}
              actions={{ onChange: (value: string) => actions.onFieldChange(field.key, value) }}
            />
          </FilterField>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Uma etiqueta por filtro ligado. Entram e saem encolhendo, e as outras deslizam para o
       lugar (`flip`) em vez de pularem. -->
  {#if data.canClear}
    <div
      transition:slide={{ duration: motionMs(DURATION.fast) }}
      class="border-border/60 flex min-w-0 flex-wrap items-center gap-2 border-t px-3 py-2.5 sm:px-4"
    >
      {#if data.chips.length > 0}
        <ul class="flex min-w-0 flex-wrap items-center gap-2" aria-label="Filtros ligados">
          {#each data.chips as chip (chip.key)}
            <li
              animate:flip={{ duration: motionMs(DURATION.fast) }}
              transition:scale={{ duration: motionMs(DURATION.fast), start: 0.8 }}
            >
              <button
                type="button"
                onclick={() => actions.onRemoveChip(chip.key)}
                aria-label={`Tirar o filtro ${chip.label}`}
                class="bg-primary-soft text-primary hover:bg-primary/15 focus-visible:ring-ring inline-flex max-w-full items-center gap-1.5 rounded-full py-1 pr-2 pl-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <span class="truncate">{chip.label}</span>
                <X class="size-3.5 shrink-0" aria-hidden="true" />
              </button>
            </li>
          {/each}
        </ul>
      {/if}
      {#if !panelState?.isFilteredOut}
        <ActionButton
          data={{ label: 'Limpar filtros' }}
          ui={{ variant: 'ghost', size: 'sm', icon: FilterX, className: 'ml-auto' }}
          actions={{ onClick: actions.onClearFilters }}
        />
      {/if}
    </div>
  {/if}
</section>
