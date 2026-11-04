<script lang="ts" module>
  /**
   * A escolha de uma data EM TRÊS PERGUNTAS: o ano, depois o mês, depois o dia.
   *
   * Um calendário comum abre no mês de hoje, e quem vai informar a data de compra de uma máquina
   * antiga escolhe o dia e não percebe que o ano continua sendo o atual. Aqui a ordem é a da
   * resposta mais larga para a mais estreita, e cada tela faz UMA pergunta. O que já foi
   * respondido fica no topo, como botão: tocar nele volta àquela pergunta.
   *
   * É só o painel — não abre nem fecha nada. Quem o põe dentro de um balão é o `AzuosDateField`.
   *
   * O valor entra e sai como texto ISO (`1990-03-25`): é o formato do contrato, e montar o texto
   * pelos números escolhidos não tem fuso para errar.
   */
  export type AzuosDateStepperProps = {
    data: {
      /** A data em ISO (`1990-03-25`), ou vazio quando ninguém escolheu. */
      value: string | null;
      /** A primeira data que pode ser escolhida, em ISO. */
      min?: string;
      /** A última data que pode ser escolhida, em ISO. */
      max?: string;
    };
    ui?: {
      /** O ano que a lista mostra ao abrir vazia. Sem ele, a lista abre no ano atual. */
      startYear?: number;
      className?: string;
    };
    actions: { onChange: (value: string) => void };
  };

  export type Step = 'year' | 'month' | 'day';
  export type DateParts = { year: number; month: number; day: number };

  export const QUESTIONS: Record<Step, string> = {
    year: 'Qual é o ano?',
    month: 'Qual é o mês?',
    day: 'Qual é o dia?',
  };

  /** Quantos anos para trás e para a frente a lista cobre quando a tela não dá limite. */
  const YEARS_BACK = 120;
  const YEARS_AHEAD = 10;

  const MONTH_NAME = new Intl.DateTimeFormat('pt-BR', { month: 'long' });

  /** Os doze meses por extenso, com a primeira letra maiúscula ("Março"). */
  export const MONTHS = Array.from({ length: 12 }, (_, index) => {
    const name = MONTH_NAME.format(new Date(2024, index, 1, 12));

    return name.charAt(0).toUpperCase() + name.slice(1);
  });

  const WEEKDAYS = [
    { short: 'D', long: 'Domingo' },
    { short: 'S', long: 'Segunda-feira' },
    { short: 'T', long: 'Terça-feira' },
    { short: 'Q', long: 'Quarta-feira' },
    { short: 'Q', long: 'Quinta-feira' },
    { short: 'S', long: 'Sexta-feira' },
    { short: 'S', long: 'Sábado' },
  ];

  /** `1990-03-25` → `{ year: 1990, month: 2, day: 25 }` (mês contado do zero, como no `Date`). */
  export function partsOf(iso: string | null | undefined): DateParts | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
    if (!match) return null;

    return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) };
  }

  export function isoOf(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  export function daysIn(year: number, month: number): number {
    return new Date(year, month + 1, 0, 12).getDate();
  }

  /** O mês inteiro está fora do limite? Basta conferir o último e o primeiro dia dele. */
  export function isMonthOut(year: number, month: number, min?: string, max?: string): boolean {
    if (min && isoOf(year, month, daysIn(year, month)) < min.slice(0, 10)) return true;
    if (max && isoOf(year, month, 1) > max.slice(0, 10)) return true;

    return false;
  }

  /** A lista de anos, do mais antigo ao mais novo, respeitando o limite da tela. */
  export function yearsBetween(min: string | undefined, max: string | undefined, today: DateParts): number[] {
    const first = partsOf(min)?.year ?? today.year - YEARS_BACK;
    const last = partsOf(max)?.year ?? today.year + YEARS_AHEAD;

    return Array.from({ length: Math.max(last - first + 1, 1) }, (_, index) => first + index);
  }

</script>

<script lang="ts">
  import { isIsoWithin } from '$lib/utils/date-input.util';
  import { cn } from '$lib/utils/cn';

  let { data, ui, actions }: AzuosDateStepperProps = $props();

  // svelte-ignore state_referenced_locally
  const initial = partsOf(data.value);
  /* Com data já escolhida, abre direto no dia: quem volta para corrigir quase sempre errou o dia.
     Vazio, começa pela primeira pergunta. */
  let step = $state<Step>(initial ? 'day' : 'year');
  let year = $state<number | null>(initial?.year ?? null);
  let month = $state<number | null>(initial?.month ?? null);

  const selected = $derived(partsOf(data.value));
  const now = new Date();
  const today: DateParts = { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  const focusYear = $derived(year ?? ui?.startYear ?? today.year);

  function cellClass(cell: { isSelected: boolean; isToday?: boolean }, extra: string) {
    return cn(
      'rounded-control text-foreground hover:bg-accent cursor-pointer border border-transparent text-sm transition-colors outline-none',
      'focus-visible:ring-ring/50 focus-visible:ring-[3px]',
      'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-inherit',
      cell.isToday && 'bg-primary-soft text-primary font-semibold',
      cell.isSelected && 'bg-primary text-primary-foreground hover:bg-primary font-semibold',
      extra,
    );
  }

  function chooseYear(value: number) {
    year = value;
    step = 'month';
  }

  function chooseMonth(value: number) {
    month = value;
    step = 'day';
  }

  function chooseDay(day: number) {
    if (year === null || month === null) return;
    actions.onChange(isoOf(year, month, day));
  }

  /* A lista tem mais de cem anos e rola. O ano de partida nasce no meio da área visível — sem
     isso ela abriria em 1906 e a pessoa teria de rolar um século. */
  function centerIf(node: HTMLElement, isFocus: boolean) {
    if (isFocus) node.scrollIntoView({ block: 'center' });
  }
</script>

<div class={cn('flex w-72 flex-col gap-3 p-3', ui?.className)}>
  <div class="flex flex-col gap-2">
    <p class="text-ink-900 text-sm font-semibold" aria-live="polite">{QUESTIONS[step]}</p>
    {#if step !== 'year' && year !== null}
      <div class="flex flex-wrap items-center gap-1.5">
        {@render answerChip('Ano', String(year), () => (step = 'year'))}
        {#if step === 'day' && month !== null}
          {@render answerChip('Mês', MONTHS[month] ?? '', () => (step = 'month'))}
        {/if}
      </div>
    {/if}
  </div>

  {#if step === 'year'}
    <div role="group" aria-label="Anos" class="grid max-h-60 grid-cols-4 gap-1 overflow-y-auto pr-1">
      {#each yearsBetween(data.min, data.max, today) as option (option)}
        <button
          use:centerIf={option === focusYear}
          type="button"
          aria-pressed={option === year}
          onclick={() => chooseYear(option)}
          class={cellClass({ isSelected: option === year, isToday: option === today.year }, 'control-md w-full px-0!')}
        >
          {option}
        </button>
      {/each}
    </div>
  {:else if step === 'month' && year !== null}
    {@const shownYear = year}
    <div role="group" aria-label={`Meses de ${shownYear}`} class="grid grid-cols-3 gap-1">
      {#each MONTHS as name, index (name)}
        <button
          type="button"
          disabled={isMonthOut(shownYear, index, data.min, data.max)}
          aria-pressed={index === month}
          onclick={() => chooseMonth(index)}
          class={cellClass(
            { isSelected: index === month, isToday: shownYear === today.year && index === today.month },
            'control-lg w-full px-0!',
          )}
        >
          {name}
        </button>
      {/each}
    </div>
  {:else if step === 'day' && year !== null && month !== null}
    {@const shownYear = year}
    {@const shownMonth = month}
    {@const blanks = new Date(shownYear, shownMonth, 1, 12).getDay()}
    {@const isSameMonth = (parts: DateParts | null) => parts?.year === shownYear && parts.month === shownMonth}
    <div class="flex flex-col gap-1">
      <div class="grid grid-cols-7 gap-0.5" aria-hidden="true">
        {#each WEEKDAYS as weekday (weekday.long)}
          <span title={weekday.long} class="text-ink-500 py-1 text-center text-xs font-medium">{weekday.short}</span>
        {/each}
      </div>
      <!-- Os espaços vazios antes do dia 1 põem cada dia embaixo do dia da semana certo. -->
      <div
        role="group"
        aria-label={`Dias de ${MONTHS[shownMonth] ?? ''} de ${shownYear}`}
        class="grid grid-cols-7 justify-items-center gap-0.5"
      >
        {#each { length: blanks } as _, index (index)}
          <span aria-hidden="true"></span>
        {/each}
        {#each { length: daysIn(shownYear, shownMonth) } as _, index (index)}
          {@const day = index + 1}
          {@const isSelected = isSameMonth(selected) && selected?.day === day}
          <button
            type="button"
            disabled={!isIsoWithin(isoOf(shownYear, shownMonth, day), data.min, data.max)}
            aria-pressed={isSelected}
            onclick={() => chooseDay(day)}
            class={cellClass({ isSelected, isToday: isSameMonth(today) && today.day === day }, 'control-icon-md')}
          >
            {day}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

{#snippet answerChip(label: string, value: string, onClick: () => void)}
  <button
    type="button"
    onclick={onClick}
    aria-label={`${label}: ${value}. Trocar`}
    class="control-sm rounded-control border-border bg-muted text-ink-700 hover:bg-accent focus-visible:ring-ring/50 inline-flex cursor-pointer items-center gap-1 border text-xs transition-colors outline-none focus-visible:ring-[3px]"
  >
    <span class="text-ink-500">{label}:</span>
    <span class="text-ink-900 font-semibold">{value}</span>
    <span class="text-primary font-medium underline">trocar</span>
  </button>
{/snippet}
