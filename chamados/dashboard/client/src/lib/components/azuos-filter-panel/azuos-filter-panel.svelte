<!--
  @component
  A BARRA DE FILTROS de uma lista — o cartão de filtros do grupo (`AzuosCollapsibleFilters`, o de
  Empresas do paralegal), alimentado por uma lista de campos. É o mesmo desenho no Inventário, nas
  filas de chamados e nas tarefas.

  À vista, o que se usa toda hora: a busca e um filtro principal em lista suspensa (o departamento),
  com o botão "Filtros" — que conta quantos dos escondidos estão ligados — e o "Limpar filtros" na
  mesma linha. O resto mora atrás do botão, numa grade que INTERCALA pastilhas (`pills`, poucas
  opções) e listas suspensas (`select`, muitas). A troca tabela/cards NÃO mora aqui: ela é da barra
  da lista (`AzuosListToolbar`), logo acima da lista.

  Função pura de props. O único estado próprio é visual — o cartão aberto ou fechado.

  Props: `data` traz a busca, o filtro principal, os filtros, as etiquetas (quantos estão ligados)
  e se há o que limpar; `ui` traz o nome da região e as colunas; `state.isFilteredOut` avisa que o
  filtro escondeu tudo (aí quem oferece "Limpar filtros" é o aviso de lista vazia); `actions`
  recebe a busca, a troca de filtro e o limpar. `toggles` é a faixa de baixo, sempre à vista, com o
  que a lista MOSTRA (de quem, em uso ou arquivadas).
-->
<script lang="ts" module>
  import type { Snippet } from 'svelte';
  import { type OptionPickerOption } from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import { type AzuosPersonPickerPerson } from '$lib/components/azuos-person-picker-field/azuos-person-picker-field.svelte';

  /**
   * Um filtro do painel. `control` diz o formato: `pills` para poucas opções (escolha num
   * clique, à vista) e `select` para muitas (lista suspensa com busca). Alternar os dois na grade
   * é o desenho do painel.
   *
   * `person` é o filtro de PESSOA (regra `select-standard`): o campo de pessoa do sistema, com a
   * foto e busca, que guarda o id. Aí `people` traz as pessoas e `options` vira as opções que vêm
   * ANTES delas ("(Sem responsável)"), logo depois do "todos" de `allLabel`.
   */
  export type FilterPanelField = {
    key: string;
    label: string;
    control: 'pills' | 'select' | 'person';
    ariaLabel: string;
    /** O rótulo da opção "sem filtro" — "Todas", "Toda a saúde". */
    allLabel: string;
    value: string;
    options: OptionPickerOption[];
    searchPlaceholder?: string;
    /** As pessoas do filtro `person`. */
    people?: AzuosPersonPickerPerson[];
  };

  /** Uma etiqueta de filtro ligado: o que ela diz. Elas contam quantos estão ligados. */
  export type FilterPanelChip = { key: string; label: string };

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
      /**
       * Quantos filtros por linha na tela larga (3 é o padrão). Com 7 filtros, 4 por linha os
       * mantém em DUAS linhas — uma terceira linha empurra a lista para baixo da dobra.
       */
      columns?: 3 | 4;
    };
    state?: {
      /** O filtro escondeu tudo: quem oferece "Limpar filtros" é o aviso de lista vazia. */
      isFilteredOut?: boolean;
    };
    actions: {
      onSearchChange: (search: string) => void;
      onFieldChange: (key: string, value: string) => void;
      onClearFilters: () => void;
    };
    /** A faixa de baixo, sempre à vista: o que a lista MOSTRA ("Da equipe / Minhas"). */
    toggles?: Snippet;
  };
</script>

<script lang="ts">
  import Search from '@lucide/svelte/icons/search';

  import CollapsibleFilters from '$lib/components/azuos-collapsible-filters/azuos-collapsible-filters.svelte';
  import FilterField from '$lib/components/azuos-filter-field/azuos-filter-field.svelte';
  import InputGroup from '$lib/components/azuos-input-group/azuos-input-group.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import PersonPickerField from '$lib/components/azuos-person-picker-field/azuos-person-picker-field.svelte';

  let { data, ui, state: panelState, actions, toggles }: AzuosFilterPanelProps = $props();

  /**
   * Pastilhas com até três escolhas (contando "todas") dividem a largura da célula, como
   * colunas. Com mais, ficam do tamanho das opções — esticadas, sobrava faixa vazia.
   */
  function fillsCell(field: FilterPanelField): boolean {
    return field.control !== 'pills' || field.options.length + 1 <= 3;
  }
</script>

{#snippet primary()}
  <InputGroup
    data={{
      label: 'Buscar',
      name: 'search',
      value: data.search.value,
      placeholder: data.search.placeholder,
    }}
    actions={{ onChange: actions.onSearchChange }}
  >
    {#snippet prefix()}
      <Search class="text-muted-foreground size-4" aria-hidden="true" />
    {/snippet}
  </InputGroup>

  {#if data.primary}
    {@const field = data.primary}
    <FilterField data={{ label: field.label }} ui={{ className: 'sm:w-full' }}>
      <OptionPicker
        data={{ value: field.value, options: field.options }}
        ui={{
          ariaLabel: field.ariaLabel,
          allLabel: field.allLabel,
          mode: 'combobox',
          fullWidth: true,
          searchPlaceholder: field.searchPlaceholder ?? 'Buscar…',
        }}
        actions={{ onChange: (value: string) => actions.onFieldChange(field.key, value) }}
      />
    </FilterField>
  {/if}
{/snippet}

{#snippet more()}
  <!-- A grade INTERCALA pastilhas (poucas opções, à vista num clique) e listas suspensas
       (muitas): 3 colunas no computador grande, 2 no tablet e 1 no celular, todas com a altura
       de campo do sistema. No celular as pastilhas viram lista, pelo próprio seletor. -->
  <div
    class={[
      'grid min-w-0 items-end gap-3 sm:grid-cols-2',
      ui?.columns === 4 ? 'lg:grid-cols-3 xl:grid-cols-4' : 'xl:grid-cols-3',
    ]}
  >
    {#each data.fields as field (field.key)}
      <FilterField
        data={{ label: field.label }}
        ui={{ className: fillsCell(field) ? 'sm:w-full' : 'items-start sm:w-full' }}
      >
        {#if field.control === 'person'}
          <PersonPickerField
            data={{
              value: field.value,
              people: field.people ?? [],
              leading: [{ value: '', label: field.allLabel }, ...field.options],
            }}
            ui={{ ariaLabel: field.ariaLabel, placeholder: field.allLabel, className: 'w-full' }}
            actions={{ onChange: (value: string) => actions.onFieldChange(field.key, value) }}
          />
        {:else}
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
        {/if}
      </FilterField>
    {/each}
  </div>
{/snippet}

<!-- "Limpar filtros" fica na linha de cima, ao lado do "Filtros" (como no paralegal). Quando o
     filtro escondeu tudo, quem o oferece é o aviso de lista vazia — dois botões iguais confundem. -->
<CollapsibleFilters
  data={{ label: ui?.ariaLabel ?? 'Filtros', activeCount: data.chips.length }}
  state={{ hasFilter: data.canClear && !panelState?.isFilteredOut }}
  actions={{ onClear: actions.onClearFilters }}
  {primary}
  {toggles}
  children={data.fields.length > 0 ? more : undefined}
/>
