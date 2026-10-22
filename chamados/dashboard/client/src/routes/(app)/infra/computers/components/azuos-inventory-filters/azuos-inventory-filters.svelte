<script lang="ts" module>
  import {
    HEALTH_STATUSES,
    HEALTH_STATUS_LABELS,
    healthStatusTone,
    type HealthStatus,
  } from '@template/shared/domain/computer-health.util';
  import { ALERT_METRIC_LABELS } from '@template/shared/domain/computer-alert.util';
  import {
    COMPUTER_KINDS,
    COMPUTER_KIND_LABELS,
    type ComputerKind,
  } from '@template/shared/domain/computer-kind.util';
  import { type Department, type DepartmentChoice } from '@template/shared/domain/department.util';
  import {
    COMPUTER_ALERT_FILTERS,
    type ComputerAlertFilter,
    type ComputerPreventiveFilter,
  } from '@template/shared/schemas/computer.schema';

  /** O recorte do inventário — o mesmo do hook `use-computer-list`. */
  export type InventoryFilter = {
    search: string;
    department: Department | '';
    healthStatus: HealthStatus | '';
    kind: ComputerKind | '';
    onlyOnline: boolean;
    onlyOffline: boolean;
    alert: ComputerAlertFilter | '';
    preventive: ComputerPreventiveFilter | '';
    includeArchived: boolean;
  };

  /**
   * A BARRA DE FILTROS do inventário.
   *
   * Em cima, o que se usa toda hora: busca, departamento e o botão "Filtros". O resto mora num
   * painel que desliza ao abrir, agrupado pelo que pergunta — o que a máquina está fazendo
   * agora, a manutenção e o cadastro. Embaixo, uma etiqueta por filtro ligado, com o X que o
   * desliga: com o painel fechado, é ela que mostra o que está limitando a lista.
   *
   * Função pura de props. O único estado próprio é visual — o painel aberto ou fechado.
   */
  export type AzuosInventoryFiltersProps = {
    data: {
      filter: InventoryFilter;
      /** Os departamentos do RH e, depois da linha, os daqui. */
      departmentOptions: DepartmentChoice[];
    };
    state?: {
      /** O filtro escondeu tudo: quem oferece "Limpar filtros" é o aviso de lista vazia —
       * dois botões iguais só confundem. */
      isFilteredOut?: boolean;
    };
    actions: {
      onSearchChange: (search: string) => void;
      onDepartmentChange: (department: Department | '') => void;
      onHealthStatusChange: (healthStatus: HealthStatus | '') => void;
      onKindChange: (kind: ComputerKind | '') => void;
      onOnlineChange: (onlyOnline: boolean) => void;
      onOfflineChange: (onlyOffline: boolean) => void;
      onAlertChange: (alert: ComputerAlertFilter | '') => void;
      onPreventiveChange: (preventive: ComputerPreventiveFilter | '') => void;
      onArchivedChange: (includeArchived: boolean) => void;
      onClearFilters: () => void;
    };
  };

  /** Uma etiqueta de filtro ligado: o que ela diz e como desligá-la. */
  export type ActiveFilterChip = { key: string; label: string; onRemove: () => void };

  const ALERT_FILTER_NAMES: Record<Exclude<ComputerAlertFilter, 'any'>, string> = {
    cpu: 'CPU',
    memory: ALERT_METRIC_LABELS.memory,
    disk: ALERT_METRIC_LABELS.disk,
  };

  const HEALTH_OPTIONS = HEALTH_STATUSES.map((status) => ({
    value: status,
    label: HEALTH_STATUS_LABELS[status],
    tone: healthStatusTone(status),
  }));

  const CONNECTION_OPTIONS = [
    { value: 'online', label: 'Online agora' },
    { value: 'offline', label: 'Offline' },
  ];

  /** "CPU elevada", "Memória elevada": a máquina com o alerta daquela peça aberto agora. */
  const ALERT_OPTIONS = COMPUTER_ALERT_FILTERS.map((alert) => ({
    value: alert,
    label: alert === 'any' ? 'Com alerta ativo' : `${ALERT_FILTER_NAMES[alert]} elevada`,
  }));

  /**
   * A situação da preventiva, nas cores do selo da lista (vencida em vermelho, nunca feita em
   * âmbar, em dia em verde). "Precisa de manutenção" junta vencida e nunca feita — as duas pedem
   * a mesma visita — e vem primeiro, porque é a pergunta do dia a dia.
   */
  const PREVENTIVE_LABELS: Record<ComputerPreventiveFilter, string> = {
    needed: 'Precisa de manutenção',
    due: 'Vencida',
    never: 'Nunca feita',
    ok: 'Em dia',
  };
  const PREVENTIVE_OPTIONS = [
    { value: 'needed', label: PREVENTIVE_LABELS.needed, tone: 'warning' as const },
    { value: 'due', label: PREVENTIVE_LABELS.due, tone: 'danger' as const },
    { value: 'never', label: PREVENTIVE_LABELS.never, tone: 'warning' as const },
    { value: 'ok', label: PREVENTIVE_LABELS.ok, tone: 'success' as const },
  ];

  const KIND_OPTIONS = COMPUTER_KINDS.map((kind) => ({
    value: kind,
    label: COMPUTER_KIND_LABELS[kind],
  }));

  /** "Arquivadas": a opção sem valor ("Ocultar") vem do `allLabel` do seletor. */
  const ARCHIVED_OPTIONS = [{ value: 'yes', label: 'Mostrar' }];

  export function connectionOf(filter: InventoryFilter): '' | 'online' | 'offline' {
    if (filter.onlyOnline) return 'online';
    if (filter.onlyOffline) return 'offline';

    return '';
  }

  /**
   * As etiquetas dos filtros ligados DENTRO do painel — busca e departamento ficam à vista e
   * não entram. Online e offline são um filtro só (a conexão). A ordem é a do painel.
   */
  export function activeFilterChips(
    filter: InventoryFilter,
    actions: AzuosInventoryFiltersProps['actions'],
  ): ActiveFilterChip[] {
    const chips: (ActiveFilterChip | null)[] = [
      connectionOf(filter)
        ? {
            key: 'connection',
            label: filter.onlyOnline ? 'Online agora' : 'Offline',
            onRemove: () =>
              filter.onlyOnline ? actions.onOnlineChange(false) : actions.onOfflineChange(false),
          }
        : null,
      filter.healthStatus
        ? {
            key: 'health',
            label: `Saúde: ${HEALTH_STATUS_LABELS[filter.healthStatus]}`,
            onRemove: () => actions.onHealthStatusChange(''),
          }
        : null,
      filter.alert
        ? {
            key: 'alert',
            label: ALERT_OPTIONS.find((option) => option.value === filter.alert)?.label ?? 'Alerta',
            onRemove: () => actions.onAlertChange(''),
          }
        : null,
      filter.preventive
        ? {
            key: 'preventive',
            label: `Preventiva: ${PREVENTIVE_LABELS[filter.preventive]}`,
            onRemove: () => actions.onPreventiveChange(''),
          }
        : null,
      filter.kind
        ? {
            key: 'kind',
            label: COMPUTER_KIND_LABELS[filter.kind],
            onRemove: () => actions.onKindChange(''),
          }
        : null,
      filter.includeArchived
        ? {
            key: 'archived',
            label: 'Com arquivadas',
            onRemove: () => actions.onArchivedChange(false),
          }
        : null,
    ];

    return chips.filter((chip): chip is ActiveFilterChip => chip !== null);
  }

  /** Há o que limpar — inclusive a busca e o departamento, que não viram etiqueta. */
  export function hasAnyFilter(filter: InventoryFilter, chips: readonly ActiveFilterChip[]): boolean {
    return chips.length > 0 || filter.search.trim() !== '' || filter.department !== '';
  }
</script>

<script lang="ts">
  import Activity from '@lucide/svelte/icons/activity';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import FilterX from '@lucide/svelte/icons/filter-x';
  import Search from '@lucide/svelte/icons/search';
  import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
  import Tag from '@lucide/svelte/icons/tag';
  import Wrench from '@lucide/svelte/icons/wrench';
  import X from '@lucide/svelte/icons/x';
  import { untrack } from 'svelte';
  import { flip } from 'svelte/animate';
  import { scale, slide } from 'svelte/transition';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import FilterField from '$lib/components/azuos-filter-field/azuos-filter-field.svelte';
  import InputGroup from '$lib/components/azuos-input-group/azuos-input-group.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import TableViewToggle from '$lib/components/azuos-table-view-toggle/azuos-table-view-toggle.svelte';
  import { DURATION, prefersReducedMotion } from '$lib/motion/motion';
  import { cn } from '$lib/utils/cn';

  let { data, state: filtersState, actions }: AzuosInventoryFiltersProps = $props();

  const chips = $derived(activeFilterChips(data.filter, actions));
  const canClear = $derived(hasAnyFilter(data.filter, chips));
  const connectionValue = $derived(connectionOf(data.filter));

  /* Estado VISUAL: o painel aberto. Nasce aberto quando a tela chega filtrada lá dentro (um
     cartão do painel, um filtro salvo) — senão a pessoa veria a lista recortada sem saber por quê. */
  let isOpen = $state(untrack(() => activeFilterChips(data.filter, actions).length > 0));

  /* Quem pede "reduzir movimento" no sistema não vê a animação — vira troca seca. */
  const motionMs = (seconds: number) => (prefersReducedMotion() ? 0 : seconds * 1000);
  const panelId = 'inventory-filters-panel';

  /* Cada filtro do painel tem o tamanho das opções dele, e não o da coluna: a trilha esticada
     deixava um vazio cinza depois da última pastilha. No celular as pastilhas quebram linha. */
  const FIELD_HUGS = 'items-start';
  const GROUP_TITLE =
    'text-ink-500 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase';
</script>

<section
  aria-label="Filtros do inventário"
  class="border-border/70 bg-card rounded-surface flex min-w-0 flex-col border shadow-xs"
>
  <!-- A barra: busca ocupa o que sobrar; no celular cada peça ganha a própria linha. -->
  <div class="flex min-w-0 flex-col gap-3 p-3 sm:p-4 md:flex-row md:items-end">
    <InputGroup
      data={{
        label: 'Buscar',
        name: 'search',
        value: data.filter.search,
        placeholder: 'Nome da máquina, apelido ou responsável',
      }}
      ui={{ className: 'md:flex-1' }}
      actions={{ onChange: actions.onSearchChange }}
    >
      {#snippet prefix()}
        <Search class="text-muted-foreground size-4" aria-hidden="true" />
      {/snippet}
    </InputGroup>

    <!-- Lista suspensa SEMPRE, e não pastilhas: os departamentos vêm do RH e crescem. -->
    <FilterField data={{ label: 'Departamento' }} ui={{ className: 'md:w-60' }}>
      <OptionPicker
        data={{ value: data.filter.department, options: data.departmentOptions }}
        ui={{
          ariaLabel: 'Filtrar por departamento',
          allLabel: 'Todos os departamentos',
          mode: 'combobox',
          fullWidth: true,
          searchPlaceholder: 'Buscar departamento…',
        }}
        actions={{
          onChange: (value: string) => actions.onDepartmentChange(value as Department | ''),
        }}
      />
    </FilterField>

    <div class="flex items-center gap-2">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onclick={() => (isOpen = !isOpen)}
        class={cn(
          'control-lg rounded-control inline-flex flex-1 items-center justify-center gap-2 border text-sm font-medium transition-colors md:flex-none',
          'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          isOpen || chips.length > 0
            ? 'border-primary/40 bg-primary/10 text-primary'
            : 'border-border bg-card text-foreground hover:bg-accent/50',
        )}
      >
        <SlidersHorizontal class="size-4" aria-hidden="true" />
        <span>Filtros</span>
        {#if chips.length > 0}
          {#key chips.length}
            <span
              in:scale={{ duration: motionMs(DURATION.fast), start: 0.6 }}
              class="bg-primary text-primary-foreground inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums"
              aria-label={`${chips.length} ${chips.length === 1 ? 'ativo' : 'ativos'}`}
            >
              {chips.length}
            </span>
          {/key}
        {/if}
        <ChevronDown
          class={cn(
            'size-4 transition-transform duration-200 motion-reduce:transition-none',
            isOpen && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>
      <TableViewToggle />
    </div>
  </div>

  {#if isOpen}
    <!-- O painel desliza: some e aparece sem empurrar a lista num salto. -->
    <div
      id={panelId}
      transition:slide={{ duration: motionMs(DURATION.base) }}
      class="border-border/60 border-t"
    >
      <!-- Situação na largura toda, em cima; Manutenção e Cadastro lado a lado embaixo. Com três
           colunas, a Preventiva (cinco opções) não cabia e as pastilhas se espremiam. -->
      <div class="grid min-w-0 lg:grid-cols-2">
        <fieldset class="flex min-w-0 flex-col items-start gap-3 p-3 sm:p-4 lg:col-span-2">
          <legend class="contents">
            <span class={GROUP_TITLE}>
              <Activity class="size-3.5" aria-hidden="true" />
              Situação agora
            </span>
          </legend>
          <div class="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-6">
            <FilterField data={{ label: 'Conexão' }} ui={{ className: FIELD_HUGS }}>
              <OptionPicker
                data={{ value: connectionValue, options: CONNECTION_OPTIONS }}
                ui={{ ariaLabel: 'Filtrar por conexão', allLabel: 'Todas' }}
                actions={{
                  onChange: (value: string) => {
                    if (value === 'online') return actions.onOnlineChange(true);
                    if (value === 'offline') return actions.onOfflineChange(true);
                    actions.onOnlineChange(false);
                    actions.onOfflineChange(false);
                  },
                }}
              />
            </FilterField>
            <FilterField data={{ label: 'Saúde' }} ui={{ className: FIELD_HUGS }}>
              <OptionPicker
                data={{ value: data.filter.healthStatus, options: HEALTH_OPTIONS }}
                ui={{ ariaLabel: 'Filtrar por saúde', allLabel: 'Toda a saúde' }}
                actions={{
                  onChange: (value: string) =>
                    actions.onHealthStatusChange(value as HealthStatus | ''),
                }}
              />
            </FilterField>
            <FilterField data={{ label: 'Alertas' }} ui={{ className: FIELD_HUGS }}>
              <OptionPicker
                data={{ value: data.filter.alert, options: ALERT_OPTIONS }}
                ui={{ ariaLabel: 'Filtrar por alerta', allLabel: 'Todos' }}
                actions={{
                  onChange: (value: string) =>
                    actions.onAlertChange(value as ComputerAlertFilter | ''),
                }}
              />
            </FilterField>
          </div>
        </fieldset>

        <fieldset
          class="border-border/60 flex min-w-0 flex-col items-start gap-3 border-t p-3 sm:p-4"
        >
          <legend class="contents">
            <span class={GROUP_TITLE}>
              <Wrench class="size-3.5" aria-hidden="true" />
              Manutenção
            </span>
          </legend>
          <FilterField data={{ label: 'Preventiva' }} ui={{ className: FIELD_HUGS }}>
            <OptionPicker
              data={{ value: data.filter.preventive, options: PREVENTIVE_OPTIONS }}
              ui={{ ariaLabel: 'Filtrar pela preventiva', allLabel: 'Todas' }}
              actions={{
                onChange: (value: string) =>
                  actions.onPreventiveChange(value as ComputerPreventiveFilter | ''),
              }}
            />
          </FilterField>
          <p class="text-ink-500 text-xs">
            "Precisa de manutenção" junta as vencidas e as que nunca tiveram preventiva.
          </p>
        </fieldset>

        <fieldset
          class="border-border/60 flex min-w-0 flex-col items-start gap-3 border-t p-3 sm:p-4 lg:border-l"
        >
          <legend class="contents">
            <span class={GROUP_TITLE}>
              <Tag class="size-3.5" aria-hidden="true" />
              Cadastro
            </span>
          </legend>
          <div class="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-6">
            <FilterField data={{ label: 'Tipo' }} ui={{ className: FIELD_HUGS }}>
              <OptionPicker
                data={{ value: data.filter.kind, options: KIND_OPTIONS }}
                ui={{ ariaLabel: 'Filtrar por tipo', allLabel: 'Todos os tipos' }}
                actions={{
                  onChange: (value: string) => actions.onKindChange(value as ComputerKind | ''),
                }}
              />
            </FilterField>
            <FilterField data={{ label: 'Arquivadas' }} ui={{ className: FIELD_HUGS }}>
              <OptionPicker
                data={{ value: data.filter.includeArchived ? 'yes' : '', options: ARCHIVED_OPTIONS }}
                ui={{ ariaLabel: 'Máquinas arquivadas', allLabel: 'Ocultar' }}
                actions={{ onChange: (value: string) => actions.onArchivedChange(value === 'yes') }}
              />
            </FilterField>
          </div>
        </fieldset>
      </div>
    </div>
  {/if}

  <!-- Uma etiqueta por filtro ligado. Entram e saem encolhendo, e as outras deslizam para o
       lugar (`flip`) em vez de pularem. -->
  {#if canClear}
    <div
      transition:slide={{ duration: motionMs(DURATION.fast) }}
      class="border-border/60 flex min-w-0 flex-wrap items-center gap-2 border-t px-3 py-2.5 sm:px-4"
    >
      {#if chips.length > 0}
        <ul class="flex min-w-0 flex-wrap items-center gap-2" aria-label="Filtros ligados">
          {#each chips as chip (chip.key)}
            <li
              animate:flip={{ duration: motionMs(DURATION.fast) }}
              transition:scale={{ duration: motionMs(DURATION.fast), start: 0.8 }}
            >
              <button
                type="button"
                onclick={chip.onRemove}
                aria-label={`Tirar o filtro ${chip.label}`}
                class="border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 focus-visible:ring-ring inline-flex max-w-full items-center gap-1.5 rounded-full border py-1 pr-2 pl-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <span class="truncate">{chip.label}</span>
                <X class="size-3.5 shrink-0" aria-hidden="true" />
              </button>
            </li>
          {/each}
        </ul>
      {/if}
      {#if !filtersState?.isFilteredOut}
        <ActionButton
          data={{ label: 'Limpar filtros' }}
          ui={{ variant: 'ghost', size: 'sm', icon: FilterX, className: 'ml-auto' }}
          actions={{ onClick: actions.onClearFilters }}
        />
      {/if}
    </div>
  {/if}
</section>
