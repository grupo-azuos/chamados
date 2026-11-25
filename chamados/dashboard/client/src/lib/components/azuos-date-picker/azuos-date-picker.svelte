<!--
  @component
  A escolha de uma data, num calendário em português que abre num balão a partir de um botão.

  O VALOR ENTRA E SAI COMO TEXTO ISO (`2026-10-20`), e não como `Date`: é o formato do contrato
  (schema Zod, coluna do banco, corpo da API). Por dentro o calendário trabalha com a data do
  `@internationalized/date`, que não carrega fuso; escolher um dia entrega o texto ISO, fecha o
  balão e chama `onBlur`.

  O calendário é o `AzuosCalendar`, igual ao do template: o mês e o ano trocam no próprio título,
  pelo `AzuosCalendarDropdown`, entre as duas setas. O campo escondido existe para o formulário
  nativo enxergar o valor: sem ele, um `FormData` do formulário em volta não traria a data.

  Props soltas (não nos quatro grupos): `value` (bindable), `placeholder`, `disabled`, `name`, `id`,
  os `aria-*` e os retornos `onValueChange` e `onBlur`.
-->
<script lang="ts">
  import {
    DateFormatter,
    type DateValue,
    getLocalTimeZone,
    parseDate,
    today,
  } from "@internationalized/date";
  import { Calendar as CalendarIcon } from "lucide-svelte";
  import { cn } from "$lib/utils/cn";
  import { Button } from "$lib/components/ui/button";
  import AzuosCalendar from "$lib/components/azuos-calendar/azuos-calendar.svelte";
  import * as Popover from "$lib/components/ui/popover";

  let {
    value = $bindable(),
    placeholder = "Selecione uma data",
    disabled = false,
    class: className,
    name,
    ariaLabel,
    id,
    ariaInvalid = false,
    ariaDescribedBy,
    onBlur,
    onValueChange,
  }: {
    value?: string | DateValue | null;
    placeholder?: string;
    disabled?: boolean;
    class?: string;
    name?: string;
    ariaLabel?: string;
    id?: string;
    ariaInvalid?: boolean;
    ariaDescribedBy?: string;
    onBlur?: () => void;
    onValueChange?: (val: string | null) => void;
  } = $props();

  const df = new DateFormatter("pt-BR", {
    dateStyle: "medium",
  });

  let internalDate: DateValue | undefined = $state.raw(undefined);
  let calendarPage: DateValue = $state.raw(today(getLocalTimeZone()));
  let isOpen = $state(false);
  $effect(() => {
    if (!value) {
      internalDate = undefined;
      return;
    }
    if (typeof value !== "string") {
      internalDate = value;
      calendarPage = value;
      return;
    }

    const clean = value.split("T")[0] ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      internalDate = undefined;
      return;
    }

    try {
      const parsedDate = parseDate(clean);
      internalDate = parsedDate;
      calendarPage = parsedDate;
    } catch {
      internalDate = undefined;
    }
  });

  function handleSelect(newVal: DateValue | undefined) {
    internalDate = newVal;
    if (newVal) {
      const isoStr = newVal.toString();
      value = isoStr;
      onValueChange?.(isoStr);
    } else {
      value = null;
      onValueChange?.(null);
    }
    isOpen = false;
    onBlur?.();
  }

  let displayLabel = $derived.by(() => {
    if (internalDate) {
      return df.format(internalDate.toDate(getLocalTimeZone()));
    }
    return placeholder;
  });
</script>

<div class={cn("relative inline-block w-full", className)}>
  <input
    type="hidden"
    {name}
    value={typeof value === 'string' ? value : (internalDate ? internalDate.toString() : '')}
    {disabled}
  />
  <Popover.Root bind:open={isOpen} onOpenChange={(open) => !open && onBlur?.()}>
    <Popover.Trigger>
      {#snippet child({ props })}
        <!-- `props` (do Bits UI) vem PRIMEIRO, não por último: ele carrega o próprio `class`
             do trigger, e espalhado depois do nosso apagava a altura e o resto do estilo aqui
             embaixo sem erro nenhum no console — o botão só voltava ao tamanho padrão. -->
        <Button
          {...props}
          {id}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          variant="outline"
          class={cn(
            /* O degrau `lg` da régua de medidas: este campo fica ao lado de um `AzuosTextField`
               num formulário, e tem de ter a altura dele. */
            'control-lg rounded-control',
            /* Fundo sólido de campo, também no escuro: a variante `outline` do `ui/button` traz
               `dark:bg-input/30`, e só a mesma variante (`dark:`) a derruba. */
            'border-input bg-muted text-foreground hover:bg-accent/40 dark:bg-muted dark:hover:bg-accent/40 w-full justify-start text-left font-normal shadow-xs transition-colors',
            !internalDate && 'text-muted-foreground',
          )}
          {disabled}
          onblur={() => !isOpen && onBlur?.()}
        >
          <CalendarIcon class="mr-2.5 size-4 text-muted-foreground" aria-hidden="true" />
          <span class="min-w-0 truncate" title={displayLabel}>{displayLabel}</span>
        </Button>
      {/snippet}
    </Popover.Trigger>
    <!-- Centralizado embaixo do campo, como todo menu — a mesma caixa do template. -->
    <Popover.Content
      sideOffset={6}
      class="rounded-surface bg-popover ring-foreground/8 w-auto border-transparent p-0 shadow-xl ring-1"
      align="center"
      aria-label={ariaLabel ? `Selecionar ${ariaLabel.toLowerCase()}` : 'Selecionar data'}
    >
      <AzuosCalendar
        data={{ value: internalDate, month: calendarPage }}
        ui={{ className: 'rounded-control border-0 p-3' }}
        state={{ isDisabled: disabled }}
        actions={{ onValueChange: handleSelect, onMonthChange: (date) => (calendarPage = date) }}
      />
    </Popover.Content>
  </Popover.Root>
</div>
