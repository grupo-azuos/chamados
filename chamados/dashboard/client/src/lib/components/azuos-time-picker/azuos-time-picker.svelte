<script lang="ts" module>
  /** Horário em 24 horas, sem depender do seletor do navegador nem arredondar minutos. */
  export type AzuosTimePickerProps = {
    data: { label: string; name: string; value: string; isRequired?: boolean };
    ui?: { className?: string };
    state?: { error?: string | null; isDisabled?: boolean };
    actions: { onChange: (value: string) => void; onBlur?: () => void };
  };

  const HOURS = Array.from({ length: 24 }, (_, index) => {
    const value = String(index).padStart(2, '0');
    return { value, label: value };
  });
  const MINUTES = Array.from({ length: 60 }, (_, index) => {
    const value = String(index).padStart(2, '0');
    return { value, label: value };
  });
  const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
</script>

<script lang="ts">
  import Clock from '@lucide/svelte/icons/clock';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import { Button } from '$lib/components/ui/button';
  import * as Popover from '$lib/components/ui/popover';
  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import SelectField from '$lib/components/azuos-select-field/azuos-select-field.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: fieldState, actions }: AzuosTimePickerProps = $props();
  const id = $props.id();
  const errorId = `${id}-error`;
  let isOpen = $state(false);
  let hour = $state('09');
  let minute = $state('00');
  const hasValue = $derived(TIME_PATTERN.test(data.value));

  function handleOpenChange(open: boolean) {
    isOpen = open;
    if (!open) {
      actions.onBlur?.();
      return;
    }
    hour = hasValue ? data.value.slice(0, 2) : '09';
    minute = hasValue ? data.value.slice(3, 5) : '00';
  }

  function applyTime() {
    actions.onChange(`${hour}:${minute}`);
    handleOpenChange(false);
  }
</script>

<div class={cn('flex min-w-0 flex-col gap-1.5', ui?.className)}>
  <label for={id} class="text-sm font-medium text-ink-700">
    {data.label}
    {#if data.isRequired}<span class="text-destructive" aria-hidden="true">*</span>{/if}
  </label>
  <input type="hidden" name={data.name} value={data.value} disabled={fieldState?.isDisabled} />
  <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
    <Popover.Trigger>
      {#snippet child({ props })}
        <Button
          {...props}
          {id}
          variant="outline"
          aria-label={data.label}
          aria-invalid={Boolean(fieldState?.error)}
          aria-describedby={fieldState?.error ? errorId : undefined}
          disabled={fieldState?.isDisabled}
          onblur={() => !isOpen && actions.onBlur?.()}
          class="h-10 w-full min-w-0 justify-start gap-2 rounded-control border-border bg-card px-3.5 font-normal shadow-xs hover:bg-accent/40"
        >
          <Clock class="size-4 text-muted-foreground" aria-hidden="true" />
          <span class={cn('tabular-nums', !hasValue && 'text-muted-foreground')}>
            {hasValue ? data.value : 'Selecionar'}
          </span>
          <ChevronDown class="ml-auto size-3.5 text-muted-foreground" aria-hidden="true" />
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content
      align="start"
      collisionPadding={12}
      aria-label={`Selecionar horário de ${data.label.toLowerCase()}`}
      class="w-64 max-w-[calc(100vw-2rem)] gap-4 rounded-surface border border-border bg-card p-4 shadow-xl"
    >
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-sm font-semibold">{data.label}</p>
          <p class="text-xs text-muted-foreground">Formato de 24 horas</p>
        </div>
        <span class="text-xl font-semibold tabular-nums text-primary">{hour}:{minute}</span>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex min-w-0 flex-col gap-1.5">
          <span class="text-xs font-medium text-muted-foreground">Hora</span>
          <SelectField
            data={{ value: hour, options: HOURS }}
            ui={{ ariaLabel: `Hora de ${data.label.toLowerCase()}`, className: 'h-10! w-full tabular-nums' }}
            state={{ isDisabled: fieldState?.isDisabled }}
            actions={{ onChange: (value) => (hour = value) }}
          />
        </div>
        <div class="flex min-w-0 flex-col gap-1.5">
          <span class="text-xs font-medium text-muted-foreground">Minuto</span>
          <SelectField
            data={{ value: minute, options: MINUTES }}
            ui={{ ariaLabel: `Minuto de ${data.label.toLowerCase()}`, className: 'h-10! w-full tabular-nums' }}
            state={{ isDisabled: fieldState?.isDisabled }}
            actions={{ onChange: (value) => (minute = value) }}
          />
        </div>
      </div>
      <ActionButton
        data={{ label: 'Aplicar horário' }}
        ui={{ size: 'lg', className: 'w-full' }}
        state={{ isDisabled: fieldState?.isDisabled }}
        actions={{ onClick: applyTime }}
      />
    </Popover.Content>
  </Popover.Root>
  {#if fieldState?.error}
    <p id={errorId} role="alert" class="text-xs font-medium text-destructive">{fieldState.error}</p>
  {/if}
</div>
