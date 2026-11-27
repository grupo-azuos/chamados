<!--
  @component
  O CALENDÁRIO DO GRUPO — mês, semana, dia, lista e ano, no desenho da big-calendar (MIT), o mesmo
  do `AzuosEventCalendar` do Paralegal. É o calendário de agenda do sistema: a barra é o
  `AzuosSegmentedControl` e os botões da régua, a grade é a superfície do card. (Escolher uma data
  num formulário é outra coisa: o campo de data.)

  A navegação (anterior, hoje, a visão) é estado do próprio calendário; a data e a visão de
  `data`/`ui` são só as iniciais. Quem busca os dados do período à mostra é a tela, avisada por
  `onRangeChange` — também na abertura.

  - `data`: `events`, `holidays`, `initialDate`, `validRange`.
  - `ui`: `ariaLabel`, `views`, `initialView`, `height`, `className`.
  - `state`: `isLoading`.
  - `actions`: `onEventClick`, `onDateClick`, `onRangeChange`.
-->
<script lang="ts" module>
  import { type AzuosCalendarView } from './event-calendar.util';

  export type AzuosCalendarEvent = {
    id: string;
    title: string;
    /** `aaaa-mm-dd` (o dia inteiro) ou `aaaa-mm-ddThh:mm` (com hora). */
    start: string;
    end?: string;
    /** A cor do evento: `#rrggbb` ou um token (`var(--destructive)`). Sem ela, o azul da marca. */
    color?: string;
    /** O texto sobre `color` quando ela é token (o hexadecimal já decide sozinho). */
    contrastColor?: string;
    kind?: 'event' | 'holiday';
  };

  /** O período à mostra, e o dia de referência (`anchor`) — o mês da tela é o dele. */
  export type AzuosCalendarRange = { view: AzuosCalendarView; from: string; to: string; anchor: string };

  export type AzuosEventCalendarProps = {
    data: {
      events: readonly AzuosCalendarEvent[];
      holidays?: readonly { date: string; name: string }[];
      /** O dia em que o calendário abre (`aaaa-mm-dd`). @default hoje */
      initialDate?: string;
      /** Fora deste período nada se navega nem se clica. */
      validRange?: { from: string; to: string };
    };
    ui: {
      /** O nome do calendário para o leitor de tela: "Calendário das tarefas". */
      ariaLabel: string;
      /** As visualizações oferecidas, na ordem dos botões. @default todas */
      views?: readonly AzuosCalendarView[];
      initialView?: AzuosCalendarView;
      /** `auto` cresce com o conteúdo; `100%` ocupa a caixa. @default 'auto' */
      height?: 'auto' | '100%';
      className?: string;
    };
    state?: { isLoading?: boolean };
    actions?: {
      onEventClick?: (id: string) => void;
      onDateClick?: (day: string) => void;
      onRangeChange?: (range: AzuosCalendarRange) => void;
    };
  };

  /** O texto sobre a cor do evento: escuro na cor clara, claro na escura. */
  export function contrastColorOf(color: string): string {
    const match = /^#([0-9a-f]{6})$/i.exec(color);
    if (!match) return 'var(--primary-foreground)';
    const value = Number.parseInt(match[1]!, 16);
    const luminance = (0.299 * (value >> 16) + 0.587 * ((value >> 8) & 255) + 0.114 * (value & 255)) / 255;

    return luminance > 0.6 ? 'var(--foreground)' : 'var(--primary-foreground)';
  }
</script>

<script lang="ts">
  import CalendarX2 from '@lucide/svelte/icons/calendar-x-2';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { untrack } from 'svelte';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import SegmentedControl from '$lib/components/azuos-segmented-control/azuos-segmented-control.svelte';
  import { cn } from '$lib/utils/cn';
  import {
    CALENDAR_VIEWS,
    type CalendarEntry,
    canShift,
    clockOf,
    entriesOn,
    holidaysByDay,
    isInside,
    isSameMonthOf,
    listDays,
    longDayLabel,
    monthLabel,
    monthWeeks,
    placeTimed,
    shiftAnchor,
    titleOf,
    toDate,
    toDay,
    todayDate,
    toEntry,
    VIEW_LABELS,
    visibleHours,
    visibleRangeOf,
    weekDays,
    weekdayInitial,
    weekdayLabel,
    yearMonths,
  } from './event-calendar.util';

  let { data, ui, state: calendarState, actions }: AzuosEventCalendarProps = $props();

  type Entry = CalendarEntry<AzuosCalendarEvent>;

  /** Até três eventos por dia no mês; o resto vira "+2 mais", que abre o dia. */
  const MONTH_VISIBLE_EVENTS = 3;
  /** A altura de uma hora na grade, em pixels: meia hora ainda cabe uma linha de texto. */
  const HOUR_HEIGHT = 48;
  const FOCUS = 'focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none';

  const views = $derived(ui.views ?? CALENDAR_VIEWS);
  let view = $state<AzuosCalendarView>(untrack(() => ui.initialView ?? (ui.views ?? CALENDAR_VIEWS)[0] ?? 'month'));
  let anchor = $state(untrack(() => toDate(data.initialDate ?? toDay(todayDate()))));
  const today = toDay(todayDate());
  const isFill = $derived(ui.height === '100%');

  const entries = $derived(data.events.filter((event) => event.kind !== 'holiday').map(toEntry));
  const holidays = $derived(holidaysByDay(data.holidays ?? [], data.events));

  /* Avisa o período à mostra sempre que ele muda — e na abertura, quando a tela busca o 1º lote. */
  $effect(() => {
    const range = { view, ...visibleRangeOf(view, anchor), anchor: toDay(anchor) };
    untrack(() => actions?.onRangeChange?.(range));
  });

  function openDay(day: string) {
    actions?.onDateClick?.(day);
    if (!views.includes('day')) return;
    anchor = toDate(day);
    view = 'day';
  }

  function openMonth(month: Date) {
    if (!views.includes('month')) return;
    anchor = month;
    view = 'month';
  }

  function namesOn(day: string): string[] {
    return holidays.get(day) ?? [];
  }

  function colorOf(event: AzuosCalendarEvent): string {
    return event.color ?? 'var(--primary)';
  }

  function chipStyle(event: AzuosCalendarEvent): string {
    const color = colorOf(event);

    return `background-color: ${color}; color: ${event.contrastColor ?? contrastColorOf(color)}`;
  }

  function allDayOf(days: Date[]) {
    return days.map((date) => {
      const day = toDay(date);
      return { day, names: namesOn(day), entries: entriesOn(entries, day).filter((entry) => entry.startMinute === null) };
    });
  }

  function hoursOf(days: Date[]): number[] {
    const keys = days.map(toDay);

    return visibleHours(entries.filter((entry) => keys.includes(entry.day)));
  }

  /** A linha de agora, em fração da grade; fora dela, `null`. */
  function nowTop(day: string, hours: readonly number[]): number | null {
    const now = new Date();
    if (day !== toDay(now)) return null;
    const top = (now.getHours() * 60 + now.getMinutes() - (hours[0] ?? 0) * 60) / (hours.length * 60);

    return top < 0 || top > 1 ? null : top;
  }

  /** A bolinha do dia no ano: hoje é a cor da marca, feriado o cinza, e o resto realça no mouse. */
  function yearDayLook(day: string): string {
    if (day === today) return 'bg-primary text-primary-foreground';
    if (namesOn(day).length > 0) return 'bg-muted group-hover:bg-accent';

    return 'group-hover:bg-accent';
  }

  function yearDaySummary(day: string): string {
    return [...namesOn(day), ...entriesOn(entries, day).map((entry) => entry.event.title)].join(' · ');
  }

  function shiftLabel(step: 1 | -1): string {
    return `${step === 1 ? 'Próximo' : 'Anterior'}: ${VIEW_LABELS[view].toLowerCase()}`;
  }
</script>

{#snippet dayNumber(date: Date)}
  {@const day = toDay(date)}
  <button
    type="button"
    disabled={!isInside(day, data.validRange)}
    aria-label={`Abrir ${longDayLabel(date)}`}
    onclick={() => openDay(day)}
    class={cn(
      'hover:bg-accent flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors disabled:pointer-events-none',
      FOCUS,
      day === today && 'bg-primary text-primary-foreground hover:bg-primary',
    )}
  >
    {date.getDate()}
  </button>
{/snippet}

{#snippet eventChip(entry: Entry, isBlock: boolean)}
  {@const className = cn(
    'flex w-full min-w-0 gap-1 overflow-hidden px-1.5 py-0.5 text-left text-xs',
    isBlock ? 'rounded-box h-full items-start' : 'rounded-chip items-center',
  )}
  {#if actions?.onEventClick}
    <button
      type="button"
      title={entry.event.title}
      onclick={() => actions?.onEventClick?.(entry.event.id)}
      class={cn(className, 'cursor-pointer transition hover:shadow-xs hover:brightness-110', FOCUS)}
      style={chipStyle(entry.event)}
    >
      {#if entry.startMinute !== null}<span class="shrink-0 font-semibold">{clockOf(entry.startMinute)}</span>{/if}
      <span class="truncate">{entry.event.title}</span>
    </button>
  {:else}
    <div class={className} style={chipStyle(entry.event)} title={entry.event.title}>
      {#if entry.startMinute !== null}<span class="shrink-0 font-semibold">{clockOf(entry.startMinute)}</span>{/if}
      <span class="truncate">{entry.event.title}</span>
    </div>
  {/if}
{/snippet}

{#snippet monthView()}
  {@const weeks = monthWeeks(anchor)}
  <div role="grid" aria-label={titleOf('month', anchor)} class="flex h-full flex-col">
    <div role="row" class="grid grid-cols-7">
      {#each weeks[0]! as date (toDay(date))}
        <span role="columnheader" class="text-muted-foreground py-2 text-center text-xs font-medium">
          {weekdayLabel(date)}
        </span>
      {/each}
    </div>
    <div class="grid flex-1 auto-rows-fr">
      {#each weeks as week (toDay(week[0]!))}
        <div role="row" class="grid grid-cols-7">
          {#each week as date (toDay(date))}
            {@const day = toDay(date)}
            {@const dayEntries = entriesOn(entries, day)}
            {@const names = namesOn(day)}
            {@const isOutside = !isSameMonthOf(date, anchor) || !isInside(day, data.validRange)}
            <div
              role="gridcell"
              class={cn(
                'border-border flex flex-col gap-1 border-t border-l p-1.5 first:border-l-0',
                isFill ? 'min-h-16' : 'min-h-28',
                names.length > 0 && 'bg-muted',
              )}
            >
              <div class={cn('flex items-start justify-between gap-1', isOutside && 'text-muted-foreground')}>
                <span class="text-muted-foreground min-w-0 truncate pt-0.5 text-xs font-medium">{names.join(' · ')}</span>
                {@render dayNumber(date)}
              </div>
              <div class="flex min-w-0 flex-col gap-1">
                {#each dayEntries.slice(0, MONTH_VISIBLE_EVENTS) as entry (entry.event.id)}
                  {@render eventChip(entry, false)}
                {/each}
                {#if dayEntries.length > MONTH_VISIBLE_EVENTS}
                  <button
                    type="button"
                    onclick={() => openDay(day)}
                    class={cn('rounded-chip text-muted-foreground hover:text-foreground self-start px-1 text-xs font-semibold', FOCUS)}
                  >
                    +{dayEntries.length - MONTH_VISIBLE_EVENTS} mais
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet timeGrid(days: Date[])}
  {@const hours = hoursOf(days)}
  {@const allDay = allDayOf(days)}
  <div class="flex flex-col">
    <div class="border-border flex border-b">
      <div class="w-14 shrink-0"></div>
      {#each days as date (toDay(date))}
        <div class="border-border flex flex-1 items-center justify-center gap-1 border-l py-2">
          <span class="text-muted-foreground text-xs font-medium">{weekdayLabel(date)}</span>
          {@render dayNumber(date)}
        </div>
      {/each}
    </div>
    {#if allDay.some((cell) => cell.names.length > 0 || cell.entries.length > 0)}
      <div class="border-border flex border-b">
        <span class="text-muted-foreground flex w-14 shrink-0 items-center justify-end pr-2 text-right text-xs leading-tight">
          dia inteiro
        </span>
        {#each allDay as cell (cell.day)}
          <div class="border-border flex min-w-0 flex-1 flex-col gap-1 border-l p-1">
            {#each cell.names as name (name)}
              <span class="rounded-chip bg-muted text-muted-foreground truncate px-1.5 py-0.5 text-xs font-medium">{name}</span>
            {/each}
            {#each cell.entries as entry (entry.event.id)}
              {@render eventChip(entry, false)}
            {/each}
          </div>
        {/each}
      </div>
    {/if}
    <div class={cn('overflow-y-auto', !isFill && 'max-h-160')}>
      <div class="flex">
        <div class="w-14 shrink-0">
          {#each hours as hour, index (hour)}
            <div class="relative" style={`height: ${HOUR_HEIGHT}px`}>
              {#if index > 0}
                <span class="text-muted-foreground absolute -top-2 right-2 text-xs">{clockOf(hour * 60)}</span>
              {/if}
            </div>
          {/each}
        </div>
        {#each days as date (toDay(date))}
          {@const day = toDay(date)}
          {@const top = nowTop(day, hours)}
          <div class={cn('border-border relative flex-1 border-l', namesOn(day).length > 0 && 'bg-muted')}>
            {#each hours as hour, index (hour)}
              <div class={cn(index > 0 && 'border-border border-t')} style={`height: ${HOUR_HEIGHT}px`}></div>
            {/each}
            {#each placeTimed(entriesOn(entries, day), hours) as entry (entry.event.id)}
              <div
                class="absolute p-0.5"
                style={`top: ${entry.top * 100}%; height: ${entry.height * 100}%; left: ${entry.left * 100}%; width: ${entry.width * 100}%`}
              >
                {@render eventChip(entry, true)}
              </div>
            {/each}
            {#if top !== null}
              <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 z-10" style={`top: ${top * 100}%`}>
                <div class="bg-primary h-0.5"></div>
                <div class="bg-primary absolute -top-1 -left-1 size-2.5 rounded-full"></div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>
{/snippet}

{#snippet listView()}
  {@const days = listDays(anchor, entries, holidays)}
  {#if days.length === 0}
    <div class="text-muted-foreground flex flex-col items-center justify-center gap-2 py-16">
      <CalendarX2 aria-hidden="true" class="size-8" />
      <p class="text-sm">Nada neste mês.</p>
    </div>
  {:else}
    <div class={cn('flex flex-col gap-5 overflow-y-auto p-4', !isFill && 'max-h-160')}>
      {#each days as day (day)}
        <section aria-label={longDayLabel(toDate(day))} class="flex flex-col gap-2">
          <h3 class="text-sm font-semibold first-letter:uppercase">{longDayLabel(toDate(day))}</h3>
          {#each namesOn(day) as name (name)}
            <p class="rounded-box bg-muted text-muted-foreground px-3 py-2 text-sm">Feriado · {name}</p>
          {/each}
          {#each entriesOn(entries, day) as entry (entry.event.id)}
            <button
              type="button"
              disabled={!actions?.onEventClick}
              onclick={() => actions?.onEventClick?.(entry.event.id)}
              class={cn(
                'rounded-control hover:bg-hover-veil flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors disabled:pointer-events-none',
                FOCUS,
              )}
            >
              <span aria-hidden="true" class="size-2.5 shrink-0 rounded-full" style={`background-color: ${colorOf(entry.event)}`}></span>
              <span class="text-muted-foreground w-20 shrink-0">
                {entry.startMinute === null ? 'Dia inteiro' : clockOf(entry.startMinute)}
              </span>
              <span class="min-w-0 truncate font-medium">{entry.event.title}</span>
            </button>
          {/each}
        </section>
      {/each}
    </div>
  {/if}
{/snippet}

{#snippet yearView()}
  <div class="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {#each yearMonths(anchor) as month (toDay(month))}
      {@const weeks = monthWeeks(month)}
      <div class="rounded-box bg-muted flex flex-col overflow-hidden">
        <button
          type="button"
          onclick={() => openMonth(month)}
          class={cn('border-border hover:bg-hover-veil border-b px-3 py-2 text-sm font-semibold first-letter:uppercase', FOCUS)}
        >
          {monthLabel(month)}
        </button>
        <div class="grid grid-cols-7 gap-0.5 p-2 text-center">
          {#each weeks[0]! as date (toDay(date))}
            <span class="text-muted-foreground text-xs font-medium">{weekdayInitial(date)}</span>
          {/each}
          {#each weeks.flat() as date (toDay(date))}
            {@const day = toDay(date)}
            {#if !isSameMonthOf(date, month)}
              <span aria-hidden="true"></span>
            {:else}
              {@const summary = yearDaySummary(day)}
              <button
                type="button"
                title={summary || undefined}
                disabled={!isInside(day, data.validRange)}
                aria-label={[longDayLabel(date), summary].filter(Boolean).join(': ')}
                onclick={() => openDay(day)}
                class={cn('group rounded-chip flex h-10 flex-col items-center justify-center gap-0.5 text-xs disabled:pointer-events-none', FOCUS)}
              >
                <span class={cn('flex size-7 items-center justify-center rounded-full font-medium', yearDayLook(day))}>
                  {date.getDate()}
                </span>
                <span class="flex h-1.5 gap-0.5">
                  {#each entriesOn(entries, day).slice(0, 3) as entry (entry.event.id)}
                    <span class="size-1.5 rounded-full" style={`background-color: ${colorOf(entry.event)}`}></span>
                  {/each}
                </span>
              </button>
            {/if}
          {/each}
        </div>
      </div>
    {/each}
  </div>
{/snippet}

<section
  aria-label={ui.ariaLabel}
  aria-busy={calendarState?.isLoading || undefined}
  data-slot="event-calendar"
  class={cn(
    'rounded-surface bg-card shadow-card text-foreground relative flex min-w-0 flex-col overflow-hidden',
    isFill && 'h-full',
    ui.className,
  )}
>
  {#if calendarState?.isLoading}
    <span role="status" class="rounded-chip bg-card text-muted-foreground absolute top-2 right-2 z-20 px-2 py-0.5 text-xs shadow-xs">
      Carregando…
    </span>
  {/if}
  <!-- A barra: hoje, anterior e próximo e o título à esquerda; as visões à direita, no mesmo
       segmentado de "Lista | Cards | Quadro" — um jeito só de trocar de visão no sistema. -->
  <header class="border-border flex flex-wrap items-center justify-between gap-3 border-b p-3">
    <div class="flex min-w-0 flex-wrap items-center gap-2">
      <ActionButton
        data={{ label: 'Hoje' }}
        ui={{ variant: 'secondary', size: 'sm' }}
        state={{ isDisabled: !isInside(today, data.validRange) }}
        actions={{ onClick: () => (anchor = todayDate()) }}
      />
      <div class="flex items-center gap-1">
        {#each [-1, 1] as const as step (step)}
          <ActionButton
            data={{ label: shiftLabel(step) }}
            ui={{ variant: 'secondary', size: 'sm', isIconOnly: true, icon: step === 1 ? ChevronRight : ChevronLeft }}
            state={{ isDisabled: !canShift(view, anchor, step, data.validRange) }}
            actions={{ onClick: () => (anchor = shiftAnchor(view, anchor, step)) }}
          />
        {/each}
      </div>
      <h2 class="truncate text-lg font-semibold first-letter:uppercase">{titleOf(view, anchor)}</h2>
    </div>
    {#if views.length > 1}
      <SegmentedControl
        data={{ value: view, options: views.map((value) => ({ value, label: VIEW_LABELS[value] })) }}
        ui={{ ariaLabel: 'Visualização do calendário' }}
        actions={{ onChange: (value) => (view = value as AzuosCalendarView) }}
      />
    {/if}
  </header>
  <div class={cn('min-h-0', isFill && 'flex-1 overflow-auto')}>
    {#if view === 'week'}
      {@render timeGrid(weekDays(anchor))}
    {:else if view === 'day'}
      {@render timeGrid([anchor])}
    {:else if view === 'list'}
      {@render listView()}
    {:else if view === 'year'}
      {@render yearView()}
    {:else}
      {@render monthView()}
    {/if}
  </div>
</section>
