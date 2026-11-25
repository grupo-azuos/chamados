import { createQuery } from '@tanstack/svelte-query';
import { type DepartmentChoice } from '@template/shared/domain/department.util';
import {
  TICKET_PROBLEM_TYPES,
  type TicketDepartment,
  type TicketProblemType,
} from '@template/shared/domain/ticket-catalog.util';
import {
  TICKET_PRIORITIES,
  TICKET_STATUS_GROUPS,
  TICKET_STATUSES,
  type TicketPriority,
  type TicketStatus,
  type TicketStatusGroup,
} from '@template/shared/domain/ticket-status.util';
import { type BoardDrill } from '@template/shared/schemas/board-drill.schema';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import { type ReportFormat } from '@template/shared/schemas/report.schema';
import {
  TICKET_UNASSIGNED_FILTER,
  type Ticket,
  type TicketAssigneeOption,
} from '@template/shared/schemas/ticket.schema';
import { derived, writable } from 'svelte/store';

import { replaceState } from '$app/navigation';
import { page as currentPage } from '$app/state';
import { readError } from '$lib/api/http-client';
import { softwareProjectsApi } from '$lib/api/software-projects.api';
import { ticketsApi, type TicketDashboard } from '$lib/api/tickets.api';
import { type AreaContext } from '$lib/hooks/use-area-context/use-area-context.svelte';
import { type BoardDrillBanner, useBoardDrillModel } from '$lib/hooks/use-board-drill/use-board-drill.svelte';
import { useDepartmentOptionsModel } from '$lib/hooks/use-department-options/use-department-options.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { persistedFilterStore } from '$lib/hooks/use-persisted-filters/use-persisted-filters.svelte';
import { contextPath } from '$lib/navigation/navigation';
import { triggerBrowserDownload } from '$lib/utils/download-file.util';
import {
  fieldParser,
  isText,
  oneOf,
  urlParser,
  type FieldGuards,
} from '$lib/utils/filter-fields.util';

export const TICKETS_PAGE_SIZE = 15;

/**
 * Quantos chamados o QUADRO traz de uma vez: o maior pedaço que a API entrega (o mesmo do antigo
 * Kanban de Sistema). O quadro não pagina — uma coluna cortada em páginas não se arrasta —, e o
 * que passar disso a tela avisa, para a pessoa estreitar pelos filtros.
 */
export const TICKETS_BOARD_SIZE = MAX_PAGE_SIZE;

/** Os jeitos de ver a fila: a lista (tabela ou cards) ou o quadro por colunas. */
export const TICKET_QUEUE_VIEWS = ['list', 'kanban'] as const;

export type TicketQueueView = (typeof TICKET_QUEUE_VIEWS)[number];

/** O parâmetro do endereço que abre a fila já num modo (`?view=kanban`). */
export const TICKET_VIEW_PARAM = 'view';

export type TicketListFilter = {
  search: string;
  status: TicketStatus | '';
  /**
   * Um GRUPO de estágios de uma vez — o filtro dos cartões "Aguardando" e "Resolvidos", que
   * contam mais de um estágio. Nunca vale junto com `status`: escolher um limpa o outro.
   */
  statusGroup: TicketStatusGroup | '';
  priority: TicketPriority | '';
  department: TicketDepartment | '';
  problemType: TicketProblemType | '';
  /** O id do responsável, `TICKET_UNASSIGNED_FILTER` para os sem ninguém, ou '' para todos. */
  assigneeId: string;
  /**
   * O SISTEMA (cadastro de Sistemas e Projetos), pelo id em texto — '' para todos. Só a fila de
   * Sistema tem sistema; nas outras áreas o campo nem aparece e não vai para a API.
   */
  projectId: string;
};

/** Um sistema no filtro da fila de Sistema. */
export type TicketProjectFilterOption = { value: string; label: string };

/** Uma pessoa no filtro de responsável — com a foto, para achar pelo rosto. */
export type TicketAssigneeFilterOption = {
  value: string;
  label: string;
  avatar?: { name: string; url: string | null };
  separatorBefore?: boolean;
};

export type TicketListModel = {
  data: {
    /**
     * A ÁREA da fila — o contexto da rota (#13). A tela usa para oferecer só os tipos de
     * problema que existem nessa área: "Certificado digital" não é assunto de Manutenção, e
     * "Ar-condicionado" não é de Infraestrutura.
     */
    area: AreaContext;
    tickets: Ticket[];
    /** Quantos casaram com o filtro — pode ser mais do que os que vieram na página. */
    total: number;
    /** Os indicadores, sobre TODOS os chamados: eles não seguem o filtro da lista. */
    dashboard: TicketDashboard | null;
    filter: TicketListFilter;
    /** A página da lista. Ausente no quadro, que traz tudo de uma vez. */
    paging?: {
      page: number;
      pageSize: number;
      total: number;
    };
    /** As opções do filtro de departamento: as do RH e, depois da linha, as daqui. */
    departmentOptions: DepartmentChoice[];
    /** A faixa do recorte de um clique no Painel — nula quando a fila não veio de lá. */
    drillBanner: BoardDrillBanner | null;
    /** "Sem responsável" e, depois da linha, quem atende a área — com foto. */
    assigneeOptions: TicketAssigneeFilterOption[];
    /** Os sistemas cadastrados — só na fila de Sistema; vazio nas outras áreas. */
    projectOptions: TicketProjectFilterOption[];
    /** Lista (tabela ou cards) ou quadro. */
    view: TicketQueueView;
  };
  state: {
    isLoading: boolean;
    isRefetching: boolean;
    /** Não existe chamado nenhum: nada a fazer ainda. */
    isEmpty: boolean;
    /** Existem chamados, mas o filtro escondeu todos: o próximo passo é limpar o filtro. */
    isFilteredOut: boolean;
    isTruncated: boolean;
    isDashboardLoading: boolean;
    error: string | null;
    /** Qual formato está sendo baixado agora — nulo quando nenhum. */
    exportingFormat: ReportFormat | null;
    exportError: string | null;
  };
  actions: {
    onSearchChange: (search: string) => void;
    onStatusChange: (status: TicketStatus | '') => void;
    onStatusGroupChange: (group: TicketStatusGroup | '') => void;
    onPriorityChange: (priority: TicketPriority | '') => void;
    onDepartmentChange: (department: TicketDepartment | '') => void;
    onProblemTypeChange: (problemType: TicketProblemType | '') => void;
    onAssigneeChange: (assigneeId: string) => void;
    onProjectChange: (projectId: string) => void;
    onPageChange: (page: number) => void;
    /** Lista ou quadro — a escolha fica guardada por fila, e no endereço. */
    onViewChange: (view: TicketQueueView) => void;
    onClearFilters: () => void;
    onRetry: () => void;
    onExportReport: (format: ReportFormat) => void;
    /** "Limpar recorte": a fila volta aos filtros dela. */
    onClearDrill: () => void;
    onBackToBoard: () => void;
  };
};

const EMPTY_FILTER: TicketListFilter = {
  search: '',
  status: '',
  statusGroup: '',
  priority: '',
  department: '',
  problemType: '',
  assigneeId: '',
  projectId: '',
};

const isProjectId = (value: unknown): value is string =>
  typeof value === 'string' && /^\d*$/.test(value);

/** Cada campo do filtro conferido sozinho: um campo salvo que não serve volta ao padrão. */
const FILTER_GUARDS: FieldGuards<TicketListFilter> = {
  search: isText,
  status: oneOf('', ...TICKET_STATUSES),
  statusGroup: oneOf('', ...TICKET_STATUS_GROUPS),
  priority: oneOf('', ...TICKET_PRIORITIES),
  department: isText,
  problemType: oneOf('', ...TICKET_PROBLEM_TYPES),
  assigneeId: isText,
  projectId: isProjectId,
};

type ViewChoice = { view: TicketQueueView };

const VIEW_DEFAULTS: ViewChoice = { view: 'list' };

const VIEW_GUARDS: FieldGuards<ViewChoice> = { view: oneOf(...TICKET_QUEUE_VIEWS) };

export const TICKETS_QUERY_KEY = ['tickets'] as const;

/**
 * `areaContext` é o contexto da rota (#13) — a área em que a pessoa está trabalhando.
 * A fila é SEMPRE dessa área: não existe mais um "Todas" misturando chamado de computador com
 * chamado de ar-condicionado na mesma lista. Ele SOMA ao filtro, não o substitui.
 */
function scopeOf(filter: TicketListFilter, areaContext: AreaContext, drill: BoardDrill | null = null) {
  return {
    drill: drill ?? undefined,
    search: filter.search.trim() || undefined,
    status: filter.status || undefined,
    statusGroup: filter.statusGroup || undefined,
    priority: filter.priority || undefined,
    area: areaContext,
    department: filter.department || undefined,
    problemType: filter.problemType || undefined,
    assigneeId: filter.assigneeId || undefined,
    projectId: projectIdOf(filter, areaContext),
  };
}

/* Sistema só existe na fila de Sistema: um filtro salvo noutra área nunca vai para a API. */
function projectIdOf(filter: TicketListFilter, areaContext: AreaContext): number | undefined {
  if (areaContext !== 'sistema' || filter.projectId === '') return undefined;

  return Number(filter.projectId);
}

/**
 * O modo escolhido vai também para o ENDEREÇO (`?view=kanban`), sem recarregar nada: o link
 * copiado abre no mesmo modo, e o F5 não volta para o modo que a URL antiga dizia.
 */
function syncViewParam(view: TicketQueueView): void {
  const url = new URL(currentPage.url);
  if (view === 'kanban') url.searchParams.set(TICKET_VIEW_PARAM, view);
  if (view !== 'kanban') url.searchParams.delete(TICKET_VIEW_PARAM);
  if (url.href === currentPage.url.href) return;

  replaceState(url, currentPage.state ?? {});
}

/**
 * As opções do filtro de responsável. "Sem responsável" vem primeiro: é a fila de quem ainda
 * precisa ser pego, a pergunta mais comum. Depois, quem atende a área, com a foto do
 * admin-console.
 */
export function toAssigneeFilterOptions(
  people: readonly TicketAssigneeOption[],
): TicketAssigneeFilterOption[] {
  return [
    { value: TICKET_UNASSIGNED_FILTER, label: '(Sem responsável)' },
    ...people.map((person, index) => ({
      value: person.id,
      label: person.name,
      avatar: { name: person.name, url: person.avatarUrl ?? null },
      separatorBefore: index === 0,
    })),
  ];
}

/** As opções do filtro de sistema, do cadastro de Sistemas e Projetos. */
export function toProjectFilterOptions(
  projects: readonly { id: number; name: string }[],
): TicketProjectFilterOption[] {
  return projects.map((project) => ({ value: String(project.id), label: project.name }));
}

/**
 * Estado, consultas e handlers da fila de chamados do painel. ZERO marcação — a view recebe
 * tudo por props e não sabe de onde o dado veio (CONTRIBUTING §3).
 *
 * Atender um chamado NÃO está aqui: ele tem a própria ficha (`/<contexto>/tickets/[id]`), com
 * os view-models dela (`use-ticket-detail`, `use-ticket-history-form`, `use-ticket-data-form`).
 *
 * `area` chega por parâmetro, e não de um estado global: cada contexto tem a própria rota
 * (`/infra/tickets`, `/system/tickets`, `/maintenance/tickets`), e é a rota que sabe de quem
 * é a fila. Ela não muda enquanto a tela vive — trocar de contexto é trocar de rota, e a tela
 * nova monta um model novo.
 */
export function useTicketListModel(input: { area: AreaContext }): TicketListModel {
  const { area } = input;

  /* O filtro mora numa STORE, e não num `$state`: esta versão do @tanstack/svelte-query
     recebe as opções como store e é ela quem decide quando refazer a busca. Com `$state`,
     duas mudanças seguidas de filtro chegariam à consulta como uma emissão só, com o valor
     do meio — e a API seria chamada sem um dos filtros. */
  /* Uma entrada por fila: o recorte de Infra não vaza para a de Sistema. */
  const filterStore = persistedFilterStore<TicketListFilter>({
    screen: `${area}-tickets`,
    defaults: EMPTY_FILTER,
    parse: fieldParser(EMPTY_FILTER, FILTER_GUARDS),
    fromUrl: urlParser(EMPTY_FILTER, FILTER_GUARDS),
  });
  const filter = mirrorStore(filterStore);
  const pageStore = writable<number>(1);
  const page = mirrorStore(pageStore);
  /* O recorte de um clique no Painel (`?drill=`): soma ao filtro da fila. */
  const drill = useBoardDrillModel({ module: area, path: contextPath(area, '/tickets') });

  let exportingFormat = $state<ReportFormat | null>(null);
  let exportError = $state<string | null>(null);

  /* Lista ou quadro, por fila: quem trabalha a de Sistema no quadro não muda a de Infra. O
     endereço (`?view=kanban`) ganha do guardado — é por ele que o antigo `/system/kanban` chega. */
  const viewStore = persistedFilterStore<ViewChoice>({
    screen: `${area}-tickets-view`,
    defaults: VIEW_DEFAULTS,
    parse: fieldParser(VIEW_DEFAULTS, VIEW_GUARDS),
    fromUrl: urlParser(VIEW_DEFAULTS, VIEW_GUARDS),
  });
  const view = mirrorStore(viewStore);

  /* Só o modo à vista busca: a página de 15 da lista e o quadro inteiro (até 200) nunca saem
     juntos. Os dois com o MESMO recorte — busca, departamento, painel e cartões do topo. */
  const list = mirrorStore(
    createQuery(
      derived(
        [filterStore, pageStore, drill.store, viewStore],
        ([currentFilter, currentPageNumber, currentDrill, currentView]) => ({
          queryKey: [...TICKETS_QUERY_KEY, 'list', scopeOf(currentFilter, area, currentDrill), currentPageNumber],
          queryFn: () =>
            ticketsApi.list({
              ...scopeOf(currentFilter, area, currentDrill),
              page: currentPageNumber,
              pageSize: TICKETS_PAGE_SIZE,
            }),
          enabled: currentView.view === 'list',
        }),
      ),
    ),
  );

  const board = mirrorStore(
    createQuery(
      derived([filterStore, drill.store, viewStore], ([currentFilter, currentDrill, currentView]) => ({
        queryKey: [...TICKETS_QUERY_KEY, 'board', scopeOf(currentFilter, area, currentDrill)],
        queryFn: () =>
          ticketsApi.list({
            ...scopeOf(currentFilter, area, currentDrill),
            page: 1,
            pageSize: TICKETS_BOARD_SIZE,
          }),
        enabled: currentView.view === 'kanban',
      })),
    ),
  );

  /* Os sistemas só existem na fila de Sistema: nas outras áreas a consulta nem sai. */
  const projects = mirrorStore(
    createQuery(
      writable({
        queryKey: ['software-projects', 'all'],
        queryFn: () => softwareProjectsApi.list({ page: 1, pageSize: 100 }),
        enabled: area === 'sistema',
        staleTime: 5 * 60 * 1000,
      }),
    ),
  );

  const activeQuery = () => (view.current.view === 'kanban' ? board.current : list.current);

  /* Os indicadores NÃO recebem o filtro: "quanto tempo levamos para resolver" é uma pergunta
     sobre o atendimento inteiro. Recalculá-los a cada filtro faria o número mudar enquanto a
     pessoa procura um chamado, como se o desempenho do time dependesse da busca.

     Mas eles RECEBEM O CONTEXTO (#13), pelo motivo oposto: o contexto não é um filtro da
     tela, é a área em que a pessoa está trabalhando. Sem ele, os "98 abertos" de
     Infraestrutura apareciam em cima da fila de Manutenção, que não tem nenhum. */
  const dashboard = mirrorStore(
    createQuery(
      writable({
        queryKey: [...TICKETS_QUERY_KEY, 'dashboard', area],
        queryFn: () => ticketsApi.dashboard(area),
      }),
    ),
  );

  const departments = useDepartmentOptionsModel();

  /* Quem atende a área muda pouco: a lista vale por 5 minutos, e o filtro funciona mesmo
     enquanto ela não chega (ou se o admin-console não responder) — só sem as fotos. */
  const assignees = mirrorStore(
    createQuery(
      writable({
        queryKey: [...TICKETS_QUERY_KEY, 'assignee-options', area],
        queryFn: () => ticketsApi.assigneeOptions(area),
        staleTime: 5 * 60 * 1000,
      }),
    ),
  );

  return {
    /* `get` em vez de valor: o objeto é montado uma vez e a tela lê dele a cada mudança. Com
       valores fixos, a lista congelaria no primeiro carregamento. */
    get data() {
      return buildData({
        departmentOptions: departments.options,
        assigneeOptions: toAssigneeFilterOptions(assignees.current.data ?? []),
        projectOptions: toProjectFilterOptions(projects.current.data?.items ?? []),
        area,
        view: view.current.view,
        page: activeQuery().data,
        currentPage: page.current,
        dashboard: dashboard.current.data ?? null,
        filter: filter.current,
        drillBanner: drill.banner,
      });
    },
    get state() {
      return {
        ...buildListState(activeQuery(), filter.current, drill.drill !== null),
        isDashboardLoading: dashboard.current.isPending,
        exportingFormat,
        exportError,
      };
    },
    actions: {
      onSearchChange: (search) => {
        pageStore.set(1);
        filterStore.update((current) => ({ ...current, search }));
      },
      onStatusChange: (status) => {
        pageStore.set(1);
        /* Estágio e grupo são o MESMO filtro em dois tamanhos: os dois juntos pediriam
           "aberto E aguardando", que não acha nada. */
        filterStore.update((current) => ({ ...current, status, statusGroup: '' }));
      },
      onStatusGroupChange: (statusGroup) => {
        pageStore.set(1);
        filterStore.update((current) => ({ ...current, statusGroup, status: '' }));
      },
      onPriorityChange: (priority) => {
        pageStore.set(1);
        filterStore.update((current) => ({ ...current, priority }));
      },
      onDepartmentChange: (department) => {
        pageStore.set(1);
        filterStore.update((current) => ({ ...current, department }));
      },
      onProblemTypeChange: (problemType) => {
        pageStore.set(1);
        filterStore.update((current) => ({ ...current, problemType }));
      },
      onAssigneeChange: (assigneeId) => {
        pageStore.set(1);
        filterStore.update((current) => ({ ...current, assigneeId }));
      },
      onProjectChange: (projectId) => {
        pageStore.set(1);
        filterStore.update((current) => ({ ...current, projectId }));
      },
      onPageChange: (newPage) => pageStore.set(newPage),
      onViewChange: (nextView) => {
        if (view.current.view === nextView) return;
        viewStore.update(() => ({ view: nextView }));
        syncViewParam(nextView);
      },
      onExportReport: (format) => {
        exportError = null;
        exportingFormat = format;

        ticketsApi
          .exportReport(scopeOf(filter.current, area, drill.drill), format)
          .then(({ blob, fileName }) => triggerBrowserDownload(blob, fileName))
          .catch((error: unknown) => {
            exportError = readError(error) ?? 'Não consegui gerar o relatório.';
          })
          .finally(() => {
            exportingFormat = null;
          });
      },
      onClearFilters: () => {
        pageStore.set(1);
        filterStore.clear();
      },
      onClearDrill: () => {
        pageStore.set(1);
        drill.onClear();
      },
      onBackToBoard: drill.onBack,
      onRetry: () => {
        void activeQuery().refetch();
        void dashboard.current.refetch();
      },
    },
  };
}

type TicketPage = { items: Ticket[]; total: number } | undefined;

/**
 * `data` e `state` saem em funções próprias porque cada `??` conta como decisão — o hook
 * passava do teto de complexidade sem ter nenhuma decisão de verdade dentro.
 */
function buildData(input: {
  departmentOptions: DepartmentChoice[];
  assigneeOptions: TicketAssigneeFilterOption[];
  projectOptions: TicketProjectFilterOption[];
  area: AreaContext;
  view: TicketQueueView;
  page: TicketPage;
  currentPage: number;
  dashboard: TicketDashboard | null;
  filter: TicketListFilter;
  drillBanner: BoardDrillBanner | null;
}): TicketListModel['data'] {
  const total = input.page?.total ?? 0;

  return {
    area: input.area,
    tickets: input.page?.items ?? [],
    total,
    dashboard: input.dashboard,
    filter: input.filter,
    /* O quadro não pagina: sem `paging`, a tela não desenha a barra de páginas e avisa quando
       veio menos do que casou. */
    paging:
      input.view === 'kanban'
        ? undefined
        : { page: input.currentPage, pageSize: TICKETS_PAGE_SIZE, total },
    departmentOptions: input.departmentOptions,
    assigneeOptions: input.assigneeOptions,
    projectOptions: input.projectOptions,
    drillBanner: input.drillBanner,
    view: input.view,
  };
}

type ListQueryLike = {
  isPending: boolean;
  isSuccess: boolean;
  isRefetching: boolean;
  error: unknown;
  data: TicketPage;
};

function hasAnyFilter(filter: TicketListFilter): boolean {
  if (filter.search.trim() !== '') return true;

  return (
    filter.status !== '' ||
    filter.statusGroup !== '' ||
    filter.priority !== '' ||
    filter.department !== '' ||
    filter.problemType !== '' ||
    filter.assigneeId !== '' ||
    filter.projectId !== ''
  );
}

function buildListState(
  list: ListQueryLike,
  filter: TicketListFilter,
  hasDrill = false,
): Omit<TicketListModel['state'], 'isDashboardLoading' | 'exportingFormat' | 'exportError'> {
  const count = list.data?.items.length ?? 0;
  /* Vazio só é vazio DEPOIS que a consulta terminou. Mostrar "nenhum chamado" durante o
     carregamento faz a pessoa achar que os dados sumiram — e recarregar. */
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
