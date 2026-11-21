<script lang="ts" module>
  import { type SavedFilter, type Widget } from '@template/shared/schemas/dashboard-board.schema';

  import { type WidgetState } from '$lib/hooks/use-dashboard-board/use-dashboard-board.svelte';

  /**
   * O EDITOR DE UM BLOCO — o gráfico, a fonte (só as do módulo), o agrupamento, o período, o
   * filtro salvo e "só os meus", com a pré-visualização ao vivo, já com os números de verdade.
   *
   * O rascunho do bloco é estado VISUAL deste diálogo: cada mudança avisa a tela
   * (`onPreviewChange`), que busca os números; só "Salvar bloco" entrega o bloco à tela, e o
   * contrato confere antes — o motivo da recusa aparece aqui, em vermelho.
   */
  export type AzuosWidgetEditorDialogProps = {
    data: {
      /** O bloco aberto — nulo fecha o diálogo. */
      editing: { widget: Widget; isNew: boolean } | null;
      filters: SavedFilter[];
      preview: WidgetState | null;
    };
    actions: {
      onClose: () => void;
      onSubmit: (widget: Widget) => void;
      onPreviewChange: (widget: Widget) => void;
    };
  };
</script>

<script lang="ts">
  import {
    DATA_SOURCES,
    DEFAULT_AGE_BANDS,
    hasPersonField,
    sourcesOf,
    WIDGET_KIND_LABELS,
    WIDGET_KINDS,
    WIDGET_PERIOD_LABELS,
    WIDGET_PERIODS,
    WINDOW_COUNTS,
    WINDOW_UNIT_LABELS,
    WINDOW_UNITS,
    widgetSchema,
    type WidgetKind,
    type WidgetPeriod,
  } from '@template/shared/schemas/dashboard-board.schema';
  import { untrack } from 'svelte';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import BoardWidget from '$lib/components/azuos-board-widget/azuos-board-widget.svelte';
  import CheckboxField from '$lib/components/azuos-checkbox-field/azuos-checkbox-field.svelte';
  import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/azuos-dialog/azuos-dialog';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import DialogContent from '$lib/components/azuos-responsive-dialog-content/azuos-responsive-dialog-content.svelte';
  import SelectField from '$lib/components/azuos-select-field/azuos-select-field.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import {
    ageBandsText,
    filterOptions,
    fitGroup,
    followTitle,
    groupOptions,
    isPair,
    NO_FILTER,
    NO_GROUP,
    parseAgeBands,
    splitOptions,
    usesAgeBands,
    usesGroup,
  } from '$lib/utils/widget-editor.util';

  let { data, actions }: AzuosWidgetEditorDialogProps = $props();

  let widget = $state<Widget | null>(untrack(() => data.editing?.widget ?? null));
  let bandsText = $state(untrack(() => ageBandsText(data.editing?.widget.ageBands ?? DEFAULT_AGE_BANDS)));
  let problem = $state<string | null>(null);

  /* Abrir outro bloco recomeça pelo que ele é. */
  let openedId = $state<string | null>(untrack(() => data.editing?.widget.id ?? null));
  $effect(() => {
    const next = data.editing?.widget ?? null;
    if ((next?.id ?? null) === openedId) return;
    openedId = next?.id ?? null;
    widget = next;
    bandsText = ageBandsText(next?.ageBands ?? DEFAULT_AGE_BANDS);
    problem = null;
  });

  const module = $derived(widget ? DATA_SOURCES[widget.source].module : 'infra');
  const kindOptions = WIDGET_KINDS.map((kind) => ({ value: kind, label: WIDGET_KIND_LABELS[kind] }));
  const periodOptions = WIDGET_PERIODS.map((period) => ({ value: period, label: WIDGET_PERIOD_LABELS[period] }));

  function change(patch: Partial<Widget>, refit = false) {
    if (!widget) return;
    const next = { ...widget, ...patch };
    const fitted = refit ? fitGroup(next) : next;
    widget = followTitle(widget, fitted);
    problem = null;
    actions.onPreviewChange(widget);
  }

  function submit() {
    if (!widget) return;
    const candidate = usesAgeBands(widget) ? { ...widget, ageBands: parseAgeBands(bandsText) } : widget;
    const parsed = widgetSchema.safeParse(candidate);
    if (!parsed.success) {
      problem = parsed.error.issues[0]?.message ?? 'Confira o bloco.';
      return;
    }
    actions.onSubmit(parsed.data);
  }
</script>

<Dialog open={data.editing !== null} onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onClose())}>
  <DialogContent showCloseButton={false} class="max-h-[90svh] overflow-y-auto sm:max-w-4xl">
    <DialogHeader class="gap-1.5">
      <DialogTitle class="text-lg font-semibold tracking-tight">
        {data.editing?.isNew ? 'Novo bloco' : 'Editar bloco'}
      </DialogTitle>
      <DialogDescription class="text-muted-foreground text-xs">
        Escolha o gráfico e o que ele conta. A prévia ao lado já mostra os números de verdade.
      </DialogDescription>
    </DialogHeader>

    {#if widget}
      {@const current = widget}
      <div class="grid gap-6 md:grid-cols-2">
        <div class="flex flex-col gap-4">
          <TextField
            data={{ label: 'Título', name: 'widget-title', value: current.title, isRequired: true }}
            actions={{ onChange: (title) => change({ title }) }}
          />

          <fieldset class="flex flex-col gap-4">
            <legend class="text-ink-700 mb-1 text-sm font-medium">O que o bloco mostra</legend>
            <div class="flex flex-col gap-1.5">
              <span class="text-ink-700 text-sm font-medium">Gráfico</span>
              <OptionPicker
                data={{ value: current.kind, options: kindOptions }}
                ui={{ ariaLabel: 'Gráfico', fullWidth: true }}
                actions={{ onChange: (kind) => change({ kind: kind as WidgetKind }, true) }}
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <span class="text-ink-700 text-sm font-medium">Fonte de dados</span>
              <SelectField
                data={{
                  value: current.source,
                  options: sourcesOf(module).map((source) => ({ value: source, label: DATA_SOURCES[source].label })),
                }}
                ui={{ ariaLabel: 'Fonte de dados' }}
                actions={{ onChange: (source) => change({ source: source as Widget['source'], filterId: null }, true) }}
              />
              {#if DATA_SOURCES[current.source].description}
                <p class="text-muted-foreground text-xs">{DATA_SOURCES[current.source].description}</p>
              {/if}
            </div>
            {#if usesGroup(current.kind)}
              <div class="flex flex-col gap-1.5">
                <span class="text-ink-700 text-sm font-medium">Agrupar por</span>
                <OptionPicker
                  data={{ value: current.groupBy ?? NO_GROUP, options: groupOptions(current) }}
                  ui={{ ariaLabel: 'Agrupar por', fullWidth: true }}
                  actions={{ onChange: (value) => change({ groupBy: value || null }, true) }}
                />
              </div>
            {/if}
            {#if isPair(current.kind)}
              <div class="flex flex-col gap-1.5">
                <span class="text-ink-700 text-sm font-medium">Dividir por</span>
                <OptionPicker
                  data={{ value: current.splitBy ?? '', options: splitOptions(current) }}
                  ui={{ ariaLabel: 'Dividir por', fullWidth: true }}
                  actions={{ onChange: (value) => change({ splitBy: value || null }) }}
                />
              </div>
            {/if}
            {#if usesAgeBands(current)}
              <TextField
                data={{ label: 'Faixas de idade (dias)', name: 'widget-age-bands', value: bandsText, placeholder: '2, 7, 15, 30' }}
                actions={{ onChange: (text) => (bandsText = text) }}
              />
            {/if}
          </fieldset>

          <fieldset class="flex flex-col gap-4">
            <legend class="text-ink-700 mb-1 text-sm font-medium">O recorte</legend>
            {#if current.kind === 'agenda' && current.window?.mode === 'relative'}
              {@const window = current.window}
              <div class="grid grid-cols-3 gap-2" role="group" aria-label="Janela da agenda">
                <SelectField
                  data={{ value: window.direction, options: [{ value: 'next', label: 'Próximos' }, { value: 'last', label: 'Últimos' }] }}
                  ui={{ ariaLabel: 'Para frente ou para trás' }}
                  actions={{ onChange: (direction) => change({ window: { ...window, direction: direction as 'next' | 'last' } }) }}
                />
                <SelectField
                  data={{ value: String(window.count), options: WINDOW_COUNTS[window.unit].map((count) => ({ value: String(count), label: String(count) })) }}
                  ui={{ ariaLabel: 'Quantos' }}
                  actions={{ onChange: (count) => change({ window: { ...window, count: Number(count) } }) }}
                />
                <SelectField
                  data={{ value: window.unit, options: WINDOW_UNITS.map((unit) => ({ value: unit, label: WINDOW_UNIT_LABELS[unit][1] })) }}
                  ui={{ ariaLabel: 'Dias, semanas ou meses' }}
                  actions={{
                    onChange: (unit) =>
                      change({ window: { ...window, unit: unit as typeof window.unit, count: WINDOW_COUNTS[unit as typeof window.unit][0]! } }),
                  }}
                />
              </div>
            {:else}
              <div class="flex flex-col gap-1.5">
                <span class="text-ink-700 text-sm font-medium">Período</span>
                <SelectField
                  data={{ value: current.period, options: periodOptions }}
                  ui={{ ariaLabel: 'Período' }}
                  actions={{ onChange: (period) => change({ period: period as WidgetPeriod }) }}
                />
              </div>
            {/if}
            <div class="flex flex-col gap-1.5">
              <span class="text-ink-700 text-sm font-medium">Filtro salvo</span>
              <SelectField
                data={{ value: current.filterId ?? NO_FILTER, options: filterOptions(data.filters, current.source) }}
                ui={{ ariaLabel: 'Filtro salvo' }}
                actions={{ onChange: (id) => change({ filterId: id || null }) }}
              />
            </div>
            {#if hasPersonField(current.source)}
              <CheckboxField
                data={{
                  label: 'Só os meus',
                  name: 'widget-only-mine',
                  isChecked: current.onlyMine,
                  description: 'Cada pessoa vê só o que é dela — o responsável, ou quem fez.',
                }}
                actions={{ onChange: (onlyMine) => change({ onlyMine }) }}
              />
            {/if}
          </fieldset>
        </div>

        <div class="flex min-h-80 flex-col gap-2">
          <span class="text-ink-700 text-sm font-medium">Prévia</span>
          <BoardWidget
            data={{ widget: current, result: data.preview, noun: DATA_SOURCES[current.source].noun }}
            ui={{ className: 'min-h-72 flex-1' }}
          />
        </div>
      </div>

      {#if problem}
        <p role="alert" class="text-destructive text-sm font-medium">{problem}</p>
      {/if}
    {/if}

    <DialogFooter>
      <ActionButton data={{ label: 'Cancelar' }} ui={{ variant: 'secondary' }} actions={{ onClick: actions.onClose }} />
      <ActionButton data={{ label: 'Salvar bloco' }} actions={{ onClick: submit }} />
    </DialogFooter>
  </DialogContent>
</Dialog>
