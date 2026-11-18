<script lang="ts" module>
  import {
    inventoryItemEventTypeLabel,
    inventoryItemEventTypeOptions,
    inventoryItemEventTypeTone,
    type InventoryItemEventType,
  } from '@template/shared/domain/inventory-item-event.util';
  import { type InventoryItemEvent } from '@template/shared/schemas/inventory-item-event.schema';

  export type AzuosInventoryItemTimelineProps = {
    data: {
      events: InventoryItemEvent[];
      type: InventoryItemEventType;
      description: string;
    };
    state?: {
      isLoading?: boolean;
      isSubmitting?: boolean;
      error?: string | null;
      formError?: string | null;
    };
    actions?: {
      onTypeChange?: (type: InventoryItemEventType) => void;
      onDescriptionChange?: (description: string) => void;
      onSubmit?: () => void;
    };
    ui?: {
      className?: string;
      readOnly?: boolean;
    };
  };

  const EVENT_OPTIONS = inventoryItemEventTypeOptions();

  const DOT_TONE_CLASSES = {
    neutral: 'bg-muted-foreground',
    info: 'bg-info',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-destructive',
    brand: 'bg-primary',
  } as const;

  export function formatEventDateTime(value: string): string {
    const date = new Date(value);
    const day = date.toLocaleDateString('pt-BR');
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return `${day} às ${time}`;
  }
</script>

<script lang="ts">
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import SubmitButton from '$lib/components/azuos-submit-button/azuos-submit-button.svelte';
  import TextAreaField from '$lib/components/azuos-text-area-field/azuos-text-area-field.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, state, actions, ui }: AzuosInventoryItemTimelineProps = $props();

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    actions?.onSubmit?.();
  }
</script>

<div class={cn('flex flex-col gap-6', ui?.className)}>
  {#if !ui?.readOnly && actions}
    <form
      onsubmit={handleSubmit}
      class="rounded-card border-border bg-muted/40 flex flex-col gap-3.5 border p-3.5"
    >
      <div class="flex flex-col gap-1">
        <h4 class="text-foreground text-sm font-semibold">Registrar ocorrência / observação</h4>
        <p class="text-muted-foreground text-xs">
          Adicione defeitos, trocas de peças, manutenções ou anotações sobre este patrimônio.
        </p>
      </div>

      <div class="flex flex-col gap-1.5">
        <span class="text-ink-700 text-xs font-medium">Tipo da ocorrência</span>
        <OptionPicker
          data={{ value: data.type, options: EVENT_OPTIONS }}
          ui={{ ariaLabel: 'Tipo da ocorrência', fullWidth: true }}
          state={{ isDisabled: state?.isSubmitting }}
          actions={{ onChange: (val) => actions.onTypeChange?.(val as InventoryItemEventType) }}
        />
      </div>

      <TextAreaField
        data={{
          label: 'Descrição',
          name: 'event-description',
          value: data.description,
          placeholder: 'Descreva a ocorrência (ex: pé quebrado, rodízio substituído, etc.)…',
        }}
        state={{
          error: state?.formError,
          isDisabled: state?.isSubmitting,
        }}
        actions={{
          onChange: (val) => actions.onDescriptionChange?.(val),
        }}
      />

      <div class="flex justify-end pt-1">
        <SubmitButton
          data={{ label: 'Registrar ocorrência' }}
          state={{ isLoading: state?.isSubmitting }}
        />
      </div>
    </form>
  {/if}

  <div class="flex flex-col gap-3">
    <h4 class="text-foreground text-sm font-semibold">Linha do tempo do produto</h4>

    {#if state?.error}
      <ErrorState data={{ message: state.error }} ui={{ variant: 'inline' }} />
    {:else if state?.isLoading}
      <p class="text-muted-foreground text-sm">Carregando a linha do tempo…</p>
    {:else if data.events.length === 0}
      <p class="text-muted-foreground text-sm">
        Nenhuma ocorrência registrada ainda para este produto.
      </p>
    {:else}
      <ol class="flex flex-col">
        {#each data.events as event, index (event.id)}
          {@const tone = inventoryItemEventTypeTone(event.type)}
          {@const isFirst = index === 0}
          {@const isLast = index === data.events.length - 1}

          <li class="flex gap-4">
            <div class="flex w-3 shrink-0 flex-col items-center" aria-hidden="true">
              <span class={cn('h-0.5 w-px', isFirst ? 'bg-transparent' : 'bg-border')}></span>
              <span class={cn('my-1 size-3 shrink-0 rounded-full', DOT_TONE_CLASSES[tone])}></span>
              {#if !isLast}
                <span class="bg-border w-px flex-1"></span>
              {/if}
            </div>

            <div class={cn('flex min-w-0 flex-1 flex-col gap-2', isLast ? 'pb-0' : 'pb-6')}>
              <div class="flex min-h-6 flex-wrap items-center gap-x-2.5 gap-y-1">
                <StatusBadge
                  data={{ label: inventoryItemEventTypeLabel(event.type) }}
                  ui={{ tone, size: 'sm' }}
                />
                <span class="text-foreground min-w-0 truncate text-sm leading-6 font-medium">
                  {event.authorName}
                </span>
                <time
                  class="text-muted-foreground ml-auto text-xs leading-6 tabular-nums"
                  datetime={event.createdAt}
                >
                  {formatEventDateTime(event.createdAt)}
                </time>
              </div>

              <p
                class="rounded-box border-border bg-muted text-foreground border px-3.5 py-2.5 text-sm whitespace-pre-line"
              >
                {event.description}
              </p>
            </div>
          </li>
        {/each}
      </ol>
    {/if}
  </div>
</div>
