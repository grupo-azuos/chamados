<!--
  @component
  CAMPO DE MÊS — rótulo, botão com os doze meses e erro, no formato "AAAA-MM".

  O campo de mês nativo do navegador herda o seletor do sistema operacional, que muda de navegador
  para navegador e não combina com os campos ao lado.

  O ano é a navegação, e os doze meses aparecem de uma vez: filtro de mês quase sempre é "este
  ano" ou "o ano passado", e folhear mês a mês seria doze cliques para voltar um ano.

  O valor continua sendo "AAAA-MM", igual ao campo nativo — quem usa não sabe que trocou.

  - `data`: o valor, o rótulo (com ele vira campo de formulário; sem, é filtro de lista) e o `name`.
  - `ui`: o texto de convite, o nome para leitor de tela e classes extras.
  - `state`: erro, desabilitado e obrigatório.
  - `actions`: `onChange`, com o novo "AAAA-MM".
-->
<script lang="ts" module>
  import { formatCalendarMonth } from '$lib/utils/format-date';

  export type AzuosMonthPickerFieldProps = {
    data: {
      value: string;
      /** Com rótulo ele vira campo de formulário; sem, continua o filtro de lista. */
      label?: string;
      name?: string;
    };
    ui?: { placeholder?: string; ariaLabel?: string; className?: string };
    state?: { error?: string | null; isDisabled?: boolean; isRequired?: boolean };
    actions: { onChange: (value: string) => void };
  };

  const SHORT_MONTH = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });

  /**
   * O que o botão mostra: o mês escolhido por extenso, ou o convite para escolher um. Mês que não
   * existe ("2026-13", vindo de importação) cai no convite, e não numa data inventada.
   */
  export function triggerLabel(value: string, placeholder?: string): string {
    const label = formatCalendarMonth(value);
    if (value && label !== '—') return label;

    return placeholder ?? 'Escolher mês';
  }

  /** "jan", "fev"… sem o ponto que o `Intl` acrescenta em alguns navegadores. */
  export function shortMonth(monthIso: string): string {
    const month = Number(monthIso.slice(5, 7));

    return SHORT_MONTH.format(new Date(Date.UTC(2026, month - 1, 1))).replace('.', '');
  }
</script>

<script lang="ts">
  import CalendarRange from '@lucide/svelte/icons/calendar-range';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';

  import { FIELD_CONTROL_CLASS } from '$lib/components/azuos-rich-text-field/azuos-rich-text-field.svelte';
  import * as Popover from '$lib/components/ui/popover';
  import { todayIso } from '$lib/utils/calendar-date.util';
  import { monthOfIso, monthsOfYear, shiftYear, yearOfMonth } from '$lib/utils/calendar-grid.util';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: fieldState, actions }: AzuosMonthPickerFieldProps = $props();

  const fieldId = `month-${Math.random().toString(36).slice(2, 9)}`;
  const errorId = `${fieldId}-error`;
  const currentMonth = monthOfIso(todayIso());

  let isOpen = $state(false);
  let year = $state('');

  const error = $derived(fieldState?.error ?? null);

  /** O ano em que o seletor abre: o do valor, ou o ano corrente quando está vazio. */
  function openingYear(value: string): string {
    return yearOfMonth(value) || yearOfMonth(currentMonth);
  }

  /* Reabrir volta ao ano do valor, e não ao ano que a pessoa estava folheando quando fechou. */
  function changeOpen(open: boolean) {
    isOpen = open;
    if (open) year = openingYear(data.value);
  }

  function pick(monthIso: string) {
    actions.onChange(monthIso);
    isOpen = false;
  }
</script>

<div class={cn('flex flex-col gap-1.5', ui?.className)}>
  {#if data.label}
    <label for={fieldId} class="text-ink-700 text-sm font-medium">
      {data.label}
      {#if fieldState?.isRequired}
        <span class="text-destructive" aria-hidden="true"> *</span>
      {/if}
    </label>
  {/if}
  <Popover.Root bind:open={() => isOpen, changeOpen}>
    <Popover.Trigger>
      {#snippet child({ props })}
        <button
          {...props}
          id={fieldId}
          name={data.name}
          type="button"
          disabled={fieldState?.isDisabled}
          aria-label={ui?.ariaLabel}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          class={cn(
            FIELD_CONTROL_CLASS,
            'flex items-center gap-2 text-left',
            'hover:bg-accent/40 focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]',
            'disabled:cursor-not-allowed disabled:opacity-60',
            error ? 'bg-destructive-soft border-transparent' : 'border-transparent',
            data.value ? 'text-foreground' : 'text-ink-500',
          )}
        >
          <CalendarRange class="text-ink-500 size-4 shrink-0" aria-hidden="true" />
          <span class="truncate capitalize">{triggerLabel(data.value, ui?.placeholder)}</span>
        </button>
      {/snippet}
    </Popover.Trigger>
    <!-- `gap-0` desfaz o espaçamento do `ui/popover`: o respiro entre o ano, a grade e o rodapé
         vem das margens de cada bloco. -->
    <Popover.Content
      sideOffset={6}
      class="rounded-surface bg-popover ring-foreground/8 w-auto gap-0 border-transparent p-3 shadow-xl ring-1"
      align="center"
    >
      <div class="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onclick={() => (year = shiftYear(year, -1))}
          aria-label="Ano anterior"
          class="rounded-control text-ink-500 hover:bg-accent hover:text-ink-900 p-1.5 transition-colors"
        >
          <ChevronLeft class="size-4" aria-hidden="true" />
        </button>
        <!-- `aria-live` para o leitor de tela anunciar a troca de ano sem reler a grade inteira. -->
        <span aria-live="polite" class="text-ink-700 text-sm font-semibold tabular-nums">{year}</span>
        <button
          type="button"
          onclick={() => (year = shiftYear(year, 1))}
          aria-label="Próximo ano"
          class="rounded-control text-ink-500 hover:bg-accent hover:text-ink-900 p-1.5 transition-colors"
        >
          <ChevronRight class="size-4" aria-hidden="true" />
        </button>
      </div>
      <div role="group" aria-label="Meses" class="grid w-56 grid-cols-3 gap-1">
        {#each monthsOfYear(year) as monthIso (monthIso)}
          {@const isSelected = monthIso === data.value}
          <button
            type="button"
            aria-label={formatCalendarMonth(monthIso)}
            aria-pressed={isSelected}
            onclick={() => pick(monthIso)}
            class={cn(
              'rounded-control hover:bg-accent focus-visible:ring-ring px-2 py-2 text-sm capitalize transition-colors',
              'focus-visible:ring-2 focus-visible:outline-none',
              monthIso === currentMonth && !isSelected && 'text-brand-blue-800 font-bold',
              isSelected && 'bg-primary text-primary-foreground hover:bg-primary font-bold',
            )}
          >
            {shortMonth(monthIso)}
          </button>
        {/each}
      </div>
      <!-- O `Limpar` só aparece com mês escolhido: um botão que não tem o que limpar ensina a
           pessoa a ignorar o rodapé. -->
      <div class="border-border mt-2 flex items-center justify-between border-t pt-2">
        <button
          type="button"
          onclick={() => pick(currentMonth)}
          class="text-brand-blue-800 dark:text-foreground text-xs font-semibold hover:underline"
        >
          Este mês
        </button>
        {#if data.value}
          <button
            type="button"
            onclick={() => pick('')}
            class="text-ink-500 hover:text-ink-900 text-xs font-medium hover:underline"
          >
            Limpar
          </button>
        {/if}
      </div>
    </Popover.Content>
  </Popover.Root>
  {#if error}
    <p id={errorId} role="alert" class="text-destructive text-xs font-medium">{error}</p>
  {/if}
</div>
