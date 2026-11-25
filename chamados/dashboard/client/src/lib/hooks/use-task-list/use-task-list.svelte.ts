import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { type RoleContext } from '@template/shared/domain/role-context.util';
import {
  addDays,
  brasiliaClock,
  type TaskOrigin,
  type TaskStatus,
} from '@template/shared/domain/task-flow.util';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import { type Task, type TaskListQuery, type TaskPage } from '@template/shared/schemas/task.schema';
import { derived, writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { tasksApi } from '$lib/api/tasks.api';
import { ticketsApi } from '$lib/api/tickets.api';
import { type AzuosPersonPickerPerson } from '$lib/components/azuos-person-picker-field/azuos-person-picker-field.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import {
  type GanttWindow,
  ganttWindowOf,
  shiftGanttWindow,
  type TimelineZoom,
} from '$lib/utils/task-gantt.util';

/**
 * O MODEL DA TELA DE TAREFAS: os modos de ver, os filtros, a página, o mês do calendário e as
 * ações que não precisam de formulário (finalizar, reabrir, marcar etapa, apagar).
 *
 * Lista e cards são paginados; quadro, calendário e timeline trazem tudo o que cabe no recorte
 * (até `MAX_PAGE_SIZE`) — quadro e mapa sem paginação, calendário e timeline pelo período à vista.
 */
export const TASK_VIEWS = ['list', 'cards', 'board', 'calendar', 'timeline', 'map'] as const;
export type TaskView = (typeof TASK_VIEWS)[number];

export const TASK_VIEW_LABELS: Record<TaskView, string> = {
  list: 'Lista',
  cards: 'Cards',
  board: 'Quadro',
  calendar: 'Calendário',
  timeline: 'Timeline',
  map: 'Mapa',
};

export const TASKS_PAGE_SIZE = 15;
export const TASKS_QUERY_KEY = ['tasks'] as const;

export type TaskListFilter = {
  search: string;
  /** Uma situação fixa (`open`) ou uma própria (`stage:4`); vazio é todas. */
  status: TaskStatus | `stage:${number}` | '';
  origin: TaskOrigin | '';
  ownerId: string;
  mine: boolean;
  overdue: boolean;
  /** Em uso (`hide`) ou arquivadas (`only`), como no Paralegal. */
  archived: 'hide' | 'only';
};

const EMPTY_FILTER: TaskListFilter = {
  search: '',
  status: '',
  origin: '',
  ownerId: '',
  mine: false,
  overdue: false,
  archived: 'hide',
};

export type TaskListModel = {
  data: {
    area: RoleContext;
    view: TaskView;
    tasks: Task[];
    total: number;
    alerts: TaskPage['alerts'];
    filter: TaskListFilter;
    activeFilterCount: number;
    page: number;
    pageSize: number;
    /** O mês em que o calendário abre: `aaaa-mm`. */
    month: string;
    /** Os dias à vista na timeline e o zoom dela. */
    window: GanttWindow;
    zoom: TimelineZoom;
    people: AzuosPersonPickerPerson[];
    selected: Task | null;
    removing: Task | null;
  };
  state: {
    isLoading: boolean;
    isEmpty: boolean;
    isFilteredOut: boolean;
    isTruncated: boolean;
    isMutating: boolean;
    error: string | null;
    actionError: string | null;
  };
  actions: {
    onViewChange: (view: TaskView) => void;
    onSearchChange: (search: string) => void;
    onFilterChange: <K extends keyof TaskListFilter>(key: K, value: TaskListFilter[K]) => void;
    onClearFilters: () => void;
    onPageChange: (page: number) => void;
    onMonthChange: (month: string) => void;
    /** O calendário mudou o período à mostra (mês, semana, dia, lista ou ano): busca esse período. */
    onRangeChange: (range: TaskRange) => void;
    onShiftWindow: (weeks: number) => void;
    onWindowToday: () => void;
    onZoom: (zoom: TimelineZoom) => void;
    onOpen: (task: Task) => void;
    onClose: () => void;
    onMove: (task: Task, status: 'done' | 'reopened') => void;
    /** Põe a tarefa numa situação própria, ou (`null`) a devolve à coluna fixa. */
    onStage: (task: Task, stageId: number | null) => void;
    onToggleStep: (task: Task, stepId: number, done: boolean) => void;
    onRemoveLink: (task: Task, linkId: number) => void;
    onAskRemove: (task: Task) => void;
    onCancelRemove: () => void;
    onConfirmRemove: () => void;
    /** Devolve a tarefa arquivada a "Em uso". */
    onRestore: (task: Task) => void;
    onRetry: () => void;
  };
};

/** O período à mostra no calendário: `from` e `to` em `aaaa-mm-dd`, e o dia de referência. */
export type TaskRange = { from: string; to: string; anchor: string };

const VIEW_STORAGE_KEY = 'azuos:tasks:view';

function storedView(area: RoleContext): TaskView {
  try {
    const value = localStorage.getItem(`${VIEW_STORAGE_KEY}:${area}`);
    return TASK_VIEWS.includes(value as TaskView) ? (value as TaskView) : 'list';
  } catch {
    return 'list';
  }
}

function storeView(area: RoleContext, view: TaskView): void {
  try {
    localStorage.setItem(`${VIEW_STORAGE_KEY}:${area}`, view);
  } catch {
    /* Sem armazenamento (aba anônima): o modo vale só enquanto a aba está aberta. */
  }
}

/** O primeiro e o último dia do mês `aaaa-mm`. */
export function monthRange(month: string): { from: string; to: string } {
  const from = `${month}-01`;
  const next = addDays(`${month}-28`, 4).slice(0, 7);

  return { from, to: addDays(`${next}-01`, -1) };
}

export function shiftMonth(month: string, delta: number): string {
  const [year, value] = month.split('-').map(Number) as [number, number];
  const index = year * 12 + (value - 1) + delta;

  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

/** Os filtros da tela no formato da API: vazio não vai. */
function filterParams(filter: TaskListFilter): Partial<TaskListQuery> {
  return {
    search: filter.search.trim() || undefined,
    ...situationParams(filter.status),
    origin: filter.origin || undefined,
    ownerId: filter.ownerId || undefined,
    mine: filter.mine || undefined,
    overdue: filter.overdue || undefined,
    archived: filter.archived,
  };
}

/** A situação do filtro vira o parâmetro certo: a fixa vai em `status`, a própria em `stageId`. */
export function situationParams(value: TaskListFilter['status']): {
  status?: TaskStatus;
  stageId?: number;
} {
  if (!value) return {};
  if (value.startsWith('stage:')) return { stageId: Number(value.slice('stage:'.length)) };

  return { status: value as TaskStatus };
}

function queryOf(
  area: RoleContext,
  view: TaskView,
  filter: TaskListFilter,
  page: number,
  month: string,
  range: TaskRange | null = null,
  window: GanttWindow | null = null,
): Partial<TaskListQuery> & Pick<TaskListQuery, 'area'> {
  const paged = view === 'list' || view === 'cards';
  const ranged = view === 'calendar' || view === 'timeline';

  return {
    area,
    ...filterParams(filter),
    page: paged ? page : 1,
    pageSize: paged ? TASKS_PAGE_SIZE : MAX_PAGE_SIZE,
    ...(ranged ? rangeOf(view, month, range, window) : {}),
  };
}

/** O calendário busca o período que mostra (a semana, o ano); a timeline, o mês. */
function rangeOf(
  view: TaskView,
  month: string,
  range: TaskRange | null,
  window: GanttWindow | null,
): { from: string; to: string } {
  if (view === 'calendar' && range) return { from: range.from, to: range.to };
  if (view === 'timeline' && window) return window;

  return monthRange(month);
}

function countActive(filter: TaskListFilter): number {
  return [filter.status, filter.origin, filter.ownerId, filter.mine, filter.overdue].filter(Boolean)
    .length;
}

export function useTaskListModel(area: RoleContext): TaskListModel {
  const queryClient = useQueryClient();

  const viewStore = writable<TaskView>(storedView(area));
  const view = mirrorStore(viewStore);
  const filterStore = writable<TaskListFilter>({ ...EMPTY_FILTER });
  const filter = mirrorStore(filterStore);
  const pageStore = writable<number>(1);
  const page = mirrorStore(pageStore);
  const monthStore = writable<string>(brasiliaClock().day.slice(0, 7));
  const month = mirrorStore(monthStore);
  const rangeStore = writable<TaskRange | null>(null);
  const zoomStore = writable<TimelineZoom>('month');
  const zoom = mirrorStore(zoomStore);
  const windowStore = writable<GanttWindow>(ganttWindowOf(brasiliaClock().day, 'month'));
  const window = mirrorStore(windowStore);

  let selectedId = $state<number | null>(null);
  let removing = $state<Task | null>(null);
  let actionError = $state<string | null>(null);

  const list = mirrorStore(
    createQuery(
      derived(
        [viewStore, filterStore, pageStore, monthStore, rangeStore, windowStore],
        ([v, f, p, m, r, w]) => {
          const query = queryOf(area, v, f, p, m, r, w);
          return {
            queryKey: [...TASKS_QUERY_KEY, 'list', query],
            queryFn: () => tasksApi.list(query),
            placeholderData: (previous: TaskPage | undefined) => previous,
          };
        },
      ),
    ),
  );

  const people = mirrorStore(
    createQuery(
      writable({
        queryKey: ['tickets', 'people-options'],
        queryFn: () => ticketsApi.peopleOptions(),
        staleTime: 5 * 60_000,
      }),
    ),
  );

  const refresh = () => queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
  const onDone = {
    onSuccess: () => {
      actionError = null;
      void refresh();
    },
    onError: (error: unknown) => {
      actionError = readError(error);
    },
  };

  const move = mirrorStore(
    createMutation({
      mutationFn: (input: { id: number; status: 'done' | 'reopened' }) =>
        tasksApi.setStatus(input.id, { status: input.status }),
      ...onDone,
    }),
  );
  const stage = mirrorStore(
    createMutation({
      mutationFn: (input: { id: number; stageId: number | null }) =>
        tasksApi.setStage(input.id, input.stageId),
      ...onDone,
    }),
  );
  const toggleStep = mirrorStore(
    createMutation({
      mutationFn: (input: { id: number; stepId: number; done: boolean }) =>
        tasksApi.setStepDone(input.id, input.stepId, input.done),
      ...onDone,
    }),
  );
  const unlink = mirrorStore(
    createMutation({
      mutationFn: (input: { id: number; linkId: number }) =>
        tasksApi.removeLink(input.id, input.linkId),
      ...onDone,
    }),
  );
  const restore = mirrorStore(
    createMutation({ mutationFn: (id: number) => tasksApi.restore(id), ...onDone }),
  );
  const remove = mirrorStore(
    createMutation({
      mutationFn: (id: number) => tasksApi.remove(id),
      onSuccess: () => {
        actionError = null;
        removing = null;
        selectedId = null;
        void refresh();
      },
      onError: (error: unknown) => {
        actionError = readError(error);
      },
    }),
  );

  const tasks = $derived(list.current.data?.items ?? []);
  const isFiltered = $derived(
    countActive(filter.current) > 0 || filter.current.search.trim() !== '',
  );

  function setFilter(next: TaskListFilter): void {
    filterStore.set(next);
    pageStore.set(1);
  }

  return {
    data: {
      area,
      get view() {
        return view.current;
      },
      get tasks() {
        return tasks;
      },
      get total() {
        return list.current.data?.total ?? 0;
      },
      get alerts() {
        return list.current.data?.alerts ?? { overdue: 0, dueSoon: 0 };
      },
      get filter() {
        return filter.current;
      },
      get activeFilterCount() {
        return countActive(filter.current);
      },
      get page() {
        return page.current;
      },
      pageSize: TASKS_PAGE_SIZE,
      get month() {
        return month.current;
      },
      get window() {
        return window.current;
      },
      get zoom() {
        return zoom.current;
      },
      get people() {
        return (people.current.data ?? []).map((person) => ({
          id: person.id,
          name: person.name,
          photo: person.avatarUrl ?? null,
        }));
      },
      get selected() {
        return tasks.find((task) => task.id === selectedId) ?? null;
      },
      get removing() {
        return removing;
      },
    },
    state: {
      get isLoading() {
        return list.current.isPending;
      },
      get isEmpty() {
        return !list.current.isPending && tasks.length === 0 && !isFiltered;
      },
      get isFilteredOut() {
        return !list.current.isPending && tasks.length === 0 && isFiltered;
      },
      get isTruncated() {
        const paged = view.current === 'list' || view.current === 'cards';
        return !paged && (list.current.data?.total ?? 0) > tasks.length;
      },
      get isMutating() {
        return (
          move.current.isPending ||
          stage.current.isPending ||
          toggleStep.current.isPending ||
          remove.current.isPending ||
          unlink.current.isPending
        );
      },
      get error() {
        return list.current.error ? readError(list.current.error) : null;
      },
      get actionError() {
        return actionError;
      },
    },
    actions: {
      onViewChange: (next) => {
        viewStore.set(next);
        storeView(area, next);
        pageStore.set(1);
      },
      onSearchChange: (search) => setFilter({ ...filter.current, search }),
      onFilterChange: (key, value) => setFilter({ ...filter.current, [key]: value }),
      onClearFilters: () => setFilter({ ...EMPTY_FILTER, search: filter.current.search }),
      onPageChange: (next) => pageStore.set(next),
      onMonthChange: (next) => monthStore.set(next),
      onShiftWindow: (weeks) => windowStore.set(shiftGanttWindow(window.current, weeks)),
      onWindowToday: () => windowStore.set(ganttWindowOf(brasiliaClock().day, zoom.current)),
      onZoom: (next) => {
        zoomStore.set(next);
        windowStore.set(ganttWindowOf(brasiliaClock().day, next));
      },
      onRangeChange: (next) => {
        rangeStore.set(next);
        /* O mês acompanha o calendário: trocar para a timeline continua no mesmo mês. */
        monthStore.set(next.anchor.slice(0, 7));
      },
      onOpen: (task) => {
        selectedId = task.id;
      },
      onClose: () => {
        selectedId = null;
      },
      onMove: (task, status) => move.current.mutate({ id: task.id, status }),
      onStage: (task, stageId) => stage.current.mutate({ id: task.id, stageId }),
      onToggleStep: (task, stepId, done) =>
        toggleStep.current.mutate({ id: task.id, stepId, done }),
      onRemoveLink: (task, linkId) => unlink.current.mutate({ id: task.id, linkId }),
      onAskRemove: (task) => {
        removing = task;
      },
      onCancelRemove: () => {
        removing = null;
      },
      onConfirmRemove: () => {
        if (removing) remove.current.mutate(removing.id);
      },
      onRestore: (task) => restore.current.mutate(task.id),
      onRetry: () => void list.current.refetch(),
    },
  };
}
