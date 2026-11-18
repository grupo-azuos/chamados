<script lang="ts" module>
  import { displayFromIso } from '$lib/utils/date-input.util';

  /**
   * O campo de PERÍODO: de uma data até outra, para filtro e para comparar intervalos.
   *
   * Dois calendários lado a lado, porque um período quase sempre atravessa dois meses e num
   * calendário só a pessoa perde de vista onde começou. O mês e o ano trocam pelo seletor do
   * projeto em cima dos calendários — sem ele, voltar um ano são doze toques na seta.
   *
   * Em cima ficam os campos "De" e "Até", digitáveis (`dd/mm/aaaa`): quem sabe as datas de cor não
   * precisa procurar o dia, e digitar uma data leva o calendário até ela.
   *
   * NADA É ENTREGUE ANTES DO "APLICAR". Escolher um período são dois toques, e entregar o primeiro
   * faria a tela de trás recarregar com meio período. "Limpar" esvazia e entrega na hora.
   *
   * O valor entra e sai como dois textos ISO (`{ from: '2026-03-01', to: '2026-03-31' }`). Os dois
   * campos escondidos levam `<name>From` e `<name>To` para o formulário nativo.
   */
  export type AzuosDateRange = { from: string | null; to: string | null };

  export type AzuosDateRangeFieldProps = {
    data: {
      label: string;
      name: string;
      value: AzuosDateRange;
      /** A primeira data aceita, em ISO. */
      min?: string;
      /** A última data aceita, em ISO. */
      max?: string;
    };
    ui?: { placeholder?: string; className?: string };
    state?: { error?: string | null; isDisabled?: boolean };
    actions: { onChange: (value: AzuosDateRange) => void };
  };

  export const EMPTY_RANGE: AzuosDateRange = { from: null, to: null };

  /** O período do jeito que aparece no campo fechado. */
  export function rangeLabel(value: AzuosDateRange): string {
    if (value.from && value.to) return `${displayFromIso(value.from)} até ${displayFromIso(value.to)}`;
    if (value.from) return `A partir de ${displayFromIso(value.from)}`;
    if (value.to) return `Até ${displayFromIso(value.to)}`;

    return '';
  }

  /**
   * O período em ordem: se a pessoa digitou o fim antes do começo, as duas datas trocam de lugar.
   * Recusar seria pior — ela disse as duas datas certas, só na ordem errada.
   */
  export function orderedRange(value: AzuosDateRange): AzuosDateRange {
    if (value.from && value.to && value.from > value.to) return { from: value.to, to: value.from };

    return value;
  }
</script>

<script lang="ts">
  import CalendarRange from '@lucide/svelte/icons/calendar-range';
  import { type DateValue, getLocalTimeZone, parseDate, today } from '@internationalized/date';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import SelectField from '$lib/components/azuos-select-field/azuos-select-field.svelte';
  import * as Popover from '$lib/components/ui/popover';
  import { RangeCalendar } from '$lib/components/ui/range-calendar';
  import { isIsoWithin, isoFromDisplay, maskDateInput } from '$lib/utils/date-input.util';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: fieldState, actions }: AzuosDateRangeFieldProps = $props();

  const triggerId = `range-${Math.random().toString(36).slice(2, 9)}`;
  const errorId = `${triggerId}-error`;

  let isOpen = $state(false);
  /* O rascunho do balão: abrir de novo recomeça do valor que está valendo — quem fechou sem
     aplicar não encontra meio período escolhido. */
  let draft = $state<AzuosDateRange>(EMPTY_RANGE);
  let typed = $state<{ from: string | null; to: string | null }>({ from: null, to: null });
  let page = $state.raw<DateValue>(today(getLocalTimeZone()));

  const error = $derived(fieldState?.error ?? null);
  const label = $derived(rangeLabel(data.value));
  const isComplete = $derived(Boolean(draft.from && draft.to));

  const MONTH_NAME = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' });
  const monthOptions = Array.from({ length: 12 }, (_, index) => ({
    value: String(index + 1),
    label: MONTH_NAME.format(new Date(Date.UTC(2024, index, 1))),
  }));
  const yearOptions = $derived.by(() => {
    const now = today(getLocalTimeZone()).year;
    const first = data.min ? parseDate(data.min).year : now - 100;
    const last = data.max ? parseDate(data.max).year : now + 10;

    return Array.from({ length: last - first + 1 }, (_, index) => ({
      value: String(first + index),
      label: String(first + index),
    }));
  });

  function dateOf(iso: string | null): DateValue | undefined {
    return iso ? parseDate(iso) : undefined;
  }

  function changeOpen(next: boolean) {
    isOpen = next;
    if (!next) return;
    draft = { ...data.value };
    typed = { from: null, to: null };
    page = dateOf(data.value.from) ?? today(getLocalTimeZone());
  }

  function deliver(value: AzuosDateRange) {
    actions.onChange(value);
    isOpen = false;
  }

  /** Uma ponta digitada: entrega só completa, válida e dentro do limite; apagada, entrega vazio. */
  function typeEdge(edge: keyof AzuosDateRange, raw: string) {
    const text = maskDateInput(raw);
    typed[edge] = text;
    if (text === '') {
      draft[edge] = null;
      return;
    }
    const iso = isoFromDisplay(text);
    if (!iso || !isIsoWithin(iso, data.min, data.max)) return;
    draft[edge] = iso;
    page = parseDate(iso);
  }
</script>

<div class={cn('flex flex-col gap-1.5', ui?.className)}>
  <label for={triggerId} class="text-ink-700 text-sm font-medium">{data.label}</label>
  <input type="hidden" name={`${data.name}From`} value={data.value.from ?? ''} />
  <input type="hidden" name={`${data.name}To`} value={data.value.to ?? ''} />
  <Popover.Root bind:open={() => isOpen, changeOpen}>
    <Popover.Trigger>
      {#snippet child({ props })}
        <button
          {...props}
          id={triggerId}
          type="button"
          disabled={fieldState?.isDisabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          class={cn(
            'control-lg rounded-control bg-muted hover:bg-accent flex w-full cursor-pointer items-center gap-2.5 border text-left text-sm transition-colors outline-none',
            'focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-60',
            error ? 'border-border bg-destructive-soft' : 'border-input',
            label ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          <CalendarRange class="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
          <span class="truncate">{label || ui?.placeholder || 'Selecione o período'}</span>
        </button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content
      align="start"
      class="rounded-surface border-border bg-card w-auto max-w-[calc(100vw-2rem)] overflow-x-auto p-0 shadow-xl"
    >
      <div class="flex flex-col gap-3 p-3">
        <div class="grid grid-cols-2 gap-3">
          {#each [['from', 'De'], ['to', 'Até']] as const as [edge, edgeLabel] (edge)}
            <label class="flex min-w-0 flex-col gap-1">
              <span class="text-ink-700 text-xs font-medium">{edgeLabel}</span>
              <!-- Ao sair, o campo volta a mostrar a data que está valendo: texto pela metade some. -->
              <input
                inputmode="numeric"
                autocomplete="off"
                placeholder="dd/mm/aaaa"
                maxlength={10}
                value={typed[edge] ?? displayFromIso(draft[edge])}
                oninput={(event) => typeEdge(edge, event.currentTarget.value)}
                onblur={() => (typed[edge] = null)}
                class="control-lg rounded-control bg-muted text-foreground border-input placeholder:text-ink-500 focus-visible:ring-ring/50 w-full min-w-0 border text-sm outline-none focus-visible:ring-[3px]"
              />
            </label>
          {/each}
        </div>
        <div class="grid grid-cols-2 gap-2">
          <SelectField
            data={{ value: String(page.month), options: monthOptions }}
            ui={{ ariaLabel: 'Mês', className: 'w-full capitalize' }}
            actions={{ onChange: (value) => (page = page.set({ month: Number(value) })) }}
          />
          <SelectField
            data={{ value: String(page.year), options: yearOptions }}
            ui={{ ariaLabel: 'Ano', className: 'w-full tabular-nums' }}
            actions={{ onChange: (value) => (page = page.set({ year: Number(value) })) }}
          />
        </div>
        <!-- Sem os dias do mês vizinho: com dois calendários lado a lado, o fim de março aparecia
             de novo no começo do quadro de abril, e o período parecia marcado duas vezes. -->
        <RangeCalendar
          value={{ start: dateOf(draft.from), end: dateOf(draft.to) }}
          onValueChange={(range) => (draft = { from: range.start?.toString() ?? null, to: range.end?.toString() ?? null })}
          placeholder={page}
          onPlaceholderChange={(next) => (page = next)}
          minValue={dateOf(data.min ?? null)}
          maxValue={dateOf(data.max ?? null)}
          numberOfMonths={2}
          locale="pt-BR"
          fixedWeeks={false}
          class="rounded-control border-0 p-0"
        />
        <div class="border-border flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <p class="text-ink-500 text-xs" aria-live="polite">
            {isComplete ? rangeLabel(orderedRange(draft)) : 'Escolha a data de início e a de fim.'}
          </p>
          <div class="flex items-center gap-2">
            <ActionButton data={{ label: 'Limpar' }} ui={{ variant: 'ghost' }} actions={{ onClick: () => deliver(EMPTY_RANGE) }} />
            <!-- Só dá para aplicar um período inteiro: com uma data só, a tela de trás não saberia
                 se é "a partir de" ou "até". -->
            <ActionButton
              data={{ label: 'Aplicar' }}
              state={{ isDisabled: !isComplete }}
              actions={{ onClick: () => deliver(orderedRange(draft)) }}
            />
          </div>
        </div>
      </div>
    </Popover.Content>
  </Popover.Root>
  {#if error}
    <p id={errorId} role="alert" class="text-destructive text-xs font-medium">{error}</p>
  {/if}
</div>
