<!--
  @component
  O CALENDÁRIO DA CASA: o mesmo desenho do `ui/calendar` do template (o `Calendar` do shadcn em
  cima do react-day-picker), refeito aqui sobre o `Calendar` e o `RangeCalendar` do bits-ui.

  É a porta de entrada de todo calendário do sistema — `AzuosDatePicker` (uma data) e
  `AzuosDateRangeField` (período) — para que todos tenham a mesma cara do template: as setas nas
  pontas do título, o mês e o ano no meio pelo `AzuosCalendarDropdown` (nunca o select nativo),
  os dias da semana abreviados, o dia de hoje com fundo cinza, o escolhido em azul e o período
  ligado por uma faixa. O `ui/calendar` baixado não é editado: o que muda entra aqui.

  Props: `data` traz o valor (`value` numa data, `range` no período), o mês que aparece (`month`)
  e os limites (`min`, `max`, `isDateDisabled`); `ui.mode` escolhe `single` ou `range`,
  `ui.numberOfMonths` quantos meses lado a lado e `ui.showOutsideDays` se aparecem os dias do mês
  vizinho; `state.isDisabled` trava tudo; `actions` recebe a data, o período e a troca de mês.
-->
<script lang="ts" module>
  import { type DateValue, getLocalTimeZone, today } from '@internationalized/date';

  import { calendarMonthName } from '$lib/components/azuos-calendar-dropdown/azuos-calendar-dropdown.svelte';

  export type AzuosCalendarRange = { start: DateValue | undefined; end: DateValue | undefined };

  export type AzuosCalendarProps = {
    data?: {
      /** A data escolhida, no modo `single`. */
      value?: DateValue;
      /** O período escolhido, no modo `range`. */
      range?: AzuosCalendarRange;
      /** O (primeiro) mês que aparece. Sem ele, abre no valor ou no mês de hoje. */
      month?: DateValue;
      /** A primeira data aceita. */
      min?: DateValue;
      /** A última data aceita. */
      max?: DateValue;
      /** Dias que não se escolhem, além dos limites. */
      isDateDisabled?: (date: DateValue) => boolean;
    };
    ui?: {
      mode?: 'single' | 'range';
      numberOfMonths?: number;
      /** Mostra os dias do mês vizinho (padrão: sim). No período lado a lado, desligue. */
      showOutsideDays?: boolean;
      className?: string;
    };
    state?: { isDisabled?: boolean };
    actions?: {
      onValueChange?: (value: DateValue | undefined) => void;
      onRangeChange?: (range: AzuosCalendarRange) => void;
      onMonthChange?: (month: DateValue) => void;
    };
  };

  /** Quantos anos a lista de ano cobre quando a tela não dá limite — o mesmo do template. */
  export const YEARS_BACK = 100;
  export const YEARS_AHEAD = 10;

  /** Os rótulos das setas, em português: só quem usa leitor de tela os ouve. */
  export const NAV_LABELS = { previous: 'Ir para o mês anterior', next: 'Ir para o mês seguinte' };

  /** Os anos da lista: dos limites, ou cem anos para trás e dez para frente. */
  export function calendarYears(min?: DateValue, max?: DateValue, now = today(getLocalTimeZone())) {
    const first = min?.year ?? now.year - YEARS_BACK;
    const last = max?.year ?? now.year + YEARS_AHEAD;

    return Array.from({ length: Math.max(last - first + 1, 1) }, (_, index) => ({
      value: first + index,
      label: String(first + index),
    }));
  }

  /** Os doze meses da lista; os que caem fora dos limites naquele ano ficam apagados. */
  export function calendarMonths(year: number, min?: DateValue, max?: DateValue) {
    return Array.from({ length: 12 }, (_, index) => {
      const key = year * 12 + index;
      const isBefore = min ? key < min.year * 12 + min.month - 1 : false;
      const isAfter = max ? key > max.year * 12 + max.month - 1 : false;

      return { value: index + 1, label: calendarMonthName(index + 1), disabled: isBefore || isAfter };
    });
  }

  /** O dia da semana do cabeçalho: "dom", "seg"… sem o ponto que o `Intl` acrescenta. */
  export function weekdayLabel(weekday: string): string {
    return weekday.replace('.', '').toLowerCase();
  }
</script>

<script lang="ts">
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { isEqualMonth } from '@internationalized/date';
  import { Calendar as CalendarPrimitive, RangeCalendar as RangePrimitive } from 'bits-ui';
  import { type Snippet, untrack } from 'svelte';

  import CalendarDropdown from '$lib/components/azuos-calendar-dropdown/azuos-calendar-dropdown.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: calendarState, actions }: AzuosCalendarProps = $props();

  const isRange = $derived(ui?.mode === 'range');
  const showOutsideDays = $derived(ui?.showOutsideDays ?? true);
  const isDisabled = $derived(calendarState?.isDisabled ?? false);

  /* O mês à vista. Segue `data.month` quando a tela manda; sem ele, abre no valor (ou em hoje) e
     a pessoa folheia por aqui. */
  const opening = untrack(
    () => data?.value ?? data?.range?.start ?? today(getLocalTimeZone()),
  );
  let page = $derived<DateValue>(data?.month ?? opening);

  function changePage(next: DateValue) {
    if (next.toString() === page.toString()) return;
    page = next;
    actions?.onMonthChange?.(next);
  }

  /* O período entregue ao bits-ui só troca de objeto quando as DATAS trocam. A tela monta um
     objeto novo a cada desenho, e o bits-ui, ao ver um período "novo", volta a página para o
     começo dele — a lista de mês e de ano mudava a página e ela voltava na mesma hora. */
  const rangeKey = $derived(`${data?.range?.start ?? ''}|${data?.range?.end ?? ''}`);
  const rangeValue = $derived.by(() => {
    void rangeKey;

    return untrack(() => ({ start: data?.range?.start, end: data?.range?.end }));
  });

  const same = (a?: DateValue, b?: DateValue) => a?.toString() === b?.toString();

  /* Só avisa quando o período MUDOU: a tela devolve um objeto novo a cada aviso, e o bits-ui
     avisa de novo ao receber o objeto novo — sem esta trava, um laço sem fim. */
  function changeRange(range: { start?: DateValue; end?: DateValue }) {
    if (same(range.start, data?.range?.start) && same(range.end, data?.range?.end)) return;
    actions?.onRangeChange?.({ start: range.start, end: range.end });
  }

  /* Trocar mês ou ano no título do 2º calendário muda o 1º: o primeiro é quem manda na página. */
  function jumpTo(shown: DateValue, monthIndex: number, change: { month?: number; year?: number }) {
    changePage(shown.set(change).subtract({ months: monthIndex }));
  }

  const ROOT_CLASS =
    'group/calendar bg-background w-fit p-3 [--cell-size:--spacing(8)] in-data-[slot=popover-content]:bg-transparent';
  const NAV_BUTTON_CLASS =
    'rounded-button hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 focus-visible:ring-ring/50 inline-flex size-(--cell-size) shrink-0 cursor-pointer items-center justify-center p-0 transition-all outline-none select-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50';
  const CELL_CLASS = cn(
    'group/day relative aspect-square h-full w-full p-0 text-center select-none',
    '[&:first-child[data-selected]_[data-bits-day]]:rounded-l-box [&:last-child[data-selected]_[data-bits-day]]:rounded-r-box',
    'data-today:rounded-box data-today:bg-accent data-today:text-accent-foreground data-today:data-selected:rounded-none',
    'data-outside-month:text-muted-foreground data-disabled:text-muted-foreground data-disabled:opacity-50',
  );
  const RANGE_CELL_CLASS =
    'data-range-start:rounded-l-box data-range-start:bg-accent data-range-end:rounded-r-box data-range-end:bg-accent data-range-middle:rounded-none';
  const DAY_CLASS = cn(
    'rounded-button hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 dark:hover:text-accent-foreground',
    'flex aspect-square size-auto w-full min-w-(--cell-size) shrink-0 cursor-pointer flex-col items-center justify-center gap-1 text-sm leading-none font-normal whitespace-nowrap transition-all outline-none',
    'focus-visible:ring-ring/50 focus-visible:relative focus-visible:z-10 focus-visible:ring-3',
    'data-disabled:pointer-events-none data-unavailable:line-through',
  );
  const SINGLE_DAY_CLASS = 'data-selected:bg-primary data-selected:text-primary-foreground';
  const RANGE_DAY_CLASS = cn(
    'data-range-middle:bg-accent data-range-middle:text-accent-foreground data-range-middle:rounded-none',
    'data-range-start:rounded-box data-range-start:bg-primary data-range-start:text-primary-foreground',
    'data-range-end:rounded-box data-range-end:bg-primary data-range-end:text-primary-foreground',
  );
  const HEAD_CELL_CLASS =
    'text-muted-foreground flex-1 rounded-box text-xs font-normal select-none';
</script>

<!-- O título de um mês: o mês e o ano no meio, entre as setas (que ficam no `nav`, por cima). -->
{#snippet caption(shown: DateValue, monthIndex: number)}
  <div class="flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)">
    <span class="sr-only" aria-live="polite">{calendarMonthName(shown.month)} {shown.year}</span>
    <div class="flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium">
      <CalendarDropdown
        options={calendarMonths(shown.year, data?.min, data?.max)}
        value={shown.month}
        ariaLabel="Mês"
        disabled={isDisabled}
        onChange={(month) => jumpTo(shown, monthIndex, { month })}
      />
      <CalendarDropdown
        options={calendarYears(data?.min, data?.max)}
        value={shown.year}
        ariaLabel="Ano"
        disabled={isDisabled}
        onChange={(year) => jumpTo(shown, monthIndex, { year })}
      />
    </div>
  </div>
{/snippet}

<!-- A seta. O rótulo do bits-ui ("Previous") vence o nosso no espalhamento, por isso o botão é
     montado aqui, com o rótulo em português por último. -->
{#snippet navButton(props: Record<string, unknown>, label: string, icon: Snippet)}
  <button {...props} type="button" aria-label={label} class={NAV_BUTTON_CLASS}>
    {@render icon()}
  </button>
{/snippet}

{#snippet chevronLeft()}<ChevronLeft class="size-4" aria-hidden="true" />{/snippet}
{#snippet chevronRight()}<ChevronRight class="size-4" aria-hidden="true" />{/snippet}

{#if isRange}
  <RangePrimitive.Root
    value={rangeValue}
    onValueChange={changeRange}
    placeholder={page}
    onPlaceholderChange={changePage}
    minValue={data?.min}
    maxValue={data?.max}
    isDateDisabled={data?.isDateDisabled}
    numberOfMonths={ui?.numberOfMonths ?? 1}
    disabled={isDisabled}
    disableDaysOutsideMonth={!showOutsideDays}
    fixedWeeks={false}
    locale="pt-BR"
    weekdayFormat="short"
    data-slot="calendar"
    class={cn(ROOT_CLASS, ui?.className)}
  >
    {#snippet children({ months, weekdays })}
      <div class="relative flex flex-col gap-4 md:flex-row">
        <nav class="absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1">
          <RangePrimitive.PrevButton>
            {#snippet child({ props })}
              {@render navButton(props, NAV_LABELS.previous, chevronLeft)}
            {/snippet}
          </RangePrimitive.PrevButton>
          <RangePrimitive.NextButton>
            {#snippet child({ props })}
              {@render navButton(props, NAV_LABELS.next, chevronRight)}
            {/snippet}
          </RangePrimitive.NextButton>
        </nav>
        {#each months as month, monthIndex (month.value.toString())}
          <div class="flex w-full flex-col gap-4">
            {@render caption(month.value, monthIndex)}
            <RangePrimitive.Grid class="w-full border-collapse">
              <RangePrimitive.GridHead>
                <RangePrimitive.GridRow class="flex">
                  {#each weekdays as weekday, index (index)}
                    <RangePrimitive.HeadCell class={HEAD_CELL_CLASS}>
                      {weekdayLabel(weekday)}
                    </RangePrimitive.HeadCell>
                  {/each}
                </RangePrimitive.GridRow>
              </RangePrimitive.GridHead>
              <RangePrimitive.GridBody>
                {#each month.weeks as week (week)}
                  <RangePrimitive.GridRow class="mt-2 flex w-full">
                    {#each week as date (date.toString())}
                      {@const isOutside = !isEqualMonth(date, month.value)}
                      <RangePrimitive.Cell
                        {date}
                        month={month.value}
                        class={cn(CELL_CLASS, RANGE_CELL_CLASS, isOutside && !showOutsideDays && 'invisible')}
                      >
                        {#if showOutsideDays || !isOutside}
                          <RangePrimitive.Day class={cn(DAY_CLASS, RANGE_DAY_CLASS)} />
                        {/if}
                      </RangePrimitive.Cell>
                    {/each}
                  </RangePrimitive.GridRow>
                {/each}
              </RangePrimitive.GridBody>
            </RangePrimitive.Grid>
          </div>
        {/each}
      </div>
    {/snippet}
  </RangePrimitive.Root>
{:else}
  <CalendarPrimitive.Root
    type="single"
    value={data?.value}
    onValueChange={(value) => actions?.onValueChange?.(value)}
    placeholder={page}
    onPlaceholderChange={changePage}
    minValue={data?.min}
    maxValue={data?.max}
    isDateDisabled={data?.isDateDisabled}
    numberOfMonths={ui?.numberOfMonths ?? 1}
    disabled={isDisabled}
    disableDaysOutsideMonth={!showOutsideDays}
    fixedWeeks={false}
    locale="pt-BR"
    weekdayFormat="short"
    data-slot="calendar"
    class={cn(ROOT_CLASS, ui?.className)}
  >
    {#snippet children({ months, weekdays })}
      <div class="relative flex flex-col gap-4 md:flex-row">
        <nav class="absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1">
          <CalendarPrimitive.PrevButton>
            {#snippet child({ props })}
              {@render navButton(props, NAV_LABELS.previous, chevronLeft)}
            {/snippet}
          </CalendarPrimitive.PrevButton>
          <CalendarPrimitive.NextButton>
            {#snippet child({ props })}
              {@render navButton(props, NAV_LABELS.next, chevronRight)}
            {/snippet}
          </CalendarPrimitive.NextButton>
        </nav>
        {#each months as month, monthIndex (month.value.toString())}
          <div class="flex w-full flex-col gap-4">
            {@render caption(month.value, monthIndex)}
            <CalendarPrimitive.Grid class="w-full border-collapse">
              <CalendarPrimitive.GridHead>
                <CalendarPrimitive.GridRow class="flex">
                  {#each weekdays as weekday, index (index)}
                    <CalendarPrimitive.HeadCell class={HEAD_CELL_CLASS}>
                      {weekdayLabel(weekday)}
                    </CalendarPrimitive.HeadCell>
                  {/each}
                </CalendarPrimitive.GridRow>
              </CalendarPrimitive.GridHead>
              <CalendarPrimitive.GridBody>
                {#each month.weeks as week (week)}
                  <CalendarPrimitive.GridRow class="mt-2 flex w-full">
                    {#each week as date (date.toString())}
                      {@const isOutside = !isEqualMonth(date, month.value)}
                      <CalendarPrimitive.Cell
                        {date}
                        month={month.value}
                        class={cn(CELL_CLASS, isOutside && !showOutsideDays && 'invisible')}
                      >
                        {#if showOutsideDays || !isOutside}
                          <CalendarPrimitive.Day class={cn(DAY_CLASS, SINGLE_DAY_CLASS)} />
                        {/if}
                      </CalendarPrimitive.Cell>
                    {/each}
                  </CalendarPrimitive.GridRow>
                {/each}
              </CalendarPrimitive.GridBody>
            </CalendarPrimitive.Grid>
          </div>
        {/each}
      </div>
    {/snippet}
  </CalendarPrimitive.Root>
{/if}
