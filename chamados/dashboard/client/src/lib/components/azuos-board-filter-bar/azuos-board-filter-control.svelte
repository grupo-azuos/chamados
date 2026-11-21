<script lang="ts" module>
  import {
    type BoardFilter,
    type BoardFilterDisplay,
    type BoardFilterValues,
  } from '@template/shared/schemas/dashboard-board.schema';

  import { type FilterCounts } from '$lib/hooks/use-dashboard-board/use-dashboard-board.svelte';

  /** Um filtro do painel, no desenho que quem montou escolheu. */
  export type AzuosBoardFilterControlProps = {
    data: {
      filter: BoardFilter;
      display: BoardFilterDisplay;
      values: BoardFilterValues;
      counts: FilterCounts | null;
      /** Quantas casas de altura o filtro ocupa — a faixa de cards usa uma, a grade usa mais. */
      rows: number;
    };
    actions: { onChange: (patch: Partial<BoardFilterValues>) => void };
  };
</script>

<script lang="ts">
  import CalendarRange from '@lucide/svelte/icons/calendar-range';
  import {
    isFieldFilterKind,
    MAX_WINDOW_DAYS,
    ME_VALUE,
    windowLabel,
  } from '@template/shared/schemas/dashboard-board.schema';

  import AzuosCarousel from '$lib/components/azuos-carousel/azuos-carousel.svelte';
  import AzuosComboboxField from '$lib/components/azuos-combobox-field/azuos-combobox-field.svelte';
  import AzuosDateRangeField from '$lib/components/azuos-date-range-field/azuos-date-range-field.svelte';
  import AzuosFilterChoice from '$lib/components/azuos-filter-choice/azuos-filter-choice.svelte';
  import AzuosFilterField from '$lib/components/azuos-filter-field/azuos-filter-field.svelte';
  import AzuosMiniStatCard from '$lib/components/azuos-mini-stat-card/azuos-mini-stat-card.svelte';
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

  let { data, actions }: AzuosBoardFilterControlProps = $props();

  const kind = $derived(data.filter.kind);
  const label = $derived(data.filter.label);

  /* O filtro em cards: o primeiro é "Todos", com o total; clicar de novo (ou em "Todos") solta. */
  const cards = $derived([
    { key: '', label: 'Todos', value: data.counts?.total ?? 0 },
    ...(data.counts?.series ?? []).filter((item) => !item.key.startsWith('(')),
  ]);
  const chosenCard = $derived(kind === 'period' ? '' : (data.values[kind] ?? ''));

  function pickCard(value: string) {
    if (kind === 'period') return;
    actions.onChange({ [kind]: value === '' || value === chosenCard ? null : value });
  }

  /* "Pessoa": todas, eu, ou alguém da lista. "Eu" serve a todo mundo, cada um vê o seu. */
  const people = $derived<BoardFilterOption[]>([
    { value: '', label: 'Todas as pessoas' },
    { value: ME_VALUE, label: 'Eu' },
    ...personOptions(data.counts),
  ]);
  const fieldOptions = $derived<BoardFilterOption[]>(
    isFieldFilterKind(kind) ? [{ value: '', label: 'Todos' }, ...fieldFilterOptions(kind, data.counts)] : [],
  );
  const period = $derived(data.values.period);
  const periodOptions = PERIOD_PRESETS.map(({ value, label: text }) => ({ value, label: text }));

  function onPeriodPreset(value: string) {
    actions.onChange({ period: windowOfPreset(value, todayIso()) });
  }
</script>

{#if data.display === 'cards'}
  <!-- O FILTRO EM CARDS — cada opção é um card com quantos há nela, e clicar filtra o painel
       inteiro. Numa casa de altura, os cards são uma faixa que desliza; mais alto, uma grade. -->
  {#snippet card(item: { key: string; label: string; value: number })}
    <AzuosMiniStatCard
      data={{ label: item.label, value: item.value.toLocaleString('pt-BR') }}
      ui={{ tone: item.key ? 'neutral' : 'brand', className: 'h-full' }}
      state={{ isSelected: item.key === chosenCard }}
      actions={{ onClick: () => pickCard(item.key) }}
    />
  {/snippet}
  <div class="flex min-w-0 flex-col gap-2">
    <span class="text-ink-700 text-sm font-medium">{label}</span>
    {#if data.rows > 1}
      <div class="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-2">
        {#each cards as item (item.key || 'all')}{@render card(item)}{/each}
      </div>
    {:else}
      <AzuosCarousel data={{ items: cards }} ui={{ ariaLabel: label, itemClassName: 'basis-56' }}>
        {#snippet item(entry)}{@render card(entry)}{/snippet}
      </AzuosCarousel>
    {/if}
  </div>
{:else if kind === 'person'}
  {#if data.display === 'avatars' || data.display === 'chips'}
    <AzuosFilterChoice
      data={{ label, value: data.values.person ?? '', options: people }}
      ui={{ display: data.display }}
      actions={{ onChange: (person) => actions.onChange({ person: person || null }) }}
    />
  {:else}
    <AzuosFilterField data={{ label }} ui={{ className: 'w-full' }}>
      <AzuosComboboxField
        data={{ value: data.values.person ?? '', options: people }}
        ui={{ ariaLabel: label, placeholder: 'Todas as pessoas', searchPlaceholder: 'Buscar pessoa...', className: 'w-full' }}
        actions={{ onChange: (person) => actions.onChange({ person: person || null }) }}
      />
    </AzuosFilterField>
  {/if}
{:else if kind === 'period'}
  <div class="flex flex-col gap-2">
    {#if data.display === 'chips'}
      <AzuosFilterChoice
        data={{ label, value: presetOf(period), options: periodOptions }}
        ui={{ display: 'chips' }}
        actions={{ onChange: onPeriodPreset }}
      />
    {:else}
      <AzuosFilterField data={{ label }} ui={{ className: 'w-full' }}>
        <AzuosSelectField
          data={{ value: presetOf(period), options: periodOptions }}
          ui={{ ariaLabel: label, className: 'w-full' }}
          actions={{ onChange: onPeriodPreset }}
        />
      </AzuosFilterField>
    {/if}
    {#if period?.mode === 'custom'}
      <AzuosDateRangeField
        data={{ label: `Entre (até ${MAX_WINDOW_DAYS} dias)`, name: 'boardPeriod', value: { from: period.from, to: period.to } }}
        ui={{ className: 'w-full' }}
        actions={{
          onChange: (range) => {
            if (period?.mode !== 'custom') return;
            const from = range.from ?? period.from;
            const to = range.to ?? period.to;
            actions.onChange({ period: { mode: 'custom', ...clampRange(from, to) } });
          },
        }}
      />
    {/if}
    {#if period}
      <p class="text-ink-500 flex items-center gap-1 text-xs">
        <CalendarRange class="size-3.5" aria-hidden="true" />
        {windowLabel(period)}
      </p>
    {/if}
  </div>
{:else if data.display === 'chips' || data.display === 'list'}
  <AzuosFilterChoice
    data={{ label, value: data.values[kind] ?? '', options: fieldOptions }}
    ui={{ display: data.display }}
    actions={{ onChange: (value) => actions.onChange({ [kind]: value || null }) }}
  />
{:else}
  <!-- Na lista suspensa, lista longa ganha busca sozinha (regra dos 15 itens); "Busca" a liga
       sempre. -->
  <AzuosFilterField data={{ label }} ui={{ className: 'w-full' }}>
    {#if data.display === 'search' || fieldOptions.length > SEARCH_FROM}
      <AzuosComboboxField
        data={{ value: data.values[kind] ?? '', options: fieldOptions }}
        ui={{ ariaLabel: label, placeholder: 'Todos', searchPlaceholder: 'Buscar...', className: 'w-full' }}
        actions={{ onChange: (value) => actions.onChange({ [kind]: value || null }) }}
      />
    {:else}
      <AzuosSelectField
        data={{ value: data.values[kind] ?? '', options: fieldOptions }}
        ui={{ ariaLabel: label, className: 'w-full' }}
        actions={{ onChange: (value) => actions.onChange({ [kind]: value || null }) }}
      />
    {/if}
  </AzuosFilterField>
{/if}
