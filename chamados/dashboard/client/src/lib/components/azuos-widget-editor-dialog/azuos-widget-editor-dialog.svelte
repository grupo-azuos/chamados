<script lang="ts" module>
  import { type SavedFilter, type Widget } from '@template/shared/schemas/dashboard-board.schema';
  import { type Snippet } from 'svelte';

  import { type WidgetState } from '$lib/hooks/use-dashboard-board/use-dashboard-board.svelte';

  /**
   * O BLOCO ABERTO PARA EDITAR — no formato do editor de painel do Grafana, numa tela cheia: em
   * cima a PRÉ-VISUALIZAÇÃO EM TEMPO REAL, com os números de verdade do bloco como ele está agora;
   * embaixo a consulta (fonte, agrupar, dividir, período, filtro); na lateral o tipo de gráfico e o
   * título.
   * Trocar o gráfico ou a fonte acerta o resto sozinho (`fitGroup`), para o formulário nunca
   * ficar numa combinação que o servidor recusa. O mesmo desenho do paralegal.
   *
   * O rascunho do bloco é estado de formulário deste diálogo; quem guarda no rascunho do painel
   * é o hook.
   */
  export type AzuosWidgetEditorDialogProps = {
    data: {
      editing: { widget: Widget; isNew: boolean } | null;
      filters: SavedFilter[];
      /** Os números do bloco como está no editor; sem ela, a pré-visualização espera. */
      preview: WidgetState | null;
    };
    /** `isHidden`: os filtros salvos estão abertos por cima — o diálogo sai da frente sem perder o preenchido. */
    state?: { isHidden?: boolean };
    actions: {
      onClose: () => void;
      onSubmit: (widget: Widget) => void;
      /** Abre os filtros salvos, para montar um que ainda não existe. */
      onOpenFilters?: () => void;
      /** Cada mudança do formulário, para a pré-visualização buscar os números. */
      onPreviewChange: (widget: Widget) => void;
    };
  };
</script>

<script lang="ts">
  import Check from '@lucide/svelte/icons/check';
  import ListFilter from '@lucide/svelte/icons/list-filter';
  import {
    CALENDAR_VIEW_LABELS,
    CALENDAR_VIEWS,
    type CalendarView,
    DATA_SOURCES,
    type DataSourceKey,
    DAY_WIDGETS,
    DEFAULT_AGE_BANDS,
    DEFAULT_WINDOW,
    hasPersonField,
    MAX_WINDOW_DAYS,
    sourcesOf,
    WIDGET_KIND_LABELS,
    WIDGET_PERIOD_LABELS,
    WIDGET_PERIODS,
    WIDGET_WEIGHTS,
    type WidgetKind,
    type WidgetPeriod,
    type WidgetWindow,
    weightLabel,
    widgetCalendarView,
    widgetSchema,
    WINDOW_COUNTS,
    WINDOW_UNIT_LABELS,
    type WindowUnit,
    windowLabel,
  } from '@template/shared/schemas/dashboard-board.schema';
  import { untrack } from 'svelte';

  import AzuosActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import AzuosBoardWidget from '$lib/components/azuos-board-widget/azuos-board-widget.svelte';
  import AzuosCheckboxField from '$lib/components/azuos-checkbox-field/azuos-checkbox-field.svelte';
  import AzuosDateRangeField from '$lib/components/azuos-date-range-field/azuos-date-range-field.svelte';
  import AzuosExpandableScreen from '$lib/components/azuos-expandable-screen/azuos-expandable-screen.svelte';
  import AzuosFilterField from '$lib/components/azuos-filter-field/azuos-filter-field.svelte';
  import AzuosSegmentedControl from '$lib/components/azuos-segmented-control/azuos-segmented-control.svelte';
  import AzuosSelectField from '$lib/components/azuos-select-field/azuos-select-field.svelte';
  import AzuosSubmitButton from '$lib/components/azuos-submit-button/azuos-submit-button.svelte';
  import AzuosTextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import { todayIso } from '$lib/utils/calendar-date.util';
  import { cn } from '$lib/utils/cn';
  import {
    ageBandsText,
    autoTitle,
    filterOptions,
    fitGroup,
    followTitle,
    groupOptions,
    isPair,
    NO_FILTER,
    NO_GROUP,
    parseAgeBands,
    previewHeightClass,
    sourceHasDays,
    splitOptions,
    usesAgeBands,
    usesGroup,
    windowForMode,
    withUnit,
  } from '$lib/utils/widget-editor.util';
  import { MAIN_KINDS, OTHER_KINDS, WIDGET_KIND_LOOK } from '$lib/utils/widget-kind.util';

  let { data, state: dialogState, actions }: AzuosWidgetEditorDialogProps = $props();

  /**
   * Por onde o formulário começa: o bloco novo já vem acertado para o tipo escolhido e com o
   * título sugerido — quem monta só confirma ou ajusta (Lei de Tesler). O que já existe abre como
   * está.
   */
  function startOf(editing: AzuosWidgetEditorDialogProps['data']['editing']): Widget | null {
    if (!editing) return null;
    if (!editing.isNew) return editing.widget;
    const fitted = fitGroup(editing.widget);

    return fitted.title ? fitted : { ...fitted, title: autoTitle(fitted) };
  }

  /* O RASCUNHO DO BLOCO — mora no diálogo: esconder o diálogo para montar um filtro não perde o
     preenchido. Só recomeça quando OUTRO bloco abre. */
  let widget = $state<Widget | null>(untrack(() => startOf(data.editing)));
  let problem = $state<string | null>(null);
  let bandsText = $state(untrack(() => ageBandsText(data.editing?.widget.ageBands ?? DEFAULT_AGE_BANDS)));
  let openedId = $state<string | null>(untrack(() => data.editing?.widget.id ?? null));

  $effect(() => {
    const next = data.editing;
    if ((next?.widget.id ?? null) === openedId) return;
    openedId = next?.widget.id ?? null;
    widget = startOf(next);
    bandsText = ageBandsText(next?.widget.ageBands ?? DEFAULT_AGE_BANDS);
    problem = null;
  });

  const isOpen = $derived(data.editing !== null && !dialogState?.isHidden);
  const isNew = $derived(data.editing?.isNew !== false);
  const module = $derived(widget ? DATA_SOURCES[widget.source].module : 'infra');
  /* A agenda só oferece fonte com data por dia — escolher outra não teria o que mostrar. */
  const sourceOptions = $derived(
    sourcesOf(module)
      .filter((key) => widget?.kind !== 'agenda' || sourceHasDays(key))
      .map((key) => ({ value: key, label: DATA_SOURCES[key].label })),
  );
  const periodOptions = WIDGET_PERIODS.map((period) => ({ value: period, label: WIDGET_PERIOD_LABELS[period] }));
  const windowModeOptions = [
    { value: 'next', label: 'Próximos' },
    { value: 'last', label: 'Últimos' },
    { value: 'custom', label: 'Datas exatas' },
  ];
  const unitOptions = (['day', 'week', 'month'] as const).map((unit) => ({
    value: unit,
    label: WINDOW_UNIT_LABELS[unit][1].replace(/^./, (letter) => letter.toUpperCase()),
  }));
  const preview = $derived(data.preview ?? { data: null, isLoading: true, error: null });
  const previewFilterName = $derived(
    widget?.filterId ? (data.filters.find((filter) => filter.id === widget?.filterId)?.name ?? null) : null,
  );

  function change(next: Partial<Widget>) {
    if (!widget) return;
    const updated = followTitle(widget, fitGroup({ ...widget, ...next }));
    widget = updated;
    problem = null;
    actions.onPreviewChange(updated);
  }

  function changeWindow(next: WidgetWindow) {
    change({ window: next });
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!widget) return;
    // Título apagado não trava: o bloco leva o nome que ele mesmo sugere.
    const candidate = {
      ...widget,
      title: widget.title.trim() || autoTitle(widget),
      ...(usesAgeBands(widget) ? { ageBands: parseAgeBands(bandsText) } : {}),
    };
    const parsed = widgetSchema.safeParse(candidate);
    if (parsed.success) {
      actions.onSubmit(parsed.data);
      return;
    }
    problem = parsed.error.issues[0]?.message ?? 'Confira o bloco';
  }

  function sourceDescription(source: DataSourceKey): string | null {
    return (DATA_SOURCES[source] as { description?: string }).description ?? null;
  }
</script>

{#snippet formGroup(legend: string, hint: string, body: Snippet)}
  <!-- Um grupo do formulário, com nome: onze campos soltos cansam; três grupos de três a quatro
       se leem de relance (Lei de Miller). -->
  <fieldset class="rounded-surface bg-card shadow-card flex flex-col gap-4 p-4">
    <legend class="text-ink-900 float-left mb-1 w-full text-sm font-bold">
      {legend}
      <span class="text-ink-500 ml-2 text-xs font-normal">{hint}</span>
    </legend>
    {@render body()}
  </fieldset>
{/snippet}

{#snippet kindRow(title: string, kinds: readonly WidgetKind[], value: WidgetKind)}
  <div>
    <p class="text-ink-500 mb-1.5 text-xs font-semibold">{title}</p>
    <div class="grid grid-cols-3 gap-2">
      {#each kinds as kind (kind)}
        {@const look = WIDGET_KIND_LOOK[kind]}
        {@const isChosen = kind === value}
        <!-- O escolhido troca o ícone pelo visto: o estado não depende só da cor. -->
        {@const Icon = isChosen ? Check : look.icon}
        <button
          type="button"
          role="radio"
          aria-checked={isChosen}
          {...{ 'aria-description': `${WIDGET_KIND_LABELS[kind]} · ${weightLabel(WIDGET_WEIGHTS[kind])}` }}
          onclick={() => change({ kind })}
          class={cn(
            'rounded-box flex min-h-16 flex-col items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-semibold transition-colors',
            'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
            isChosen ? 'bg-primary text-primary-foreground' : 'bg-muted text-ink-700 hover:bg-accent',
          )}
        >
          <Icon class="size-5" aria-hidden="true" />
          {look.short}
          <!-- O peso à vista na hora de escolher: trocar o gráfico muda a conta do painel. -->
          <span aria-hidden="true" class={cn('font-medium', isChosen ? 'text-primary-foreground' : 'text-ink-500')}>
            {weightLabel(WIDGET_WEIGHTS[kind])}
          </span>
        </button>
      {/each}
    </div>
  </div>
{/snippet}

<!-- O EDITOR DO BLOCO no formato do Grafana: uma tela cheia com o bloco GRANDE em cima, com os
     números de agora; embaixo, a CONSULTA (de onde vêm os números e o recorte); na lateral, as
     OPÇÕES do gráfico (o tipo, o título, o calendário). Tudo que muda aparece na hora em cima. -->
<AzuosExpandableScreen
  data={{
    title: isNew ? 'Novo bloco' : 'Editar bloco',
    description: 'O bloco em cima, a consulta embaixo e o tipo de gráfico ao lado — o resultado muda na hora.',
  }}
  state={{ isOpen }}
  actions={{ onClose: actions.onClose }}
>
  {#if widget}
    {@const current = widget}
    <form class="flex h-full min-h-0 flex-col" onsubmit={submit}>
      <div class="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div class="flex min-h-0 flex-col lg:overflow-y-auto">
          <!-- O bloco desenhado como vai ficar no painel, com os números de agora. -->
          <section aria-label="Pré-visualização em tempo real" class="bg-mantle flex flex-col gap-3 p-5">
            <div class="flex items-center justify-between gap-2">
              <p class="text-ink-500 text-xs font-semibold">Pré-visualização em tempo real</p>
              <span class="rounded-chip bg-card text-ink-700 px-2 py-0.5 text-xs font-semibold">
                {preview.data ? `${preview.data.total} ${DATA_SOURCES[current.source].noun}` : '…'}
              </span>
            </div>
            <div class={previewHeightClass(current.kind, false)}>
              <AzuosBoardWidget
                data={{ widget: { ...current, title: current.title || 'Sem título' }, result: preview, filterName: previewFilterName }}
                state={{ isEditing: false, isPreview: true }}
                actions={{ onEdit: () => undefined, onRemove: () => undefined }}
              />
            </div>
          </section>
          <!-- A CONSULTA: de onde vêm os números, como se agrupam e quais entram na conta. -->
          <section aria-label="Consulta" class="border-border flex flex-col gap-5 border-t p-5">
            {#snippet dataGroup()}
              <div class="grid gap-4 sm:grid-cols-3">
                <AzuosFilterField data={{ label: 'Fonte dos dados' }}>
                  <AzuosSelectField
                    data={{ value: current.source, options: sourceOptions }}
                    ui={{ ariaLabel: 'Fonte dos dados', className: 'w-full' }}
                    actions={{ onChange: (source) => change({ source: source as DataSourceKey, groupBy: null, filterId: null }) }}
                  />
                  {#if sourceDescription(current.source)}
                    <p class="text-ink-500 text-xs">{sourceDescription(current.source)}</p>
                  {/if}
                </AzuosFilterField>
                {#if usesGroup(current.kind)}
                  <AzuosFilterField data={{ label: 'Agrupar por' }}>
                    <AzuosSelectField
                      data={{ value: current.groupBy ?? NO_GROUP, options: groupOptions(current) }}
                      ui={{ ariaLabel: 'Agrupar por', className: 'w-full' }}
                      actions={{ onChange: (groupBy) => change({ groupBy: groupBy || null }) }}
                    />
                  </AzuosFilterField>
                {/if}
                {#if isPair(current.kind)}
                  <AzuosFilterField data={{ label: 'Dividir por' }}>
                    <AzuosSelectField
                      data={{ value: current.splitBy ?? NO_GROUP, options: splitOptions(current) }}
                      ui={{ ariaLabel: 'Dividir por', className: 'w-full' }}
                      actions={{ onChange: (splitBy) => change({ splitBy: splitBy || null }) }}
                    />
                  </AzuosFilterField>
                {/if}
                {#if usesAgeBands(current)}
                  <!-- As faixas de idade, como a pessoa escreve: o texto fica como foi digitado
                       — reescrevê-lo a cada tecla comeria a vírgula do meio da digitação. -->
                  <div class="flex flex-col gap-1 sm:col-span-full">
                    <AzuosTextField
                      data={{
                        label: 'Faixas de idade (limites em dias)',
                        name: 'widgetAgeBands',
                        value: bandsText,
                        placeholder: ageBandsText(DEFAULT_AGE_BANDS),
                      }}
                      actions={{
                        onChange: (next) => {
                          bandsText = next;
                          change({ ageBands: parseAgeBands(next) });
                        },
                      }}
                    />
                    <p class="text-ink-500 text-xs">
                      Os limites de cada faixa, do menor para o maior: "{ageBandsText(DEFAULT_AGE_BANDS)}" são 0 a 2,
                      3 a 7, 8 a 15, 16 a 30 e 31 dias ou mais.
                    </p>
                  </div>
                {/if}
              </div>
            {/snippet}
            {@render formGroup('Os dados', 'De onde vêm e como se agrupam.', dataGroup)}

            {#snippet scopeGroup()}
              <div class="grid gap-4 sm:grid-cols-3">
                {#if current.kind === 'agenda'}
                  {@const window = current.window ?? DEFAULT_WINDOW}
                  <!-- A JANELA DA AGENDA — o quanto ela puxa do banco, sempre dentro dos 90 dias. -->
                  <div class="flex flex-col gap-3 sm:col-span-full">
                    <AzuosFilterField data={{ label: 'Janela da agenda' }}>
                      <AzuosSegmentedControl
                        data={{ value: window.mode === 'custom' ? 'custom' : window.direction, options: windowModeOptions }}
                        ui={{ ariaLabel: 'Janela da agenda' }}
                        actions={{ onChange: (mode) => changeWindow(windowForMode(mode, window, todayIso())) }}
                      />
                    </AzuosFilterField>
                    {#if window.mode === 'relative'}
                      <div class="grid gap-3 sm:grid-cols-2">
                        <AzuosFilterField data={{ label: 'Contar em' }}>
                          <AzuosSelectField
                            data={{ value: window.unit, options: unitOptions }}
                            ui={{ ariaLabel: 'Contar em', className: 'w-full' }}
                            actions={{ onChange: (unit) => changeWindow(withUnit(window, unit as WindowUnit)) }}
                          />
                        </AzuosFilterField>
                        <AzuosFilterField data={{ label: 'Quantos' }}>
                          <AzuosSelectField
                            data={{
                              value: String(window.count),
                              options: WINDOW_COUNTS[window.unit].map((count) => ({
                                value: String(count),
                                label: `${count} ${WINDOW_UNIT_LABELS[window.unit][count === 1 ? 0 : 1]}`,
                              })),
                            }}
                            ui={{ ariaLabel: 'Quantos', className: 'w-full' }}
                            actions={{ onChange: (count) => changeWindow({ ...window, count: Number(count) }) }}
                          />
                        </AzuosFilterField>
                      </div>
                    {:else}
                      <AzuosDateRangeField
                        data={{
                          label: `Entre as datas (no máximo ${MAX_WINDOW_DAYS} dias)`,
                          name: 'agendaRange',
                          value: { from: window.from, to: window.to },
                        }}
                        actions={{
                          onChange: (range) =>
                            changeWindow({ mode: 'custom', from: range.from ?? window.from, to: range.to ?? window.to }),
                        }}
                      />
                    {/if}
                    <p class="text-ink-500 text-xs">{windowLabel(window)} · só esses dias saem do banco.</p>
                  </div>
                {:else}
                  <AzuosFilterField data={{ label: 'Período' }}>
                    <AzuosSelectField
                      data={{ value: current.period, options: periodOptions }}
                      ui={{ ariaLabel: 'Período', className: 'w-full' }}
                      actions={{ onChange: (period) => change({ period: period as WidgetPeriod }) }}
                    />
                  </AzuosFilterField>
                {/if}
                <!-- Período e filtro lado a lado (o filtro com o botão de montar um novo, mais
                     largo); na agenda, a janela já ocupou a linha e o filtro desce. -->
                <div class={current.kind === 'agenda' ? 'sm:col-span-full' : 'sm:col-span-2'}>
                  <AzuosFilterField data={{ label: 'Filtro' }}>
                    <div class="flex gap-2">
                      <AzuosSelectField
                        data={{ value: current.filterId ?? NO_FILTER, options: filterOptions(data.filters, current.source) }}
                        ui={{ ariaLabel: 'Filtro', className: 'min-w-0 flex-1' }}
                        actions={{ onChange: (filterId) => change({ filterId: filterId || null }) }}
                      />
                      {#if actions.onOpenFilters}
                        <AzuosActionButton
                          data={{ label: 'Montar filtro' }}
                          ui={{ variant: 'secondary', size: 'lg', icon: ListFilter }}
                          actions={{ onClick: actions.onOpenFilters }}
                        />
                      {/if}
                    </div>
                  </AzuosFilterField>
                </div>
                {#if hasPersonField(current.source)}
                  <div class="border-border border-t pt-4 sm:col-span-full">
                    <AzuosCheckboxField
                      data={{
                        label: 'Só os meus',
                        name: 'widgetOnlyMine',
                        description: 'Cada pessoa vê o que é dela — vale também no painel da equipe.',
                        isChecked: current.onlyMine,
                      }}
                      actions={{ onChange: (onlyMine) => change({ onlyMine }) }}
                    />
                  </div>
                {/if}
              </div>
            {/snippet}
            {@render formGroup('O recorte', 'Quais entram na conta.', scopeGroup)}
          </section>
        </div>
        <!-- AS OPÇÕES do gráfico, na lateral, como no Grafana: o tipo primeiro, depois o resto. -->
        <aside aria-label="Opções do gráfico" class="border-border bg-mantle flex flex-col gap-5 border-t p-5 lg:overflow-y-auto lg:border-t-0 lg:border-l">
          {#snippet chartGroup()}
            <AzuosTextField
              data={{ label: 'Título', name: 'widgetTitle', value: current.title, placeholder: autoTitle(current) }}
              actions={{ onChange: (title) => change({ title }) }}
            />
            <!-- Os seis mais usados à frente, os outros num segundo grupo (Lei de Hick). -->
            <div role="radiogroup" aria-label="Tipo de gráfico" class="flex flex-col gap-3">
              {@render kindRow('Mais usados', MAIN_KINDS, current.kind)}
              {@render kindRow('Mais tipos', OTHER_KINDS, current.kind)}
            </div>
          {/snippet}
          {@render formGroup('O gráfico', 'Como os números aparecem.', chartGroup)}

          {#if DAY_WIDGETS.includes(current.kind)}
            {#snippet calendarGroup()}
              <AzuosFilterField data={{ label: 'Abre em' }}>
                <AzuosSegmentedControl
                  data={{
                    value: widgetCalendarView(current),
                    options: CALENDAR_VIEWS.map((value) => ({ value, label: CALENDAR_VIEW_LABELS[value] })),
                  }}
                  ui={{ ariaLabel: 'Visão em que o calendário abre' }}
                  actions={{ onChange: (view) => change({ calendarView: view as CalendarView }) }}
                />
              </AzuosFilterField>
            {/snippet}
            {@render formGroup('O calendário', 'Como ele abre.', calendarGroup)}
          {/if}
        </aside>
      </div>
      <footer class="border-border bg-card flex items-center justify-end gap-2 border-t px-6 py-3">
        {#if problem}
          <p role="alert" class="text-destructive mr-auto text-sm">{problem}</p>
        {/if}
        <AzuosActionButton data={{ label: 'Descartar' }} ui={{ variant: 'ghost' }} actions={{ onClick: actions.onClose }} />
        <AzuosSubmitButton data={{ label: isNew ? 'Adicionar bloco' : 'Aplicar' }} />
      </footer>
    </form>
  {/if}
</AzuosExpandableScreen>
