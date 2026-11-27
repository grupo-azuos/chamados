<!--
  @component
  A LINHA DO TEMPO de um produto do inventário: as ocorrências registradas (defeito, troca de peça,
  manutenção, anotação), cada uma com a bolinha e o selo na cor do tipo.

  Em cima, o formulário de registrar uma ocorrência nova — o tipo e a descrição. Ele só aparece
  quando há `actions` e o componente não é só leitura (`ui.readOnly`). Embaixo, a lista; com erro,
  carregando ou vazia, diz isso em frase.

  Props: `data` traz as ocorrências e o tipo e a descrição do formulário; `state` traz o carregando,
  o enviando, o erro da lista e o do formulário; `actions` recebe a troca de tipo, a descrição e o
  envio; `ui` traz a classe e o só leitura.
-->
<script lang="ts" module>
  import CircleAlert from '@lucide/svelte/icons/circle-alert';
  import Dot from '@lucide/svelte/icons/dot';
  import Repeat from '@lucide/svelte/icons/repeat';
  import StickyNote from '@lucide/svelte/icons/sticky-note';
  import Wrench from '@lucide/svelte/icons/wrench';
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

  /* O tom do passo da linha do tempo (o ícone cheio só tem neutro, marca, sucesso e perigo): o
     tom exato do tipo continua no selo, ao lado. */
  const STEP_TONES = {
    neutral: 'neutral',
    info: 'brand',
    success: 'success',
    warning: 'neutral',
    danger: 'danger',
    brand: 'brand',
  } as const;

  const EVENT_ICONS: Record<InventoryItemEventType, typeof CircleAlert> = {
    defeito: CircleAlert,
    troca: Repeat,
    manutencao: Wrench,
    observacao: StickyNote,
    outro: Dot,
  };

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
  import { Skeleton } from '$lib/components/azuos-skeleton/azuos-skeleton';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import SubmitButton from '$lib/components/azuos-submit-button/azuos-submit-button.svelte';
  import TextAreaField from '$lib/components/azuos-text-area-field/azuos-text-area-field.svelte';
  import Timeline from '$lib/components/azuos-timeline/azuos-timeline.svelte';
  import TimelineStep from '$lib/components/azuos-timeline-step/azuos-timeline-step.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, state, actions, ui }: AzuosInventoryItemTimelineProps = $props();

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    actions?.onSubmit?.();
  }
</script>

<div class={cn('flex flex-col gap-6', ui?.className)}>
  {#if !ui?.readOnly && actions}
    <!-- O formulário mora direto no diálogo, sem moldura: caixa com borda em volta é proibida, e a
         divisória de baixo já separa o registrar da lista. -->
    <form onsubmit={handleSubmit} class="border-border flex flex-col gap-3.5 border-b pb-5">
      <div class="flex flex-col gap-1">
        <h4 class="text-foreground text-sm font-semibold">Registrar ocorrência ou observação</h4>
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
      <div class="flex flex-col gap-3" role="status" aria-busy="true" aria-label="Carregando a linha do tempo">
        {#each [0, 1, 2] as index (index)}
          <div class="flex gap-3.5">
            <Skeleton class="size-8 shrink-0 rounded-full" />
            <div class="flex flex-1 flex-col gap-2 pt-1">
              <Skeleton class="h-3 w-1/3" />
              <Skeleton class="h-10 w-full" />
            </div>
          </div>
        {/each}
      </div>
    {:else if data.events.length === 0}
      <p class="text-muted-foreground text-sm">
        Nenhuma ocorrência registrada ainda para este produto.
      </p>
    {:else}
      <!-- A linha do tempo da casa (`AzuosTimeline`): o ícone cheio no tom do tipo, quem registrou
           e quando no título, e o selo com o tipo exato ao lado da descrição. -->
      <Timeline>
        {#each data.events as event, index (event.id)}
          {@const tone = inventoryItemEventTypeTone(event.type)}
          <TimelineStep
            data={{
              title: event.authorName,
              description: formatEventDateTime(event.createdAt),
              icon: EVENT_ICONS[event.type] ?? Dot,
            }}
            ui={{ tone: STEP_TONES[tone], isLast: index === data.events.length - 1 }}
          >
            <span class="flex">
              <StatusBadge data={{ label: inventoryItemEventTypeLabel(event.type) }} ui={{ tone, size: 'sm' }} />
            </span>
            <p class="bg-muted text-foreground rounded-box px-3.5 py-2.5 text-sm whitespace-pre-line">
              {event.description}
            </p>
          </TimelineStep>
        {/each}
      </Timeline>
    {/if}
  </div>
</div>
