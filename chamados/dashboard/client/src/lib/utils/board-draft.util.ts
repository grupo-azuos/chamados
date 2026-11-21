import {
  type BoardFilter,
  boardFilterApplies,
  boardFilterCardSource,
  type BoardFilterDisplay,
  type BoardFilterKind,
  BOARD_FILTER_KIND_LABELS,
  type BoardFilterPlace,
  type BoardFilterValues,
  boardMatches,
  type BoardModule,
  COMPACT_WIDGET_KINDS,
  DASHBOARD_SCOPE_LABELS,
  type DashboardScope,
  EMPTY_BOARD_FILTER_VALUES,
  GRID_COLUMNS,
  type LayoutItem,
  type Widget,
  type WidgetQuery,
} from '@template/shared/schemas/dashboard-board.schema';
import { roleInContext, type SessionUser } from '@template/shared/schemas/user.schema';

import { ApiError, readError } from '$lib/api/http-client';
import { bottomPlace, compactLayout } from '$lib/utils/board-layout.util';

/**
 * O RASCUNHO DO PAINEL — o que muda enquanto a pessoa monta, antes do "Salvar". Funções puras:
 * o hook só guarda o rascunho e chama daqui, e cada regra tem o seu teste.
 */
export type BoardDraft = { widgets: Widget[]; layout: LayoutItem[]; filters: BoardFilter[] };

/** As abas que a pessoa vê no módulo: Gestor só para o gestor e o administrador do módulo. */
export function visibleScopes(
  user: Pick<SessionUser, 'role' | 'roles'> | null | undefined,
  module: BoardModule,
): { value: DashboardScope; label: string }[] {
  const level = roleInContext(user, module);
  const isManager = level === 'admin' || level === 'manager' || level === 'superadmin';
  const scopes: DashboardScope[] = isManager ? ['team', 'manager', 'personal'] : ['team', 'personal'];

  return scopes.map((value) => ({ value, label: DASHBOARD_SCOPE_LABELS[value] }));
}

/** Bloco novo entra onde foi solto (ou embaixo de tudo); o que já existe só troca o conteúdo. */
export function upsertWidget(
  current: BoardDraft,
  widget: Widget,
  place?: Omit<LayoutItem, 'i'>,
): BoardDraft {
  if (current.widgets.some((item) => item.id === widget.id)) {
    return { ...current, widgets: current.widgets.map((item) => (item.id === widget.id ? widget : item)) };
  }
  const spot = place ?? bottomPlace(current.layout, widget.kind);

  return {
    ...current,
    widgets: [...current.widgets, widget],
    layout: normalizeLayout([...current.layout, { i: widget.id, ...spot }], compactIdsOf([...current.widgets, widget])),
  };
}

/** Tira o bloco do rascunho — e o lugar dele; o resto sobe para não deixar buraco. */
export function removeWidget(current: BoardDraft, id: string): BoardDraft {
  return {
    ...current,
    widgets: current.widgets.filter((widget) => widget.id !== id),
    layout: compactLayout(current.layout.filter((item) => item.i !== id)),
  };
}

/** Os tipos que cabem numa casa só (1×1) vêm do contrato: a tela e o servidor contam igual. */
export function compactIdsOf(widgets: readonly Widget[]): ReadonlySet<string> {
  return new Set(widgets.filter((widget) => COMPACT_WIDGET_KINDS.includes(widget.kind)).map((widget) => widget.id));
}

/** Nenhum bloco passa da borda, e nenhum fica 1×1 — a não ser o compacto. */
export function normalizeLayout(layout: readonly LayoutItem[], compactIds: ReadonlySet<string> = new Set()): LayoutItem[] {
  return layout.map((item) => {
    const w = Math.min(Math.max(item.w, 1), GRID_COLUMNS);
    const x = Math.min(item.x, GRID_COLUMNS - w);
    const isTooSmall = w < 2 && item.h < 2 && !compactIds.has(item.i);

    return { i: item.i, x, y: item.y, w, h: isTooSmall ? 2 : item.h };
  });
}

/** Um filtro de cada tipo: pedir um que o painel já tem não muda nada. */
export function addBoardFilter(current: BoardDraft, kind: BoardFilterKind): BoardDraft {
  if (current.filters.some((filter) => filter.kind === kind)) return current;

  return { ...current, filters: [...current.filters, { id: kind, kind, label: BOARD_FILTER_KIND_LABELS[kind] }] };
}

export function removeBoardFilter(current: BoardDraft, id: string): BoardDraft {
  return { ...current, filters: current.filters.filter((filter) => filter.id !== id) };
}

/** Troca o desenho de um filtro (lista, etiquetas, cards); o resto do painel fica como está. */
export function setBoardFilterDisplay(current: BoardDraft, id: string, display: BoardFilterDisplay): BoardDraft {
  return {
    ...current,
    filters: current.filters.map((filter) => (filter.id === id ? { ...filter, display } : filter)),
  };
}

export type BoardFilterPlaceChange = { id: string; place: BoardFilterPlace };

/**
 * O lugar novo de cada filtro, como a grade devolveu. Só muda o lugar: o resto do filtro (nome,
 * desenho) fica como estava, e um id que o painel não tem é ignorado.
 */
export function setBoardFilterPlaces(current: BoardDraft, places: readonly BoardFilterPlaceChange[]): BoardDraft {
  const byId = new Map(places.map((change) => [change.id, change.place]));

  return {
    ...current,
    filters: current.filters.map((filter) => {
      const place = byId.get(filter.id);

      return place ? { ...filter, place } : filter;
    }),
  };
}

/** Só valem os valores dos filtros que o painel tem: tirar o filtro solta o recorte. */
export function activeValues(filters: readonly BoardFilter[], chosen: BoardFilterValues): BoardFilterValues {
  const kept = { ...EMPTY_BOARD_FILTER_VALUES };
  for (const { kind } of filters) Object.assign(kept, { [kind]: chosen[kind] });

  return kept;
}

/**
 * A CONTA DE CADA OPÇÃO de um filtro (os cards e a lista de pessoas e departamentos): os chamados
 * do módulo agrupados pelo campo do filtro, recortados pelos OUTROS filtros do painel.
 */
export function filterCountQuery(
  filter: Pick<BoardFilter, 'kind'>,
  module: BoardModule,
  values: BoardFilterValues,
): WidgetQuery | null {
  const card = boardFilterCardSource(filter.kind, module);
  if (!card) return null;
  const others = { ...values, [filter.kind]: null };

  return {
    source: card.source,
    groupBy: card.groupBy,
    splitBy: null,
    filterId: null,
    onlyMine: false,
    period: 'all',
    window: null,
    person: boardFilterApplies('person', card.source) ? others.person : null,
    boardPeriod: values.period,
    matches: boardMatches(others, card.source),
    ageBands: null,
  };
}

/**
 * A recusa do "Salvar", dita pelo NOME do bloco. O servidor aponta por posição (`widgets.2`),
 * que não diz nada a quem monta; aqui cada uma vira `"Chamados": o motivo`.
 */
export function saveErrorOf(error: unknown, widgets: readonly Widget[], layout: readonly LayoutItem[]): string | null {
  if (!error) return null;
  const details = error instanceof ApiError ? error.details : [];
  if (details.length === 0) return `Não salvei o painel: ${readError(error)}`;

  const titleAt = (path: string): string | null => {
    const [list, index] = path.split('.');
    const position = Number(index);
    if (list === 'widgets') return widgets[position]?.title ?? null;
    if (list !== 'layout') return null;
    const id = layout[position]?.i;

    return widgets.find((widget) => widget.id === id)?.title ?? null;
  };
  const reasons = details.map((detail) => {
    const title = titleAt(detail.field);

    return title ? `"${title}": ${detail.message}` : detail.message;
  });

  return `Não salvei o painel. ${[...new Set(reasons)].join('. ')}.`;
}
