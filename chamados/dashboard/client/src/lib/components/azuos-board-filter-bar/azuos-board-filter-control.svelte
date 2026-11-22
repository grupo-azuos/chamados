<script lang="ts" module>
  import {
    type BoardFilter,
    type BoardFilterDisplay,
    type BoardFilterValues,
  } from '@template/shared/schemas/dashboard-board.schema';

  import { type FilterCounts } from '$lib/hooks/use-dashboard-board/use-dashboard-board.svelte';

  /**
   * UM FILTRO NA BARRA, no estilo do Grafana: uma peça só, com o nome à esquerda e o valor ao
   * lado ("Situação | Todos ▾"). Três desenhos — a lista suspensa, a busca e as etiquetas à vista
   * —, todos na altura de um campo, para a barra inteira caber numa linha acima dos blocos.
   */
  export type AzuosBoardFilterControlProps = {
    data: {
      filter: BoardFilter;
      display: BoardFilterDisplay;
      values: BoardFilterValues;
      counts: FilterCounts | null;
    };
    actions: { onChange: (patch: Partial<BoardFilterValues>) => void };
  };

</script>

<script lang="ts">
  import AppWindow from '@lucide/svelte/icons/app-window';
  import Building2 from '@lucide/svelte/icons/building-2';
  import CalendarRange from '@lucide/svelte/icons/calendar-range';
  import CircleDot from '@lucide/svelte/icons/circle-dot';
  import Flag from '@lucide/svelte/icons/flag';
  import HeartPulse from '@lucide/svelte/icons/heart-pulse';
  import Megaphone from '@lucide/svelte/icons/megaphone';
  import Package from '@lucide/svelte/icons/package';
  import Tag from '@lucide/svelte/icons/tag';
  import UserRound from '@lucide/svelte/icons/user-round';
  import {
    type BoardFilterKind,
    isFieldFilterKind,
    MAX_WINDOW_DAYS,
    ME_VALUE,
  } from '@template/shared/schemas/dashboard-board.schema';
  import { type Component } from 'svelte';

  import AzuosComboboxField from '$lib/components/azuos-combobox-field/azuos-combobox-field.svelte';
  import AzuosDateRangeField from '$lib/components/azuos-date-range-field/azuos-date-range-field.svelte';
  import AzuosSelectField from '$lib/components/azuos-select-field/azuos-select-field.svelte';
  import {
    type BoardFilterOption,
    clampRange,
    fieldFilterOptions,
    optionCounts,
    PERIOD_PRESETS,
    personOptions,
    presetOf,
    SEARCH_FROM,
    windowOfPreset,
  } from '$lib/utils/board-filter.util';
  import { todayIso } from '$lib/utils/calendar-date.util';
  import { cn } from '$lib/utils/cn';

  let { data, actions }: AzuosBoardFilterControlProps = $props();

  /* O valor ocupa o resto da peça, sem moldura própria: o fundo é o da peça inteira. */
  const VALUE_CLASS =
    'h-10 w-full min-w-0 flex-1 rounded-none border-0 bg-transparent shadow-none hover:bg-hover-veil dark:bg-transparent dark:hover:bg-hover-veil';

  /* O ícone de cada filtro, ao lado do nome — acha-se o filtro pelo desenho, sem ler. */
  const ICONS: Record<BoardFilterKind, Component> = {
    person: UserRound,
    period: CalendarRange,
    ticketStatus: CircleDot,
    ticketPriority: Flag,
    department: Building2,
    problemType: Tag,
    requester: Megaphone,
    project: AppWindow,
    computerHealth: HeartPulse,
    inventoryCategory: Package,
  };

  const kind = $derived(data.filter.kind);
  const label = $derived(data.filter.label);
  const Icon = $derived(ICONS[kind]);
  const options = $derived<BoardFilterOption[]>(optionsOf(kind));
  const value = $derived(kind === 'period' ? presetOf(data.values.period) : (data.values[kind] ?? ''));
  const period = $derived(data.values.period);
  /* O desenho é o que quem montou escolheu, com quantas opções houver: etiquetas a mais rolam de
     lado. Trocar sozinho para a busca desfazia a escolha assim que a lista crescia. */
  const display = $derived(data.display);
  const isSearch = $derived(display === 'search' || options.length > SEARCH_FROM);
  const amounts = $derived(optionCounts(data.counts));

  /* "Pessoa": todas, eu, ou alguém da lista. "Eu" serve a todo mundo, cada um vê o seu. */
  function optionsOf(current: BoardFilterKind): BoardFilterOption[] {
    if (current === 'period') return PERIOD_PRESETS.map((preset) => ({ value: preset.value, label: preset.label }));
    if (current === 'person') {
      return [{ value: '', label: 'Todas' }, { value: ME_VALUE, label: 'Eu' }, ...personOptions(data.counts)];
    }
    if (isFieldFilterKind(current)) return [{ value: '', label: 'Todos' }, ...fieldFilterOptions(current, data.counts)];

    return [];
  }

  function choose(next: string) {
    if (kind === 'period') {
      actions.onChange({ period: windowOfPreset(next, todayIso()) });

      return;
    }
    actions.onChange({ [kind]: next || null });
  }

  function onRange(range: { from?: string | null; to?: string | null }) {
    if (period?.mode !== 'custom') return;
    actions.onChange({ period: { mode: 'custom', ...clampRange(range.from ?? period.from, range.to ?? period.to) } });
  }
</script>

<!-- Uma célula da grade da barra: a peça e, no período "entre datas", as datas logo abaixo. -->
<div class="flex min-w-0 flex-col gap-2">
  {#if display === 'cards'}
    <!-- OS CARDS: uma faixa com o nome do filtro e, embaixo, uma opção por quadro, com quantos há
         nela — escolher é clicar no quadro. Quadros cinza sobre o cartão da barra (card dentro de
         card não), e o escolhido no azul claro. -->
    <div role="radiogroup" aria-label={label} class="flex min-w-0 flex-col gap-2">
      <span class="text-muted-foreground flex items-center gap-1.5 text-sm font-medium">
        <Icon class="size-4 shrink-0" aria-hidden="true" />
        {label}
      </span>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-2">
        {#each options as option (option.value)}
          {@const isChecked = option.value === value}
          <button
            type="button"
            role="radio"
            aria-checked={isChecked}
            onclick={() => choose(option.value)}
            class={cn(
              'rounded-control focus-visible:ring-ring/50 flex min-h-16 min-w-0 flex-col items-start justify-center gap-0.5 px-3 py-2 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none',
              isChecked ? 'bg-primary-soft text-primary' : 'bg-muted text-foreground hover:bg-hover-veil',
            )}
          >
            <span class={cn('w-full truncate text-sm font-medium', !isChecked && 'text-muted-foreground')}>{option.label}</span>
            <!-- "Eu" não tem conta própria: cada um que vê é um "eu" diferente. -->
            {#if option.value !== ME_VALUE}
              <span class="text-xl font-bold tabular-nums">{amounts.get(option.value) ?? 0}</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {:else}
    <!-- A peça: o nome num lado, o valor no outro, numa moldura cinza só — os três desenhos com o
         mesmo fundo, a mesma altura e o mesmo fio entre o nome e o valor. -->
    <div role="group" aria-label={label} class="rounded-control bg-muted flex h-10 min-w-0 items-stretch overflow-hidden">
      <span
        class="text-muted-foreground border-border flex max-w-[55%] shrink-0 items-center gap-1.5 border-r px-3 text-sm font-medium"
        title={label}
      >
        <Icon class="size-4 shrink-0" aria-hidden="true" />
        <span class="truncate">{label}</span>
      </span>
      {#if display === 'chips'}
        <!-- As etiquetas como abas da peça: cada uma com a altura inteira (40px, alvo de clique
             confortável); a escolhida no azul claro. Sem espaço, rolam de lado. -->
        <div role="radiogroup" aria-label={label} class="flex min-w-0 flex-1 items-stretch overflow-x-auto">
          {#each options as option (option.value)}
            {@const isChecked = option.value === value}
            <button
              type="button"
              role="radio"
              aria-checked={isChecked}
              onclick={() => choose(option.value)}
              class={cn(
                'focus-visible:ring-ring/50 h-10 shrink-0 px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-[3px] focus-visible:outline-none focus-visible:ring-inset',
                isChecked ? 'bg-primary-soft text-primary font-semibold' : 'text-muted-foreground hover:bg-hover-veil hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          {/each}
        </div>
      {:else if isSearch}
        <AzuosComboboxField
          data={{ value, options }}
          ui={{
            ariaLabel: label,
            placeholder: options[0]?.label ?? 'Todos',
            searchPlaceholder: 'Buscar...',
            className: VALUE_CLASS,
          }}
          actions={{ onChange: choose }}
        />
      {:else}
        <AzuosSelectField data={{ value, options }} ui={{ ariaLabel: label, className: VALUE_CLASS }} actions={{ onChange: choose }} />
      {/if}
    </div>
  {/if}
  {#if kind === 'period' && period?.mode === 'custom'}
    <AzuosDateRangeField
      data={{ label: `Entre (até ${MAX_WINDOW_DAYS} dias)`, name: 'boardPeriod', value: { from: period.from, to: period.to } }}
      ui={{ className: 'w-full' }}
      actions={{ onChange: onRange }}
    />
  {/if}
</div>
