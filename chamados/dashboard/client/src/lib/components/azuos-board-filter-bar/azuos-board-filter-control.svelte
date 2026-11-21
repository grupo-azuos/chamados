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

  /** Etiquetas só até aqui: mais opções não cabem numa linha, e a peça vira a lista com busca. */
  export const MAX_CHIPS = 6;
</script>

<script lang="ts">
  import Building2 from '@lucide/svelte/icons/building-2';
  import CalendarRange from '@lucide/svelte/icons/calendar-range';
  import CircleDot from '@lucide/svelte/icons/circle-dot';
  import Flag from '@lucide/svelte/icons/flag';
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
    PERIOD_PRESETS,
    personOptions,
    presetOf,
    SEARCH_FROM,
    windowOfPreset,
  } from '$lib/utils/board-filter.util';
  import { todayIso } from '$lib/utils/calendar-date.util';
  import { cn } from '$lib/utils/cn';

  let { data, actions }: AzuosBoardFilterControlProps = $props();

  /* O ícone de cada filtro, ao lado do nome — acha-se o filtro pelo desenho, sem ler. */
  const ICONS: Record<BoardFilterKind, Component> = {
    person: UserRound,
    period: CalendarRange,
    ticketStatus: CircleDot,
    ticketPriority: Flag,
    department: Building2,
  };

  const kind = $derived(data.filter.kind);
  const label = $derived(data.filter.label);
  const Icon = $derived(ICONS[kind]);
  const options = $derived<BoardFilterOption[]>(optionsOf(kind));
  const value = $derived(kind === 'period' ? presetOf(data.values.period) : (data.values[kind] ?? ''));
  const period = $derived(data.values.period);
  const display = $derived(data.display === 'chips' && options.length > MAX_CHIPS ? 'search' : data.display);
  const isSearch = $derived(display === 'search' || options.length > SEARCH_FROM);

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

<div class="flex max-w-full flex-wrap items-end gap-2">
  <!-- A peça: o nome num lado, o valor no outro, numa moldura só. -->
  <div
    role="group"
    aria-label={label}
    class="rounded-control bg-card shadow-card flex h-10 max-w-full min-w-0 items-stretch overflow-hidden"
  >
    <span class="text-muted-foreground flex shrink-0 items-center gap-1.5 px-3 text-sm font-medium">
      <Icon class="size-4" aria-hidden="true" />
      {label}
    </span>
    {#if display === 'chips'}
      <!-- As etiquetas como abas de uma peça só: cada uma com a altura inteira (40px, alvo de
           clique confortável), e a escolhida acesa no fundo do card. -->
      <div role="radiogroup" aria-label={label} class="bg-muted flex min-w-0 items-stretch overflow-x-auto">
        {#each options as option (option.value)}
          {@const isChecked = option.value === value}
          <button
            type="button"
            role="radio"
            aria-checked={isChecked}
            onclick={() => choose(option.value)}
            class={cn(
              'focus-visible:ring-ring/50 h-10 shrink-0 px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-[3px] focus-visible:outline-none focus-visible:ring-inset',
              isChecked ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
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
          className: 'w-44 rounded-none',
        }}
        actions={{ onChange: choose }}
      />
    {:else}
      <AzuosSelectField
        data={{ value, options }}
        ui={{ ariaLabel: label, className: 'w-44 rounded-none' }}
        actions={{ onChange: choose }}
      />
    {/if}
  </div>
  {#if kind === 'period' && period?.mode === 'custom'}
    <AzuosDateRangeField
      data={{ label: `Entre (até ${MAX_WINDOW_DAYS} dias)`, name: 'boardPeriod', value: { from: period.from, to: period.to } }}
      ui={{ className: 'w-72' }}
      actions={{ onChange: onRange }}
    />
  {/if}
</div>
