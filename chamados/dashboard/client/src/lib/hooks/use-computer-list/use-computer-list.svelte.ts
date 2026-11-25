import { goto } from '$app/navigation';
import { createQuery } from '@tanstack/svelte-query';
import { HEALTH_STATUSES, type HealthStatus } from '@template/shared/domain/computer-health.util';
import {
  RESOURCE_CONDITIONS,
  type ResourceCondition,
} from '@template/shared/domain/computer-resource.util';
import { COMPUTER_KINDS, type ComputerKind } from '@template/shared/domain/computer-kind.util';
import {
  COMPUTER_UPGRADE_FILTERS,
  type ComputerUpgradeFilter,
  matchesUpgradeFilter,
} from '@template/shared/domain/computer-upgrade.util';
import { type DepartmentChoice } from '@template/shared/domain/department.util';
import { compareMachines, type NumberedMachine } from '@template/shared/domain/machine-number.util';
import { type BoardDrill } from '@template/shared/schemas/board-drill.schema';
import {
  COMPUTER_ALERT_FILTERS,
  COMPUTER_PREVENTIVE_FILTERS,
  type Computer,
  type ComputerAlertFilter,
  type ComputerPreventiveFilter,
  type ComputerListItem,
} from '@template/shared/schemas/computer.schema';
import { type MaintenanceSchedule } from '@template/shared/schemas/maintenance.schema';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import { type ReportFormat } from '@template/shared/schemas/report.schema';
import { derived, writable } from 'svelte/store';

import { computersApi } from '$lib/api/computers.api';
import { type AzuosPersonPickerPerson } from '$lib/components/azuos-person-picker-field/azuos-person-picker-field.svelte';
import { readError } from '$lib/api/http-client';
import { type BoardDrillBanner, useBoardDrillModel } from '$lib/hooks/use-board-drill/use-board-drill.svelte';
import {
  allSchedulesQuery,
  schedulesByComputer,
} from '$lib/hooks/use-maintenance-schedule/use-maintenance-schedule.svelte';
import { useDepartmentOptionsModel } from '$lib/hooks/use-department-options/use-department-options.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { persistedFilterStore } from '$lib/hooks/use-persisted-filters/use-persisted-filters.svelte';
import { contextPath } from '$lib/navigation/navigation';
import { triggerBrowserDownload } from '$lib/utils/download-file.util';
import {
  fieldParser,
  isFlag,
  isText,
  oneOf,
  urlParser,
  type FieldGuards,
} from '$lib/utils/filter-fields.util';

export type ComputerListFilter = {
  search: string;
  /** O departamento OFICIAL pelo id do RH, como texto (`'12'`) — o mesmo que a máquina guarda. */
  departmentId: string;
  healthStatus: HealthStatus | '';
  kind: ComputerKind | '';
  /** Online e offline nunca ficam ligados juntos: ligar um desliga o outro. */
  onlyOnline: boolean;
  onlyOffline: boolean;
  alert: ComputerAlertFilter | '';
  /** Qual recurso está pedindo atenção: disco, memória, tempo sem reiniciar. */
  resourceCondition: ResourceCondition | '';
  /** A situação da preventiva — ou só quem precisa de manutenção (vencida ou nunca feita). */
  preventive: ComputerPreventiveFilter | '';
  /** Arquivadas saíram de uso: só aparecem quando alguém pede por elas. */
  includeArchived: boolean;
  /**
   * A pessoa do diretório (o id) ou `COMPUTER_NO_RESPONSIBLE_FILTER` ("Sem responsável"). O id,
   * e não o nome: nome muda e se repete, e o filtro salvo não pode passar a achar outra pessoa.
   */
  responsibleId: string;
  /** Quem precisa de upgrade: qualquer motivo ou um só (`computer-upgrade.util`). */
  upgrade: ComputerUpgradeFilter | '';
};

/** Os números do topo da tela: o estado do parque de relance. */
export type ComputerSummary = {
  total: number;
  online: number;
  offline: number;
  /** Com algum alerta aberto agora, de qualquer peça. */
  withAlerts: number;
  cpuHigh: number;
  memoryHigh: number;
  critical: number;
  attention: number;
  /** Cadastradas cujo agente nunca conectou — falta instalar o agente nelas. */
  neverSeen: number;
  /** Em uso e aquém em algum ponto: pouca memória, pouco disco ou processador antigo. */
  needsUpgrade: number;
};

/** Por qual coluna a lista está em ordem. `number` é o número da máquina, pelo nome físico. */
export const COMPUTER_SORT_FIELDS = ['number', 'responsible', 'health', 'tickets', 'lastSeen'] as const;

export type ComputerSortField = (typeof COMPUTER_SORT_FIELDS)[number];

export type ComputerSort = { field: ComputerSortField; direction: 'asc' | 'desc' };

/** A página dos cartões e o total que casou com o filtro — a tabela rola, não pagina. */
export type ComputerPaging = { page: number; pageSize: number; total: number };

/**
 * Quantos cartões por página. 24 fecha a grade em 4, 3 ou 2 colunas sem sobrar buraco na última
 * linha de uma página cheia.
 */
export const COMPUTER_CARD_PAGE_SIZE = 24;

export const DEFAULT_COMPUTER_SORT: ComputerSort = { field: 'number', direction: 'asc' };

export type ComputerListModel = {
  data: {
    computers: ComputerListItem[];
    /** Quantas casaram com o filtro — pode ser mais do que as que vieram na página. */
    total: number;
    /** O resumo do parque INTEIRO, que não acompanha o filtro. */
    summary: ComputerSummary | null;
    filter: ComputerListFilter;
    /** O dia agendado de cada máquina (`AAAA-MM-DD`), pelo id. Só as que têm agendamento. */
    scheduledFor: Record<number, string>;
    /** As opções do filtro de departamento: só as OFICIAIS do RH, com o id como valor. */
    departmentOptions: DepartmentChoice[];
    /** As pessoas do filtro "Responsável": quem responde por alguma máquina, com a foto. */
    responsibleOptions: AzuosPersonPickerPerson[];
    /** A faixa do recorte do Painel, quando a lista veio de um clique num bloco. */
    drillBanner: BoardDrillBanner | null;
    /** A ordem em vigor — é ela que decide a seta do cabeçalho da tabela. */
    sort: ComputerSort;
    /** A página dos cartões. */
    paging: ComputerPaging;
  };
  state: {
    isLoading: boolean;
    isRefetching: boolean;
    /** Não existe máquina nenhuma: o próximo passo é cadastrar a primeira. */
    isEmpty: boolean;
    /** Existem máquinas, mas o filtro escondeu todas: o próximo passo é limpar o filtro. */
    isFilteredOut: boolean;
    isTruncated: boolean;
    isSummaryLoading: boolean;
    error: string | null;
    /** Qual formato está sendo baixado agora — nulo quando nenhum. */
    exportingFormat: ReportFormat | null;
    exportError: string | null;
  };
  actions: {
    onSearchChange: (search: string) => void;
    onDepartmentChange: (departmentId: string) => void;
    onHealthStatusChange: (healthStatus: HealthStatus | '') => void;
    onKindChange: (kind: ComputerKind | '') => void;
    onOnlineChange: (onlyOnline: boolean) => void;
    onOfflineChange: (onlyOffline: boolean) => void;
    onAlertChange: (alert: ComputerAlertFilter | '') => void;
    onResourceConditionChange: (resourceCondition: ResourceCondition | '') => void;
    onPreventiveChange: (preventive: ComputerPreventiveFilter | '') => void;
    onArchivedChange: (includeArchived: boolean) => void;
    onResponsibleChange: (responsibleId: string) => void;
    onUpgradeChange: (upgrade: ComputerUpgradeFilter | '') => void;
    onClearFilters: () => void;
    /**
     * O cartão "Máquinas" do topo: desliga os atalhos dos outros cartões (saúde, conexão,
     * alerta e upgrade) de uma vez, sem mexer na busca, no departamento nem no resto do painel.
     */
    onClearShortcuts: () => void;
    /** Mesma coluna inverte a direção; outra coluna começa em ordem crescente. */
    onSortChange: (field: ComputerSortField) => void;
    onPageChange: (page: number) => void;
    onRetry: () => void;
    onOpen: (computer: Computer) => void;
    onExportReport: (format: ReportFormat) => void;
    onClearDrill: () => void;
    onBackToBoard: () => void;
  };
};

const EMPTY_FILTER: ComputerListFilter = {
  search: '',
  departmentId: '',
  healthStatus: '',
  kind: '',
  onlyOnline: false,
  onlyOffline: false,
  alert: '',
  resourceCondition: '',
  preventive: '',
  includeArchived: false,
  responsibleId: '',
  upgrade: '',
};

/** Cada campo do filtro conferido sozinho: um campo salvo que não serve volta ao padrão. */
const FILTER_GUARDS: FieldGuards<ComputerListFilter> = {
  search: isText,
  /* Sem `location`: o filtro de Local saiu, e um filtro salvo (ou link) antigo com ele é lido
     sem esse campo — os outros continuam valendo. */
  departmentId: isText,
  healthStatus: oneOf('', ...HEALTH_STATUSES),
  kind: oneOf('', ...COMPUTER_KINDS),
  onlyOnline: isFlag,
  onlyOffline: isFlag,
  alert: oneOf('', ...COMPUTER_ALERT_FILTERS),
  resourceCondition: oneOf('', ...RESOURCE_CONDITIONS),
  preventive: oneOf('', ...COMPUTER_PREVENTIVE_FILTERS),
  includeArchived: isFlag,
  responsibleId: isText,
  upgrade: oneOf('', ...COMPUTER_UPGRADE_FILTERS),
};

/**
 * Online e offline ligados JUNTOS não existem na tela, mas podem chegar de um salvo antigo ou de
 * um endereço digitado. O servidor faria valer só o online, e a tela marcaria os dois cartões —
 * a lista diria uma coisa e o topo outra. Aqui ganha o online, igual ao servidor.
 */
export function withSinglePresence<T extends Partial<Pick<ComputerListFilter, 'onlyOnline' | 'onlyOffline'>>>(
  filter: T,
): T {
  if (!filter.onlyOnline || !filter.onlyOffline) return filter;

  return { ...filter, onlyOffline: false };
}

const parseSaved = fieldParser(EMPTY_FILTER, FILTER_GUARDS);
const parseUrl = urlParser(EMPTY_FILTER, FILTER_GUARDS);

/** O nome desta tela no armazém dos filtros. Estável: renomear faz todo mundo perder o salvo. */
export const COMPUTER_LIST_FILTER_SCREEN = 'infra-computers';

export const COMPUTERS_QUERY_KEY = ['computers'] as const;
export const COMPUTER_NAME_REFRESH_MS = 60_000;

/** O recorte de um clique no Painel SOMA ao filtro da lista, não o substitui. */
function scopeOf(filter: ComputerListFilter, drill: BoardDrill | null = null) {
  return { drill: drill ?? undefined, ...filterScopeOf(filter) };
}

/** Os campos do filtro, separados do recorte para o `scopeOf` caber no limite de complexidade. */
function filterScopeOf(filter: ComputerListFilter) {
  return {
    search: filter.search.trim() || undefined,
    departmentId: filter.departmentId ? Number(filter.departmentId) : undefined,
    healthStatus: filter.healthStatus || undefined,
    kind: filter.kind || undefined,
    ...presenceOf(filter),
    ...planningScopeOf(filter),
    alert: filter.alert || undefined,
    resourceCondition: filter.resourceCondition || undefined,
    preventive: filter.preventive || undefined,
    includeArchived: filter.includeArchived || undefined,
  };
}

/** O responsável e o upgrade, separados para o `filterScopeOf` caber no limite de complexidade. */
function planningScopeOf(filter: ComputerListFilter) {
  return { responsibleId: filter.responsibleId || undefined, upgrade: filter.upgrade || undefined };
}

/** Online e offline, separados para o `scopeOf` caber no limite de complexidade. */
function presenceOf(filter: ComputerListFilter) {
  return {
    onlyOnline: filter.onlyOnline || undefined,
    onlyOffline: filter.onlyOffline || undefined,
  };
}

/**
 * O resumo do parque.
 *
 * Exportado e puro para ter teste próprio: é ele que decide o que a pessoa lê como "o estado
 * do parque hoje", e errar uma contagem aqui é dizer que está tudo bem quando não está.
 */
/** O dia agendado de cada máquina, pelo id — o que a linha da lista precisa saber. */
export function scheduledDayByComputer(
  schedules: readonly MaintenanceSchedule[] | undefined,
): Record<number, string> {
  return Object.fromEntries(
    [...schedulesByComputer(schedules)].map(([computerId, schedule]) => [
      computerId,
      schedule.scheduledFor,
    ]),
  );
}

/** O que a regra do número lê de uma máquina da lista: nomes, departamento e tipo. */
export function toNumberedMachine(computer: Computer): NumberedMachine {
  return {
    name: computer.name,
    displayName: computer.displayName,
    hostname: computer.hardware?.hostname ?? null,
    department: computer.departmentName,
    kind: computer.kind,
  };
}

/**
 * A lista na ordem do NÚMERO da máquina, pelo nome físico: ANALYZE-D01, ANALYZE-N01,
 * CERTIFICADO-D01, CERTIFICADO-D02… É como o TI conta o parque e como acha uma máquina
 * rolando a tela. Antes ela vinha da pior saúde para a melhor — quem quer as críticas tem o
 * filtro e o cartão do topo.
 */
export function sortByMachineNumber<T extends Computer>(computers: readonly T[]): T[] {
  return [...computers].sort((a, b) => compareMachines(toNumberedMachine(a), toNumberedMachine(b)));
}

/** O valor de cada máquina na coluna pedida. Nulo vai sempre para o fim, nas duas direções. */
const SORT_VALUE: Record<
  Exclude<ComputerSortField, 'number'>,
  (computer: ComputerListItem) => string | number | null
> = {
  responsible: (computer) => computer.responsibleName?.trim() || null,
  /* Nota crescente = pior saúde primeiro: é o que quem ordena por saúde está procurando. */
  health: (computer) => computer.healthScore,
  tickets: (computer) => computer.ticketsThisMonth,
  lastSeen: (computer) => (computer.lastSeenAt ? Date.parse(computer.lastSeenAt) : null),
};

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b, 'pt-BR');

  return Number(a) - Number(b);
}

/**
 * A lista na ordem pedida pelo cabeçalho da tabela. Empate cai no número da máquina, para a
 * ordem não "pular" a cada atualização de 60 segundos.
 *
 * Exportada e pura para ter teste próprio: a ordenação acontece aqui, e não no servidor, porque a
 * lista inteira (até 200) já está na tela e o número da máquina não se ordena em SQL.
 */
export function sortComputers(
  computers: readonly ComputerListItem[],
  sort: ComputerSort,
): ComputerListItem[] {
  const byNumber = sortByMachineNumber(computers);
  const direction = sort.direction === 'asc' ? 1 : -1;
  if (sort.field === 'number') return sort.direction === 'asc' ? byNumber : byNumber.reverse();

  const valueOf = SORT_VALUE[sort.field];
  /* Objeto comum, e não `Map`: é uma tabela de consulta descartável, sem reatividade. */
  const position: Record<number, number> = Object.fromEntries(
    byNumber.map((computer, index) => [computer.id, index]),
  );

  return byNumber.sort((a, b) => {
    const left = valueOf(a);
    const right = valueOf(b);
    if (left === null || right === null) {
      return (left === null ? 1 : 0) - (right === null ? 1 : 0) || tieBreak(a, b, position);
    }

    return compareValues(left, right) * direction || tieBreak(a, b, position);
  });
}

function tieBreak(
  a: ComputerListItem,
  b: ComputerListItem,
  position: Record<number, number>,
): number {
  return (position[a.id] ?? 0) - (position[b.id] ?? 0);
}

/** A ordem que o clique no cabeçalho pede: mesma coluna inverte, outra começa crescente. */
export function nextSort(current: ComputerSort, field: ComputerSortField): ComputerSort {
  if (current.field !== field) return { field, direction: 'asc' };

  return { field, direction: current.direction === 'asc' ? 'desc' : 'asc' };
}

/** A página que existe: com o filtro mais estreito, a página 3 de antes pode não existir mais. */
export function clampPage(page: number, total: number, pageSize: number): number {
  const last = Math.max(1, Math.ceil(total / pageSize));

  return Math.min(Math.max(1, page), last);
}

/**
 * As pessoas do filtro "Responsável": quem responde por ALGUMA máquina do parque, uma vez só,
 * com a foto do admin-console e em ordem de nome. O id e a foto vêm do servidor, que casou o
 * nome do cadastro com o diretório.
 *
 * Só quem tem máquina, e não o escritório inteiro: escolher alguém sem máquina daria sempre a
 * lista vazia. Nome digitado que não bate com ninguém do diretório não vira opção — não há id
 * para guardar —, mas continua achável pela busca.
 *
 * Exportada e pura para ter teste próprio.
 */
export function responsibleOptionsOf(
  computers: readonly ComputerListItem[],
): AzuosPersonPickerPerson[] {
  /* Objeto comum, e não `Map`: é uma tabela de consulta descartável, sem reatividade. */
  const people: Record<string, AzuosPersonPickerPerson> = {};
  for (const computer of computers) {
    if (!computer.responsibleId || people[computer.responsibleId]) continue;
    people[computer.responsibleId] = {
      id: computer.responsibleId,
      name: computer.responsibleName?.trim() || '(Pessoa fora da lista do escritório)',
      photo: computer.responsibleAvatarUrl ?? null,
    };
  }

  return Object.values(people).sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
}

export function summarizeComputers(computers: readonly ComputerListItem[]): ComputerSummary {
  return {
    total: computers.length,
    online: computers.filter((computer) => computer.isOnline).length,
    offline: computers.filter((computer) => !computer.isOnline).length,
    withAlerts: computers.filter((computer) => computer.activeAlerts > 0).length,
    cpuHigh: computers.filter((computer) => computer.activeAlertMetrics.includes('cpu')).length,
    memoryHigh: computers.filter((computer) => computer.activeAlertMetrics.includes('memory'))
      .length,
    critical: computers.filter((computer) => computer.healthStatus === 'critical').length,
    attention: computers.filter((computer) => computer.healthStatus === 'attention').length,
    neverSeen: computers.filter((computer) => computer.lastSeenAt === null).length,
    /* A mesma régua do aviso do cartão e do filtro do servidor. A lista do resumo já vem sem
       arquivadas e descartadas, que não recebem peça. */
    needsUpgrade: computers.filter((computer) =>
      matchesUpgradeFilter(computer.hardware ?? {}, 'any'),
    ).length,
  };
}

/**
 * Estado, consultas e handlers do inventário. ZERO marcação — a view recebe tudo por props e
 * não sabe de onde o dado veio (CONTRIBUTING §3).
 *
 * Cadastrar e abrir a ficha NÃO estão aqui: o cadastro tem view-model próprio
 * (`use-computer-form`) e a ficha é outra rota.
 */
export function useComputerListModel(): ComputerListModel {
  /* O filtro mora numa STORE, e não num `$state`: esta versão do @tanstack/svelte-query
     recebe as opções como store e é ela quem decide quando refazer a busca. Com `$state`,
     duas mudanças seguidas de filtro chegariam à consulta como uma emissão só, com o valor
     do meio — e a API seria chamada sem um dos filtros. */
  const filterStore = persistedFilterStore<ComputerListFilter>({
    screen: COMPUTER_LIST_FILTER_SCREEN,
    defaults: EMPTY_FILTER,
    parse: (raw) => {
      const parsed = parseSaved(raw);

      return parsed ? withSinglePresence(parsed) : null;
    },
    fromUrl: (params) => {
      const requested = parseUrl(params);

      return requested ? withSinglePresence(requested) : null;
    },
  });
  const filter = mirrorStore(filterStore);
  /* O recorte de um clique no Painel (`?drill=`): soma ao filtro do inventário. */
  const drill = useBoardDrillModel({ module: 'infra', path: contextPath('infra', '/computers') });

  let exportingFormat = $state<ReportFormat | null>(null);
  let exportError = $state<string | null>(null);
  let sort = $state<ComputerSort>(DEFAULT_COMPUTER_SORT);
  let page = $state(1);

  /* Todo filtro que muda volta para a página 1: ficar na página 3 de um recorte novo mostraria
     uma página vazia — ou pior, o meio da lista, sem a pessoa ver as primeiras. */
  function changeFilter(change: (current: ComputerListFilter) => ComputerListFilter) {
    page = 1;
    filterStore.update(change);
  }

  const list = mirrorStore(
    createQuery(
      derived([filterStore, drill.store], ([current, currentDrill]) => ({
        queryKey: [...COMPUTERS_QUERY_KEY, 'list', scopeOf(current, currentDrill)],
        queryFn: () =>
          computersApi.list({ ...scopeOf(current, currentDrill), page: 1, pageSize: MAX_PAGE_SIZE }),
        refetchInterval: COMPUTER_NAME_REFRESH_MS,
      })),
    ),
  );

  /* O resumo NÃO recebe o filtro: "quantas máquinas estão críticas" é uma pergunta sobre o
     parque, não sobre a busca. Recalculá-lo a cada filtro faria o número cair enquanto a
     pessoa procura uma máquina, como se o problema tivesse sido resolvido pela busca. */
  const summary = mirrorStore(
    createQuery(
      writable({
        queryKey: [...COMPUTERS_QUERY_KEY, 'summary'],
        queryFn: () => computersApi.list({ page: 1, pageSize: MAX_PAGE_SIZE }),
        refetchInterval: COMPUTER_NAME_REFRESH_MS,
      }),
    ),
  );

  /* Os agendamentos vêm da Manutenção, numa consulta à parte: o agendamento é dela, e a
     lista só mostra. Sem filtro pelo mesmo motivo do resumo — são poucos, um por máquina. */
  const schedules = mirrorStore(allSchedulesQuery());
  const departments = useDepartmentOptionsModel();

  return {
    /* `get` em vez de valor: o objeto é montado uma vez e a tela lê dele a cada mudança. Com
       valores fixos, a lista congelaria no primeiro carregamento. */
    get data() {
      const computers = sortComputers(list.current.data?.items ?? [], sort);

      return {
        computers,
        total: list.current.data?.total ?? 0,
        summary: summary.current.data ? summarizeComputers(summary.current.data.items) : null,
        filter: filter.current,
        scheduledFor: scheduledDayByComputer(schedules.current.data),
        departmentOptions: departments.officialOptions,
        /* Do resumo, e não da lista: com a lista filtrada pela Ana, a Ana seria a única opção
           — e trocar de pessoa obrigaria a limpar o filtro antes. */
        responsibleOptions: responsibleOptionsOf(summary.current.data?.items ?? []),
        drillBanner: drill.banner,
        sort,
        paging: {
          page: clampPage(page, computers.length, COMPUTER_CARD_PAGE_SIZE),
          pageSize: COMPUTER_CARD_PAGE_SIZE,
          total: computers.length,
        },
      };
    },
    get state() {
      return {
        ...buildListState(list.current, filter.current, drill.drill !== null),
        isSummaryLoading: summary.current.isPending,
        exportingFormat,
        exportError,
      };
    },
    actions: {
      onSearchChange: (search) => changeFilter((current) => ({ ...current, search })),
      onDepartmentChange: (departmentId) => changeFilter((current) => ({ ...current, departmentId })),
      onHealthStatusChange: (healthStatus) =>
        changeFilter((current) => ({ ...current, healthStatus })),
      onKindChange: (kind) => changeFilter((current) => ({ ...current, kind })),
      /* Ligar online desliga offline (e o contrário): os dois juntos não trariam máquina nenhuma. */
      onOnlineChange: (onlyOnline) =>
        changeFilter((current) => ({
          ...current,
          onlyOnline,
          onlyOffline: onlyOnline ? false : current.onlyOffline,
        })),
      onOfflineChange: (onlyOffline) =>
        changeFilter((current) => ({
          ...current,
          onlyOffline,
          onlyOnline: onlyOffline ? false : current.onlyOnline,
        })),
      onAlertChange: (alert) => changeFilter((current) => ({ ...current, alert })),
      onResourceConditionChange: (resourceCondition) =>
        changeFilter((current) => ({ ...current, resourceCondition })),
      onPreventiveChange: (preventive) => changeFilter((current) => ({ ...current, preventive })),
      onArchivedChange: (includeArchived) =>
        changeFilter((current) => ({ ...current, includeArchived })),
      onResponsibleChange: (responsibleId) =>
        changeFilter((current) => ({ ...current, responsibleId })),
      onUpgradeChange: (upgrade) => changeFilter((current) => ({ ...current, upgrade })),
      onClearFilters: () => {
        page = 1;
        filterStore.clear();
      },
      /* Uma mudança só, e não quatro: cada uma viraria uma consulta à API com o valor do meio. */
      onClearShortcuts: () =>
        changeFilter((current) => ({
          ...current,
          healthStatus: '',
          alert: '',
          onlyOnline: false,
          onlyOffline: false,
          upgrade: '',
        })),
      onSortChange: (field) => {
        page = 1;
        sort = nextSort(sort, field);
      },
      onPageChange: (next) => {
        page = Math.max(1, next);
      },
      onRetry: () => {
        void list.current.refetch();
        void summary.current.refetch();
      },
      /* A navegação mora no view-model: componente de UI não navega (CONTRIBUTING §3). */
      onOpen: (computer) => void goto(`/infra/computers/${computer.id}`),
      onExportReport: (format) => {
        exportError = null;
        exportingFormat = format;

        computersApi
          .exportReport(scopeOf(filter.current, drill.drill), format)
          .then(({ blob, fileName }) => triggerBrowserDownload(blob, fileName))
          .catch((error: unknown) => {
            exportError = readError(error) ?? 'Não consegui gerar o relatório.';
          })
          .finally(() => {
            exportingFormat = null;
          });
      },
      onClearDrill: drill.onClear,
      onBackToBoard: drill.onBack,
    },
  };
}

type ComputerPage = { items: Computer[]; total: number } | undefined;

type ListQueryLike = {
  isPending: boolean;
  isSuccess: boolean;
  isRefetching: boolean;
  error: unknown;
  data: ComputerPage;
};

/** A busca, o responsável e o upgrade, separados para o `hasAnyFilter` caber no limite de complexidade. */
function hasTextFilter(filter: ComputerListFilter): boolean {
  return (
    filter.search.trim() !== '' ||
    filter.responsibleId !== '' ||
    filter.upgrade !== ''
  );
}

function hasAnyFilter(filter: ComputerListFilter): boolean {
  if (hasTextFilter(filter)) return true;

  return (
    filter.departmentId !== '' ||
    filter.healthStatus !== '' ||
    filter.kind !== '' ||
    filter.alert !== '' ||
    filter.resourceCondition !== '' ||
    filter.preventive !== '' ||
    filter.includeArchived ||
    filter.onlyOnline ||
    filter.onlyOffline
  );
}

function buildListState(
  list: ListQueryLike,
  filter: ComputerListFilter,
  hasDrill = false,
): Omit<ComputerListModel['state'], 'isSummaryLoading' | 'exportingFormat' | 'exportError'> {
  const count = list.data?.items.length ?? 0;
  /* Vazio só é vazio DEPOIS que a consulta terminou. Mostrar "nenhuma máquina" durante o
     carregamento faz a pessoa achar que o inventário sumiu — e recarregar. */
  const isSettledEmpty = list.isSuccess && count === 0;
  /* O recorte do Painel também é filtro: vazio com ele é "o recorte escondeu tudo". */
  const filtered = hasDrill || hasAnyFilter(filter);

  return {
    isLoading: list.isPending,
    isRefetching: list.isRefetching,
    isEmpty: isSettledEmpty && !filtered,
    isFilteredOut: isSettledEmpty && filtered,
    /* Veio menos do que casou: a tela precisa dizer, nunca truncar calada. */
    isTruncated: (list.data?.total ?? 0) > count,
    error: readError(list.error),
  };
}
