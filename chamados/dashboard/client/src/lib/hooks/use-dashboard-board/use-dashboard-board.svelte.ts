import { goto } from '$app/navigation';
import { page } from '$app/state';
import {
  createMutation,
  createQuery,
  type QueryClient,
  useQueryClient,
} from '@tanstack/svelte-query';
import {
  type Board,
  type BoardFilter,
  type BoardFilterDisplay,
  type BoardFilterKind,
  type BoardFilterValues,
  type BoardFilterWidth,
  boardFilterKindsOf,
  type BoardModule,
  boardWeight,
  type DashboardScope,
  dashboardScopeSchema,
  EMPTY_BOARD_FILTER_VALUES,
  type LayoutItem,
  MAX_BOARD_WEIGHT,
  type Widget,
  type WidgetData,
  type WidgetKind,
  widgetQueryOf,
} from '@template/shared/schemas/dashboard-board.schema';
import { derived, writable } from 'svelte/store';

import { dashboardBoardsApi } from '$lib/api/dashboard-boards.api';
import { ticketsApi } from '$lib/api/tickets.api';
import { readError } from '$lib/api/http-client';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { useDepartmentOptionsModel } from '$lib/hooks/use-department-options/use-department-options.svelte';
import { persistedFilterStore } from '$lib/hooks/use-persisted-filters/use-persisted-filters.svelte';
import {
  activeValues,
  addBoardFilter,
  type BoardDraft,
  type BoardFilterPlaceChange,
  compactIdsOf,
  filterCountQuery,
  normalizeLayout,
  removeBoardFilter,
  removeWidget,
  saveErrorOf,
  setBoardFilterDisplay,
  setBoardFilterWidth,
  setBoardFilterPlaces,
  upsertWidget,
  visibleScopes,
} from '$lib/utils/board-draft.util';
import { withDepartmentCatalog, withPeople } from '$lib/utils/board-filter.util';
import { drillHref, drillOf } from '$lib/utils/board-drill.util';
import { newWidget } from '$lib/utils/widget-editor.util';
import { type BoardItem } from '$lib/utils/widget-items.util';

/**
 * O PAINEL MONTADO DE UM MÓDULO — Equipe, Gestor e Pessoal. Zero marcação.
 *
 * Ver: os números de cada bloco vêm do servidor e se renovam sozinhos a cada 5 minutos (e no
 * "Atualizar"). Editar: a pessoa arrasta, redimensiona, troca o gráfico e a fonte num RASCUNHO, e
 * só o "Salvar" grava — desistir no meio não deixa painel pela metade.
 *
 * Cada módulo é um painel à parte: a chave de tudo leva o módulo, e o bloco só usa fontes dele.
 */
export type WidgetState = { data: WidgetData | null; isLoading: boolean; error: string | null };

export type FilterCounts = {
  total: number;
  /** `avatarUrl`: a foto da pessoa, só no filtro "Pessoa". */
  series: { key: string; label: string; value: number; avatarUrl?: string | null }[];
  isLoading: boolean;
};

export type BoardEditing = { widget: Widget; isNew: boolean; place?: Omit<LayoutItem, 'i'> };

/** De quanto em quanto os números se renovam sozinhos. */
export const REFRESH_MS = 5 * 60 * 1000;

export const BOARD_QUERY_KEY = ['dashboard-board'] as const;

const EMPTY_DRAFT: BoardDraft = { widgets: [], layout: [], filters: [] };

type Answers = Record<string, { data: WidgetData | null; error: string | null }>;

/* A conta de um filtro que ainda não tem nenhuma: o módulo sem chamado, ou a conta que falhou. */
const NO_COUNT: FilterCounts = { total: 0, series: [], isLoading: false };

export function useDashboardBoardModel(module: BoardModule) {
  const queryClient = useQueryClient();
  const scopes = visibleScopes(page.data.user, module);
  const allowed = scopes.map((option) => option.value);
  const defaultScope: DashboardScope = allowed.includes('manager') ? 'manager' : 'team';

  /* A aba em que o painel abre: a última que a pessoa escolheu NESTE módulo. Uma que ela não vê
     mais (perdeu o papel de gestor) volta ao padrão. */
  const scopeStore = persistedFilterStore<{ scope: DashboardScope }>({
    screen: `dashboard-${module}`,
    defaults: { scope: defaultScope },
    parse: (raw) => {
      const parsed = dashboardScopeSchema.safeParse((raw as { scope?: unknown } | null)?.scope);

      return parsed.success && allowed.includes(parsed.data) ? { scope: parsed.data } : null;
    },
  });
  const chosenScope = mirrorStore(scopeStore);

  let draft = $state<BoardDraft | null>(null);
  let editing = $state<BoardEditing | null>(null);
  let previewWidget = $state<Widget | null>(null);
  let chosen = $state<BoardFilterValues>(EMPTY_BOARD_FILTER_VALUES);

  const board = mirrorStore(
    createQuery(
      derived(scopeStore, ({ scope }) => ({
        queryKey: [...BOARD_QUERY_KEY, module, scope],
        queryFn: () => dashboardBoardsApi.board(module, scope),
      })),
    ),
  );

  const saved = $derived(board.current.data as Board | undefined);
  const shown = $derived<BoardDraft>(draft ?? contentOf(saved));
  const filterValues = $derived(activeValues(shown.filters, chosen));

  /* As perguntas vão para uma store: esta versão do svelte-query recebe as opções como store, e
     é ela que decide quando buscar de novo. */
  const asked = writable<{ widgets: Widget[]; values: BoardFilterValues }>({ widgets: [], values: EMPTY_BOARD_FILTER_VALUES });
  const previewAsked = writable<Widget | null>(null);
  $effect(() => {
    asked.set({ widgets: shown.widgets, values: filterValues });
  });
  $effect(() => {
    previewAsked.set(previewWidget ?? editing?.widget ?? null);
  });

  const results = mirrorStore(
    createQuery(
      derived(asked, (input) => ({
        queryKey: [...BOARD_QUERY_KEY, module, 'results', input.widgets.map((widget) => [widget.id, widgetQueryOf(widget, input.values)])],
        queryFn: () => answerAll(queryClient, module, input.widgets, input.values),
        enabled: input.widgets.length > 0,
        refetchInterval: REFRESH_MS,
        placeholderData: (previous: Answers | undefined) => previous,
      })),
    ),
  );

  const preview = mirrorStore(
    createQuery(
      derived([previewAsked, asked], ([widget, input]) => ({
        queryKey: [...BOARD_QUERY_KEY, module, 'preview', widget ? widgetQueryOf(widget, input.values) : null],
        queryFn: () => answerAll(queryClient, module, widget ? [widget] : [], input.values),
        enabled: widget !== null,
        placeholderData: (previous: Answers | undefined) => previous,
      })),
    ),
  );

  const counts = mirrorStore(
    createQuery(
      derived(asked, () => {
        const filters = shown.filters.filter((filter) => filterCountQuery(filter, module, filterValues));

        return {
          queryKey: [...BOARD_QUERY_KEY, module, 'filter-counts', filters.map((filter) => filterCountQuery(filter, module, filterValues))],
          queryFn: () => countAll(queryClient, module, filters, filterValues),
          enabled: filters.length > 0,
          refetchInterval: REFRESH_MS,
          placeholderData: (previous: Record<string, FilterCounts> | undefined) => previous,
        };
      }),
    ),
  );

  /* A equipe do módulo: o filtro "Responsável" lista todos, com o rosto, mesmo os em zero. */
  const team = mirrorStore(
    createQuery({
      queryKey: ['tickets', 'assignee-options', module],
      queryFn: () => ticketsApi.assigneeOptions(module),
      staleTime: 60_000,
    }),
  );

  /* Todas as pessoas, só pela FOTO de quem abriu chamado. Falhou, ficam as iniciais. */
  const directory = mirrorStore(
    createQuery({
      queryKey: ['tickets', 'people-options'],
      queryFn: () => ticketsApi.peopleOptions(),
      staleTime: 5 * 60_000,
    }),
  );

  /* A lista de departamentos (RH e os daqui), para o filtro mostrar também os que estão em zero. */
  const departments = useDepartmentOptionsModel();

  const save = mirrorStore(
    createMutation({
      mutationFn: (content: BoardDraft) => dashboardBoardsApi.saveBoard(module, chosenScope.current.scope, content),
      onSuccess: (next: Board) => {
        queryClient.setQueryData([...BOARD_QUERY_KEY, module, next.scope], next);
        draft = null;
      },
    }),
  );

  const edit = (change: (current: BoardDraft) => BoardDraft) => {
    draft = change(draft ?? shown);
  };

  function widgetStates(): Record<string, WidgetState> {
    const answers = results.current.data ?? {};

    return Object.fromEntries(
      shown.widgets.map((widget) => {
        const answer = answers[widget.id];

        return [
          widget.id,
          { data: answer?.data ?? null, isLoading: !answer && results.current.isFetching, error: answer?.error ?? null },
        ];
      }),
    );
  }

  function previewState(): WidgetState | null {
    const widget = previewWidget ?? editing?.widget;
    if (!widget) return null;
    const answer = preview.current.data?.[widget.id];

    return { data: answer?.data ?? null, isLoading: !answer && preview.current.isFetching, error: answer?.error ?? null };
  }

  return {
    get data() {
      return {
        module,
        scope: chosenScope.current.scope,
        scopes,
        widgets: shown.widgets,
        layout: shown.layout,
        results: widgetStates(),
        editing,
        preview: previewState(),
        updatedAt: saved?.updatedAt ?? null,
        boardFilters: shown.filters,
        boardFilterKinds: boardFilterKindsOf(module),
        filterValues,
        filterCounts: withDepartmentCatalog(
          shown.filters,
          withPeople(
            shown.filters,
            counts.current.data ?? {},
            { team: team.current.data ?? [], directory: directory.current.data ?? [] },
            NO_COUNT,
          ),
          departments.options.map((option) => option.value),
          NO_COUNT,
        ),
        weight: boardWeight(shown.widgets),
      };
    },
    get state() {
      return {
        isLoading: board.current.isPending,
        isEditing: draft !== null,
        isSaving: save.current.isPending,
        isRefreshing: board.current.isFetching || results.current.isFetching,
        canEdit: saved?.canEdit ?? false,
        /* Cabe mais um bloco enquanto sobra ao menos 1 ponto (o peso do mais leve) na cota. */
        canAdd: boardWeight(shown.widgets) < MAX_BOARD_WEIGHT,
        error: readError(board.current.error) ?? saveErrorOf(save.current.error, shown.widgets, shown.layout),
      };
    },
    actions: {
      onScopeChange: (next: string) => {
        if (!allowed.includes(next as DashboardScope)) return;
        draft = null;
        editing = null;
        scopeStore.update(() => ({ scope: next as DashboardScope }));
      },
      onRefresh: () => void queryClient.invalidateQueries({ queryKey: [...BOARD_QUERY_KEY, module] }),
      onStartEdit: () => {
        draft = shown;
      },
      onCancelEdit: () => {
        draft = null;
        editing = null;
        save.current.reset();
      },
      onSave: () => {
        if (draft) save.current.mutate(draft);
      },
      onLayoutChange: (layout: LayoutItem[]) =>
        edit((current) => ({ ...current, layout: normalizeLayout(layout, compactIdsOf(current.widgets)) })),
      onNewWidget: (kind?: WidgetKind, place?: Omit<LayoutItem, 'i'>) => {
        previewWidget = null;
        editing = { widget: newWidget(module, kind), isNew: true, place };
      },
      onEditWidget: (id: string) => {
        const widget = shown.widgets.find((item) => item.id === id);
        previewWidget = null;
        if (widget) editing = { widget, isNew: false };
      },
      onCloseEditor: () => {
        editing = null;
        previewWidget = null;
      },
      onSubmitWidget: (widget: Widget) => {
        const place = editing?.place;
        edit((current) => upsertWidget(current, widget, place));
        editing = null;
        previewWidget = null;
      },
      onRemoveWidget: (id: string) => edit((current) => removeWidget(current, id)),
      /* O clique num item de um bloco: a lista da fonte, com o recorte do bloco e do item. */
      onOpenItem: (widget: Widget, item: BoardItem) => {
        const href = drillHref(drillOf(widget, filterValues, item));
        if (href) void goto(href);
      },
      onPreviewChange: (widget: Widget) => {
        previewWidget = widget;
      },
      onFilterValueChange: (patch: Partial<BoardFilterValues>) => {
        chosen = { ...chosen, ...patch };
      },
      onClearFilterValues: () => {
        chosen = EMPTY_BOARD_FILTER_VALUES;
      },
      onAddBoardFilter: (kind: BoardFilterKind) => edit((current) => addBoardFilter(current, kind)),
      onRemoveBoardFilter: (id: string) => edit((current) => removeBoardFilter(current, id)),
      onBoardFilterDisplayChange: (id: string, display: BoardFilterDisplay) =>
        edit((current) => setBoardFilterDisplay(current, id, display)),
      onBoardFilterWidthChange: (id: string, width: BoardFilterWidth) =>
        edit((current) => setBoardFilterWidth(current, id, width)),
      /** Montando: os filtros foram arrastados ou redimensionados na grade deles. */
      onBoardFilterPlaceChange: (places: readonly BoardFilterPlaceChange[]) =>
        edit((current) => setBoardFilterPlaces(current, places)),
    },
  };
}

export type DashboardBoardModel = ReturnType<typeof useDashboardBoardModel>;

/** O que o painel gravado diz — ou o vazio, enquanto ele não chega. */
function contentOf(board: Board | undefined): BoardDraft {
  if (!board) return EMPTY_DRAFT;

  return { widgets: board.widgets, layout: board.layout, filters: board.filters };
}

/**
 * Os números de cada bloco — uma consulta por PERGUNTA, em cache: dois blocos com a mesma
 * pergunta usam a mesma resposta, e voltar a uma combinação já vista é instantâneo. Um bloco que
 * falha não derruba os outros: cada um leva o seu erro.
 */
async function answerAll(
  queryClient: QueryClient,
  module: BoardModule,
  widgets: readonly Widget[],
  values: BoardFilterValues,
): Promise<Answers> {
  const answers = await Promise.all(
    widgets.map(async (widget) => {
      const query = widgetQueryOf(widget, values);
      try {
        const data = await queryClient.fetchQuery({
          queryKey: [...BOARD_QUERY_KEY, module, 'data', query],
          queryFn: () => dashboardBoardsApi.data(module, query),
          staleTime: REFRESH_MS - 1000,
        });

        return [widget.id, { data, error: null }] as const;
      } catch (error) {
        return [widget.id, { data: null, error: readError(error) ?? 'Não consegui contar este bloco.' }] as const;
      }
    }),
  );

  return Object.fromEntries(answers);
}

/** A conta de cada opção dos filtros do painel (os cards, e a lista de pessoas e departamentos). */
async function countAll(
  queryClient: QueryClient,
  module: BoardModule,
  filters: readonly BoardFilter[],
  values: BoardFilterValues,
): Promise<Record<string, FilterCounts>> {
  const counted = await Promise.all(
    filters.map(async (filter) => {
      const query = filterCountQuery(filter, module, values)!;
      const data = await queryClient
        .fetchQuery({
          queryKey: [...BOARD_QUERY_KEY, module, 'data', query],
          queryFn: () => dashboardBoardsApi.data(module, query),
          staleTime: REFRESH_MS - 1000,
        })
        .catch(() => null);

      return [filter.id, { total: data?.total ?? 0, series: data?.series ?? [], isLoading: false }] as const;
    }),
  );

  return Object.fromEntries(counted);
}
