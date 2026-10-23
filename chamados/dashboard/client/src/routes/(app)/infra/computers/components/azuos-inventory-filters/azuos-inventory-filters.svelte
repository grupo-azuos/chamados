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
  import FilterPanel, {
    type FilterPanelField,
  } from '$lib/components/azuos-filter-panel/azuos-filter-panel.svelte';

  let { data, state: filtersState, actions }: AzuosInventoryFiltersProps = $props();

  const chips = $derived(activeFilterChips(data.filter, actions));

  /**
   * Os filtros do painel, intercalando pastilhas (poucas opções) e listas suspensas (muitas):
   * o que a máquina está fazendo agora, a manutenção e o cadastro.
   */
  const fields: FilterPanelField[] = $derived([
    {
      key: 'connection',
      label: 'Conexão',
      control: 'pills',
      ariaLabel: 'Filtrar por conexão',
      allLabel: 'Todas',
      value: connectionOf(data.filter),
      options: CONNECTION_OPTIONS,
    },
    {
      key: 'health',
      label: 'Saúde',
      control: 'select',
      ariaLabel: 'Filtrar por saúde',
      allLabel: 'Toda a saúde',
      value: data.filter.healthStatus,
      options: HEALTH_OPTIONS,
    },
    {
      key: 'kind',
      label: 'Tipo',
      control: 'pills',
      ariaLabel: 'Filtrar por tipo',
      allLabel: 'Todos',
      value: data.filter.kind,
      options: KIND_OPTIONS,
    },
    {
      key: 'alert',
      label: 'Alertas',
      control: 'select',
      ariaLabel: 'Filtrar por alerta',
      allLabel: 'Todos',
      value: data.filter.alert,
      options: ALERT_OPTIONS,
    },
    {
      key: 'archived',
      label: 'Arquivadas',
      control: 'pills',
      ariaLabel: 'Máquinas arquivadas',
      allLabel: 'Ocultar',
      value: data.filter.includeArchived ? 'yes' : '',
      options: ARCHIVED_OPTIONS,
    },
    {
      key: 'preventive',
      label: 'Preventiva',
      control: 'select',
      ariaLabel: 'Filtrar pela preventiva',
      allLabel: 'Todas',
      value: data.filter.preventive,
      options: PREVENTIVE_OPTIONS,
    },
  ]);

  /* Lista suspensa SEMPRE, e não pastilhas: os departamentos vêm do RH e crescem. */
  const primary: FilterPanelField = $derived({
    key: 'department',
    label: 'Departamento',
    control: 'select',
    ariaLabel: 'Filtrar por departamento',
    allLabel: 'Todos os departamentos',
    value: data.filter.department,
    options: data.departmentOptions,
    searchPlaceholder: 'Buscar departamento…',
  });

  /** Qual ação do inventário cada filtro do painel chama. */
  const ON_CHANGE: Record<string, (value: string) => void> = {
    department: (value) => actions.onDepartmentChange(value as Department | ''),
    connection: (value) => changeConnection(value),
    health: (value) => actions.onHealthStatusChange(value as HealthStatus | ''),
    kind: (value) => actions.onKindChange(value as ComputerKind | ''),
    alert: (value) => actions.onAlertChange(value as ComputerAlertFilter | ''),
    archived: (value) => actions.onArchivedChange(value === 'yes'),
    preventive: (value) => actions.onPreventiveChange(value as ComputerPreventiveFilter | ''),
  };

  function changeConnection(value: string) {
    if (value === 'online') return actions.onOnlineChange(true);
    if (value === 'offline') return actions.onOfflineChange(true);

    actions.onOnlineChange(false);
    actions.onOfflineChange(false);
  }
</script>

<FilterPanel
  data={{
    search: { value: data.filter.search, placeholder: 'Nome da máquina, apelido ou responsável' },
    primary,
    fields,
    chips: chips.map(({ key, label }) => ({ key, label })),
    canClear: hasAnyFilter(data.filter, chips),
  }}
  ui={{ ariaLabel: 'Filtros do inventário' }}
  state={{ isFilteredOut: filtersState?.isFilteredOut }}
  actions={{
    onSearchChange: actions.onSearchChange,
    onFieldChange: (key, value) => ON_CHANGE[key]?.(value),
    onRemoveChip: (key) => chips.find((chip) => chip.key === key)?.onRemove(),
    onClearFilters: actions.onClearFilters,
  }}
/>
