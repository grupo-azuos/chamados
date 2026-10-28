<script lang="ts" module>
  /**
   * As cores da agenda — UMA bolinha por tom que o calendário realmente pinta, com o MESMO
   * token. Antes, "Rosa" usava o amarelo da marca (e no calendário saía vermelho), e "Roxo" e
   * "Índigo" eram a mesma cor: a pessoa escolhia uma coisa e via outra.
   */
  export const SWATCHES = [
    { value: 'blue', label: 'Azul', bgClass: 'bg-info' },
    { value: 'purple', label: 'Marinho', bgClass: 'bg-primary' },
    { value: 'green', label: 'Verde', bgClass: 'bg-success' },
    { value: 'amber', label: 'Âmbar', bgClass: 'bg-warning' },
    { value: 'red', label: 'Vermelho', bgClass: 'bg-destructive' },
    { value: 'neutral', label: 'Grafite', bgClass: 'bg-muted-foreground' },
  ] as const;

  /* Registros antigos guardaram "rose" e "indigo", que o calendário já pinta como vermelho e
     marinho: o seletor marca a bolinha da cor que a pessoa vê, sem regravar nada. */
  const SAME_AS: Record<string, string> = { rose: 'red', indigo: 'purple' };

  /** A bolinha que representa a cor guardada — Azul quando a cor é desconhecida. */
  export function swatchOf(color: string): (typeof SWATCHES)[number] {
    const value = SAME_AS[color] ?? color;

    return SWATCHES.find((swatch) => swatch.value === value) ?? SWATCHES[0];
  }
</script>

<script lang="ts">
  import DialogContent from '$lib/components/azuos-responsive-dialog-content/azuos-responsive-dialog-content.svelte';
  import {
    SCHEDULE_EVENT_CATEGORIES,
    SCHEDULE_EVENT_CATEGORY_LABELS,
    SCHEDULE_EVENT_KIND_LABELS,
  } from '@template/shared/domain/software-project.util';
  import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';
  import CalendarDays from '@lucide/svelte/icons/calendar-days';
  import Check from '@lucide/svelte/icons/check';
  import CircleCheckBig from '@lucide/svelte/icons/circle-check-big';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/azuos-dialog/azuos-dialog';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import SubmitButton from '$lib/components/azuos-submit-button/azuos-submit-button.svelte';
  import TextAreaField from '$lib/components/azuos-text-area-field/azuos-text-area-field.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import DatePicker from '$lib/components/azuos-date-picker/azuos-date-picker.svelte';
  import TimePicker from '../azuos-time-picker/azuos-time-picker.svelte';
  import { type SoftwareScheduleFormModel } from '$lib/hooks/use-software-schedule-form/use-software-schedule-form.svelte';

  let {
    open = $bindable(false),
    model,
    projects = [],
    onDelete,
    deleteError = null,
    isDeleting = false,
    onClose,
  }: {
    open: boolean;
    model: SoftwareScheduleFormModel;
    projects?: SoftwareProject[];
    onDelete?: () => void;
    deleteError?: string | null;
    isDeleting?: boolean;
    onClose: () => void;
  } = $props();

  const isEdit = $derived(model.data.mode === 'edit');
  const isRecord = $derived(model.data.fields.kind.value === 'record');
  const kindLabel = $derived(isRecord ? 'Registro' : 'Compromisso');

  /* O texto muda com o tipo: o compromisso é marcado para acontecer; o registro conta o que
     já foi feito. */
  const title = $derived(`${isEdit ? 'Editar' : 'Novo'} ${kindLabel}`);
  const description = $derived.by(() => {
    if (isRecord) return 'Registre algo que você fez, como um sistema enviado para revisão.';
    if (isEdit) return 'Atualize as informações do agendamento técnico no cronograma.';

    return 'Agende um deploy, reunião, manutenção ou marco de desenvolvimento.';
  });

  const kindOptions = [
    { value: 'appointment', label: SCHEDULE_EVENT_KIND_LABELS.appointment, icon: CalendarDays },
    { value: 'record', label: SCHEDULE_EVENT_KIND_LABELS.record, icon: CircleCheckBig },
  ];
  const id = $props.id();
  const dateId = `${id}-date`;
  const dateErrorId = `${dateId}-error`;

  const categoryOptions = SCHEDULE_EVENT_CATEGORIES.map((cat) => ({
    value: cat,
    label: SCHEDULE_EVENT_CATEGORY_LABELS[cat],
  }));

  const projectOptions = $derived([
    { value: '', label: 'Nenhum' },
    ...projects.map((p) => ({ value: String(p.id), label: p.name })),
  ]);

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    model.actions.onSubmit();
  }
</script>

<Dialog {open} onOpenChange={(isOpen) => !isOpen && onClose()}>
  <!-- Mais larga que o padrão para os campos irem lado a lado, e a janela caber na altura da
       tela sem rolar. -->
  <DialogContent class="sm:max-w-2xl">
    <DialogHeader class="gap-1.5">
      <div class="flex items-center gap-2.5">
        <span
          class="flex size-7 shrink-0 items-center justify-center rounded-chip bg-primary/10 text-primary"
        >
          {#if isRecord}
            <CircleCheckBig class="size-4" aria-hidden="true" />
          {:else}
            <CalendarDays class="size-4" aria-hidden="true" />
          {/if}
        </span>
        <DialogTitle class="text-lg font-semibold tracking-tight">{title}</DialogTitle>
      </div>
      <DialogDescription class="text-xs text-muted-foreground">{description}</DialogDescription>
    </DialogHeader>

    {#if model.state.error}
      <ErrorState
        data={{ title: `Não foi possível salvar o ${kindLabel.toLowerCase()}`, message: model.state.error }}
        ui={{ variant: 'inline' }}
      />
    {/if}

    {#if deleteError}
      <p
        role="alert"
        class="rounded-box bg-destructive-soft p-3 text-sm text-destructive"
      >
        {deleteError}
      </p>
    {/if}
    <form novalidate onsubmit={handleSubmit} class="flex flex-col gap-3.5">
      <div class="flex flex-col gap-1.5">
        <span class="text-xs font-medium text-foreground">Tipo</span>
        <OptionPicker
          data={{ value: model.data.fields.kind.value, options: kindOptions }}
          ui={{ ariaLabel: 'Tipo do item na agenda', fullWidth: true }}
          state={{ isDisabled: model.state.isSubmitting }}
          actions={{ onChange: (val) => model.actions.onChange('kind', val) }}
        />
      </div>

      <TextField
        data={{
          label: `Título do ${kindLabel.toLowerCase()}`,
          name: 'title',
          value: model.data.fields.title.value,
          placeholder: isRecord
            ? 'Ex: Sistema enviado para revisão'
            : 'Ex: Deploy Portal v2, Standup, Homologação',
          isRequired: true,
        }}
        state={{
          error: model.data.fields.title.error,
          isDisabled: model.state.isSubmitting,
        }}
        actions={{
          onChange: (val: string) => model.actions.onChange('title', val),
          onBlur: () => model.actions.onBlur('title'),
        }}
      />

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div class="flex flex-col gap-1.5">
          <span class="text-xs font-medium text-foreground">Categoria</span>
          <OptionPicker
            data={{
              value: model.data.fields.category.value,
              options: categoryOptions,
            }}
            ui={{
              ariaLabel: `Categoria do ${kindLabel.toLowerCase()}`,
              fullWidth: true,
              mode: 'combobox',
              searchPlaceholder: 'Buscar categoria…',
            }}
            actions={{
              onChange: (val) => model.actions.onChange('category', val),
            }}
          />
        </div>

        {#if projects.length > 0}
          <div class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-foreground"> Sistema vinculado (opcional) </span>
            <OptionPicker
              data={{
                value: model.data.fields.projectId.value ?? '',
                options: projectOptions,
              }}
              ui={{
                ariaLabel: 'Sistema vinculado',
                fullWidth: true,
                mode: 'combobox',
                searchPlaceholder: 'Buscar sistema…',
              }}
              actions={{
                onChange: (val) => model.actions.onChange('projectId', val),
              }}
            />
          </div>
        {/if}
      </div>

      <!-- Data e horário numa linha só: no compromisso, Data · Início · Fim; no registro, que
           marca só o momento, Data · Hora. Empilhados, eram três linhas e a janela passava da
           altura da tela. -->
      <div class="grid grid-cols-1 gap-3 {isRecord ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}">
        <div class="flex min-w-0 flex-col gap-1.5">
          <label for={dateId} class="text-sm font-medium text-ink-700">
            Data <span class="text-destructive" aria-hidden="true">*</span>
          </label>
          <DatePicker
            id={dateId}
            name="date"
            ariaLabel="Data"
            value={model.data.fields.date.value}
            disabled={model.state.isSubmitting}
            ariaInvalid={Boolean(model.data.fields.date.error)}
            ariaDescribedBy={model.data.fields.date.error ? dateErrorId : undefined}
            showMonthYearSelects
            onValueChange={(value) => model.actions.onChange('date', value ?? '')}
            onBlur={() => model.actions.onBlur('date')}
          />
          {#if model.data.fields.date.error}
            <p id={dateErrorId} role="alert" class="text-xs font-medium text-destructive">
              {model.data.fields.date.error}
            </p>
          {/if}
        </div>

        <TimePicker
          data={{
            label: isRecord ? 'Hora' : 'Início',
            name: 'startTime',
            value: model.data.fields.startTime.value,
            isRequired: true,
          }}
          state={{
            error: model.data.fields.startTime.error,
            isDisabled: model.state.isSubmitting,
          }}
          actions={{
            onChange: (value) => model.actions.onChange('startTime', value),
            onBlur: () => model.actions.onBlur('startTime'),
          }}
        />

        {#if !isRecord}
          <TimePicker
            data={{
              label: 'Fim',
              name: 'endTime',
              value: model.data.fields.endTime.value,
              isRequired: true,
            }}
            state={{
              error: model.data.fields.endTime.error,
              isDisabled: model.state.isSubmitting,
            }}
            actions={{
              onChange: (value) => model.actions.onChange('endTime', value),
              onBlur: () => model.actions.onBlur('endTime'),
            }}
          />
        {/if}
      </div>

      <!-- A cor numa linha só, sem caixa em volta: é um detalhe visual, não merece um bloco. -->
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-xs font-medium text-foreground">
          Cor na agenda
          <span class="font-normal text-muted-foreground">
            · {swatchOf(model.data.fields.color.value).label}
          </span>
        </span>
        <div class="flex flex-wrap items-center gap-1.5">
          {#each SWATCHES as swatch (swatch.value)}
            {@const isSelected = swatchOf(model.data.fields.color.value).value === swatch.value}
            <!-- Escolhida = o visto em cima da cor; anel colorido em volta é proibido no grupo. -->
            <button
              type="button"
              class="focus-visible:ring-ring flex size-7 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:outline-none"
              onclick={() => model.actions.onChange('color', swatch.value)}
              title={swatch.label}
              aria-label={swatch.label}
              aria-pressed={isSelected}
            >
              <span class="flex size-6 items-center justify-center rounded-full {swatch.bgClass}">
                {#if isSelected}
                  <Check class="text-background size-3.5" strokeWidth={3} aria-hidden="true" />
                {/if}
              </span>
            </button>
          {/each}
        </div>
      </div>

      <TextAreaField
        data={{
          label: 'Descrição',
          name: 'note',
          value: model.data.fields.note.value,
          placeholder: isRecord
            ? 'O que foi feito, para quem foi enviado, link da entrega…'
            : 'Detalhes da janela de manutenção, da reunião ou um link',
        }}
        ui={{ rows: 3 }}
        state={{
          error: model.data.fields.note.error,
          isDisabled: model.state.isSubmitting,
        }}
        actions={{
          onChange: (val: string) => model.actions.onChange('note', val),
          onBlur: () => model.actions.onBlur('note'),
        }}
      />

      <DialogFooter class="mt-1 flex items-center justify-between border-t border-border/60 pt-3">
        <div>
          {#if isEdit && onDelete}
            <button
              type="button"
              class="inline-flex items-center gap-1.5 text-xs font-medium text-destructive hover:underline"
              onclick={onDelete}
              disabled={isDeleting || model.state.isSubmitting}
            >
              <Trash2 class="size-3.5" />
              {isDeleting ? 'Excluindo…' : `Excluir ${kindLabel.toLowerCase()}`}
            </button>
          {/if}
        </div>

        <div class="flex items-center gap-2">
          <ActionButton
            data={{ label: 'Cancelar' }}
            ui={{ variant: 'secondary' }}
            actions={{ onClick: onClose }}
          />
          <SubmitButton
            data={{ label: `Salvar ${kindLabel.toLowerCase()}`, loadingLabel: 'Salvando…' }}
            state={{ isLoading: model.state.isSubmitting }}
          />
        </div>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
