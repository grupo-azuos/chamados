<!--
  @component
  LANÇAR UM HISTÓRICO na ordem de serviço.

  Função pura de props: quais tipos cabem, o que cada um faz e o texto do aviso chegam prontos, e
  por isso o formulário abre no Storybook em qualquer estágio do chamado.

  A decisão de desenho que importa: os tipos vêm em DOIS GRUPOS com título — os que dão andamento e
  os que encerram. E o que o tipo escolhido faz é dito três vezes, de três jeitos: no grupo em que
  ele está, na frase embaixo e no texto do botão. Encerrar um chamado por engano é o erro que este
  formulário existe para não deixar acontecer.

  `data` leva o tipo, os grupos, o efeito e a frase, os campos (descrição e tempo), se a pessoa que
  abriu vê, os arquivos e quem é avisado por WhatsApp; `state`, envio, carregamento das pessoas e
  erros; `actions`, uma para cada campo e o `onSubmit`.
-->
<script lang="ts" module>
  import {
    type ManualTicketHistoryType,
    type TicketHistoryEffect,
    type TicketHistoryTone,
  } from '@template/shared/domain/ticket-history.util';
  import { type FormFieldState } from '$lib/types/form-field.type';

  export type TicketHistoryTypeOption = {
    value: ManualTicketHistoryType;
    label: string;
    /** O tom do tipo — o mesmo da linha do tempo. */
    tone: TicketHistoryTone;
  };

  export type AzuosTicketHistoryFormProps = {
    data: {
      type: ManualTicketHistoryType;
      groups: { continuing: TicketHistoryTypeOption[]; closing: TicketHistoryTypeOption[] };
      /** O que o tipo escolhido faz com o chamado. */
      effect: TicketHistoryEffect;
      /** A frase que diz isso. */
      effectLabel: string;
      fields: Record<'description' | 'minutesSpent', FormFieldState>;
      isVisibleToRequester: boolean;
      chosenFiles: File[];
      /** Quem recebe aviso por WhatsApp. Vazio: ninguém. */
      notifyUserIds: string[];
      /** Quem pode ser avisado. Vazio: a seção nem aparece. */
      notifiable: { id: string; name: string; avatarUrl?: string | null }[];
    };
    state?: {
      isSubmitting?: boolean;
      isLoadingPeople?: boolean;
      error?: string | null;
      attachmentError?: string | null;
    };
    actions: {
      onTypeChange: (type: ManualTicketHistoryType) => void;
      onChange: (field: 'description' | 'minutesSpent', value: string) => void;
      onBlur: (field: 'description' | 'minutesSpent') => void;
      onVisibilityChange: (isVisible: boolean) => void;
      onNotifyChange: (ids: string[]) => void;
      onChosenFilesChange: (files: File[]) => void;
      onAttachmentError: (message: string | null) => void;
      onSubmit: () => void;
    };
  };

  /** O aviso do que o histórico faz: encerrar chama a atenção; o resto só informa. */
  const EFFECT_CLASSES: Record<TicketHistoryEffect, string> = {
    closes: 'bg-warning-soft text-foreground',
    moves: 'bg-info-soft text-foreground',
    keeps: 'bg-muted text-muted-foreground',
  };
</script>

<script lang="ts">
  import { HISTORY_DESCRIPTION_MAX_LENGTH } from '@template/shared/schemas/ticket-history.schema';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Lock from '@lucide/svelte/icons/lock';
  import StickyNote from '@lucide/svelte/icons/sticky-note';

  import AttachmentPicker from '$lib/components/azuos-attachment-picker/azuos-attachment-picker.svelte';
  import CheckboxField from '$lib/components/azuos-checkbox-field/azuos-checkbox-field.svelte';
  import PersonMultiPickerField from '$lib/components/azuos-person-multi-picker-field/azuos-person-multi-picker-field.svelte';
  import SegmentedControl from '$lib/components/azuos-segmented-control/azuos-segmented-control.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import SubmitButton from '$lib/components/azuos-submit-button/azuos-submit-button.svelte';
  import TextAreaField from '$lib/components/azuos-text-area-field/azuos-text-area-field.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, state: formState, actions }: AzuosTicketHistoryFormProps = $props();

  const isClosing = $derived(data.effect === 'closes');

  const EFFECT_ICONS = { closes: Lock, moves: ArrowRight, keeps: StickyNote } as const;
  const EffectIcon = $derived(EFFECT_ICONS[data.effect]);

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    actions.onSubmit();
  }
</script>

<!-- Cada grupo é o controle segmentado da casa (pílula cinza, a escolhida em branco): a escolha
     é UMA só, entre os dois grupos — o grupo que não tem o tipo escolhido fica sem destaque. -->
{#snippet typeGroup(legend: string, options: TicketHistoryTypeOption[], isClosingGroup: boolean)}
  <div class="flex min-w-0 flex-col gap-2">
    <p class="text-muted-foreground flex items-center gap-1.5 text-sm font-medium" aria-hidden="true">
      {#if isClosingGroup}
        <Lock class="size-3.5" aria-hidden="true" />
      {/if}
      {legend}
    </p>
    <SegmentedControl
      data={{ value: data.type, options: options.map((option) => ({ value: option.value, label: option.label })) }}
      ui={{ ariaLabel: legend }}
      state={{ isDisabled: formState?.isSubmitting }}
      actions={{ onChange: (value) => actions.onTypeChange(value as ManualTicketHistoryType) }}
    />
  </div>
{/snippet}

<form novalidate class="flex flex-col gap-5" onsubmit={handleSubmit}>
  <div class="flex flex-col gap-4" aria-label="Tipo de histórico" role="group">
    {#if data.groups.continuing.length > 0}
      {@render typeGroup('Dar andamento', data.groups.continuing, false)}
    {/if}

    {#if data.groups.closing.length > 0}
      <div class="border-border border-t pt-4">
        {@render typeGroup('Encerrar o chamado', data.groups.closing, true)}
      </div>
    {/if}
  </div>

  <!-- O QUE ESTE HISTÓRICO FAZ, antes de a pessoa confirmar. `aria-live`: quem usa leitor de
       tela ouve a frase mudar quando troca de tipo — é a mesma informação que a cor dá. -->
  <p
    class={cn('rounded-box flex items-start gap-2 px-3.5 py-3 text-sm', EFFECT_CLASSES[data.effect])}
    aria-live="polite"
  >
    <EffectIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
    <span class={cn(isClosing && 'font-medium')}>{data.effectLabel}</span>
  </p>

  <TextAreaField
    data={{
      label: isClosing ? 'O que foi feito' : 'O que aconteceu',
      name: 'description',
      value: data.fields.description.value,
      placeholder: isClosing
        ? 'Descreva a solução — ou o motivo, se for um cancelamento'
        : 'Descreva este passo do atendimento',
      maxLength: HISTORY_DESCRIPTION_MAX_LENGTH,
      isRequired: true,
    }}
    state={{ error: data.fields.description.error, isDisabled: formState?.isSubmitting }}
    actions={{
      onChange: (value: string) => actions.onChange('description', value),
      onBlur: () => actions.onBlur('description'),
    }}
  />

  <!-- As duas colunas têm a MESMA forma — um rótulo e, embaixo, um controle de 40px — para o
       campo e a caixa de marcar ficarem na mesma linha. A explicação da caixa vai embaixo dela,
       no lugar onde o campo ao lado mostra o erro. -->
  <div class="grid gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:items-start">
    <TextField
      data={{
        label: 'Tempo gasto (minutos)',
        name: 'minutesSpent',
        value: data.fields.minutesSpent.value,
        placeholder: 'Opcional — ex: 30',
      }}
      ui={{ inputMode: 'numeric' }}
      state={{ error: data.fields.minutesSpent.error, isDisabled: formState?.isSubmitting }}
      actions={{
        onChange: (value: string) => actions.onChange('minutesSpent', value),
        onBlur: () => actions.onBlur('minutesSpent'),
      }}
    />

    <CheckboxField
      data={{
        label: 'Quem abriu o chamado pode ver este histórico',
        name: 'isVisibleToRequester',
        isChecked: data.isVisibleToRequester,
        description: data.isVisibleToRequester
          ? 'Desmarque para uma anotação interna do time.'
          : 'Anotação interna: só o time vê.',
      }}
      ui={{ className: 'sm:pt-6' }}
      state={{ isDisabled: formState?.isSubmitting }}
      actions={{ onChange: actions.onVisibilityChange }}
    />
  </div>

  <!-- O "comunicar" da OS: quem escreve escolhe, a cada andamento, quem fica sabendo. Nada
       marcado de saída — aviso que ninguém pediu vira barulho, e barulho faz o aviso importante
       ser ignorado. -->
  {#if formState?.isLoadingPeople || data.notifiable.length > 0}
    <div class="flex flex-col gap-1.5">
      <span class="text-ink-700 text-sm font-medium" aria-hidden="true">Avisar por WhatsApp</span>
      <!-- Várias pessoas: o campo de várias pessoas da casa, com a foto, e o valor é o id. -->
      <PersonMultiPickerField
        data={{
          values: data.notifyUserIds,
          people: data.notifiable.map((person) => ({ id: person.id, name: person.name, photo: person.avatarUrl ?? null })),
          placeholder: formState?.isLoadingPeople ? 'Carregando as pessoas…' : 'Ninguém será avisado',
        }}
        ui={{ ariaLabel: 'Avisar por WhatsApp' }}
        state={{ isDisabled: formState?.isSubmitting || formState?.isLoadingPeople }}
        actions={{ onChange: actions.onNotifyChange }}
      />
      <p class="text-muted-foreground text-xs">Só recebe quem você marcar.</p>
    </div>
  {/if}

  <div class="flex flex-col gap-2">
    <p class="text-muted-foreground text-xs font-medium">
      Arquivos deste histórico
      <span class="text-muted-foreground font-normal">— entram junto, ao registrar</span>
    </p>
    <AttachmentPicker
      data={{ files: data.chosenFiles }}
      state={{ isDisabled: formState?.isSubmitting, error: formState?.attachmentError }}
      actions={{ onChange: actions.onChosenFilesChange, onError: actions.onAttachmentError }}
    />
  </div>

  {#if formState?.error}
    <ErrorState data={{ message: formState.error }} ui={{ variant: 'inline' }} />
  {/if}

  <div class="flex justify-end">
    <SubmitButton
      data={{
        label: isClosing ? 'Encerrar chamado' : 'Registrar histórico',
        loadingLabel: 'Registrando…',
      }}
      ui={{ className: 'sm:w-auto' }}
      state={{ isLoading: formState?.isSubmitting }}
    />
  </div>
</form>
