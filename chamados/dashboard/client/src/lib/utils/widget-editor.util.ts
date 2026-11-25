import {
  type BoardModule,
  CARD_WIDGETS,
  CATEGORY_WIDGETS,
  DATA_SOURCES,
  DAY_WIDGETS,
  DEFAULT_WINDOW,
  type DataDimension,
  type DataSourceKey,
  dimensionsOf,
  hasPersonField,
  isCategoryDimension,
  isTimeDimension,
  PAIR_WIDGETS,
  sourcesOf,
  type SavedFilter,
  TIME_WIDGETS,
  type Widget,
  type WidgetKind,
  type WidgetWindow,
  WINDOW_COUNTS,
  type WindowUnit,
  windowRange,
} from '@template/shared/schemas/dashboard-board.schema';

/**
 * AS ESCOLHAS DO EDITOR DE BLOCO — que agrupamentos cada gráfico aceita, e como o formulário se
 * acerta sozinho quando a pessoa troca o gráfico ou a fonte. Sem isto, trocar "Colunas" por
 * "Calendário" deixaria o bloco agrupado por status, e o servidor recusaria.
 */
export const NO_GROUP = '';
export const NO_FILTER = '';

type Option = { value: string; label: string };

/** Os gráficos que mostram um número só (sem agrupar). O destaque agrupa: os grupos viram cards. */
const SINGLE_VALUE: readonly WidgetKind[] = ['radial', 'ringCard'];

export function isPair(kind: WidgetKind): boolean {
  return PAIR_WIDGETS.includes(kind);
}

/**
 * Os blocos que mostram itens para clicar: os de categoria, os cards, os de par e os de um dia
 * por casa. A linha e o acumulado no tempo, o medidor e o card com anel não têm item.
 */
const ITEM_KINDS: readonly WidgetKind[] = [
  ...CATEGORY_WIDGETS,
  ...CARD_WIDGETS,
  ...PAIR_WIDGETS,
  ...DAY_WIDGETS,
];

export function hasItems(kind: WidgetKind): boolean {
  return ITEM_KINDS.includes(kind);
}

export function usesGroup(kind: WidgetKind): boolean {
  return !SINGLE_VALUE.includes(kind);
}

/**
 * Que agrupamentos cada gráfico aceita. Os de tempo que não são de um dia por casa (Linha e
 * Acumulado) aceitam dia, semana e mês — o mesmo que o contrato exige deles; os de categoria
 * aceitam também a faixa de idade, que se lê como categoria.
 */
export function dimensionFits(kind: WidgetKind, dimension: DataDimension): boolean {
  if (DAY_WIDGETS.includes(kind)) return dimension.kind === 'day';
  if (TIME_WIDGETS.includes(kind)) return isTimeDimension(dimension.kind);
  if (!usesGroup(kind)) return false;

  return isCategoryDimension(dimension.kind);
}

/** O bloco agrupa (ou divide) por uma faixa de idade — e por isso tem faixas para escolher. */
export function usesAgeBands(widget: Pick<Widget, 'source' | 'groupBy' | 'splitBy'>): boolean {
  const dimensions = dimensionsOf(widget.source) as Record<string, DataDimension>;

  return [widget.groupBy, widget.splitBy].some(
    (key) => key !== null && dimensions[key]?.kind === 'age',
  );
}

/** "2, 7, 15, 30" ⇄ [2, 7, 15, 30]. Texto que não dá número sai como `NaN`, e o contrato recusa. */
export function ageBandsText(bands: readonly number[]): string {
  return bands.join(', ');
}

export function parseAgeBands(text: string): number[] {
  return text
    .split(/[,;\s]+/)
    .filter(Boolean)
    .map(Number);
}

function categoryOptions(source: DataSourceKey, kind: WidgetKind): Option[] {
  const dimensions = dimensionsOf(source) as Record<string, DataDimension>;

  return Object.entries(dimensions)
    .filter(([, dimension]) => dimensionFits(kind, dimension))
    .map(([value, dimension]) => ({ value, label: dimension.label }));
}

export function groupOptions(widget: Widget): Option[] {
  const options = categoryOptions(widget.source, widget.kind);

  return CARD_WIDGETS.includes(widget.kind)
    ? [{ value: NO_GROUP, label: '(Sem agrupar: o total)' }, ...options]
    : options;
}

/** O "dividir por" dos blocos de par: as outras categorias da fonte. */
export function splitOptions(widget: Widget): Option[] {
  return categoryOptions(widget.source, widget.kind).filter(
    (option) => option.value !== widget.groupBy,
  );
}

/** Os filtros da mesma fonte, e o "sem filtro" na frente. */
export function filterOptions(filters: SavedFilter[], source: DataSourceKey): Option[] {
  const own = filters
    .filter((filter) => filter.source === source && !filter.archive)
    .map((filter) => ({
      value: filter.id,
      label: filter.scope === 'shared' ? `${filter.name} (compartilhado)` : filter.name,
    }));

  return [{ value: NO_FILTER, label: '(Sem filtro: tudo)' }, ...own];
}

/**
 * Depois de trocar o gráfico ou a fonte: o agrupamento que não serve mais vira o primeiro que
 * serve (ou nenhum, nos de número só), o "dividir por" fica só nos de par, e "só os meus" sai
 * da fonte que não tem responsável.
 */
export function fitGroup(input: Widget): Widget {
  const widget = fitAgenda(input);
  const onlyMine = widget.onlyMine && hasPersonField(widget.source);
  const window = widget.window;
  if (!usesGroup(widget.kind)) {
    return { ...widget, groupBy: null, splitBy: null, onlyMine, window };
  }
  const options = groupOptions(widget);
  const groupBy = options.some((option) => option.value === (widget.groupBy ?? NO_GROUP))
    ? widget.groupBy
    : options[0]?.value || null;

  return { ...widget, groupBy, splitBy: fitSplit({ ...widget, groupBy }), onlyMine, window };
}

/**
 * Só a agenda tem janela: ela nasce no mês de hoje, pra frente, e as outras ficam sem. Na agenda,
 * o "período" geral não vale (a janela já é o período), e a fonte sem dia (empresas) vira alvarás.
 */
function fitAgenda(widget: Widget): Widget {
  if (widget.kind !== 'agenda') return { ...widget, window: null };

  return {
    ...widget,
    source: sourceHasDays(widget.source) ? widget.source : firstSourceWithDays(widget.source),
    period: 'all',
    window: widget.window ?? DEFAULT_WINDOW,
  };
}

/** A primeira fonte do MESMO módulo que tem dia — a agenda nunca troca de módulo. */
function firstSourceWithDays(source: DataSourceKey): DataSourceKey {
  return sourcesOf(DATA_SOURCES[source].module).find(sourceHasDays) ?? source;
}

/** As fontes que a agenda aceita: as que têm um agrupamento por dia. */
export function sourceHasDays(source: DataSourceKey): boolean {
  return Object.values(dimensionsOf(source) as Record<string, DataDimension>).some(
    (dimension) => dimension.kind === 'day',
  );
}

/** O título que o bloco novo já traz — quem monta só ajusta (Lei de Tesler). */
export function suggestedTitle(kind: WidgetKind, noun: string, groupLabel: string | null): string {
  if (kind === 'hero') return 'Destaque';
  const subject = noun.charAt(0).toUpperCase() + noun.slice(1);

  return groupLabel ? `${subject} por ${groupLabel.toLowerCase()}` : subject;
}

/**
 * Um bloco NOVO no módulo: a primeira fonte dele, no tipo escolhido, já com o agrupamento que
 * serve e o título sugerido.
 */
export function newWidget(
  module: BoardModule,
  kind: WidgetKind = 'column',
  id = newWidgetId(),
): Widget {
  const source = sourcesOf(module)[0]!;
  const draft = fitGroup({
    id,
    kind,
    title: '',
    source,
    groupBy: null,
    splitBy: null,
    filterId: null,
    onlyMine: false,
    period: 'all',
    window: null,
  });

  return { ...draft, title: autoTitle(draft) };
}

/** Um id curto e único no painel. */
export function newWidgetId(): string {
  return `bloco-${Math.random().toString(36).slice(2, 10)}`;
}

/** O título que o bloco sugere pelo que ele mostra — "Chamados por situação". */
export function autoTitle(widget: Widget): string {
  const dimensions = dimensionsOf(widget.source) as Record<string, DataDimension>;
  const group = widget.groupBy ? (dimensions[widget.groupBy]?.label ?? null) : null;

  return suggestedTitle(widget.kind, DATA_SOURCES[widget.source].noun, group);
}

/**
 * Depois de uma mudança: o título que ainda era a sugestão (ou vazio) acompanha o bloco; o que a
 * pessoa escreveu fica como ela escreveu.
 */
export function followTitle(before: Widget, after: Widget): Widget {
  const wasAuto = before.title === '' || before.title === autoTitle(before);
  if (!wasAuto || after.title !== before.title) return after;

  return { ...after, title: autoTitle(after) };
}

function fitSplit(widget: Widget): string | null {
  if (!isPair(widget.kind)) return null;
  const options = splitOptions(widget);
  if (options.some((option) => option.value === widget.splitBy)) return widget.splitBy;

  return options[0]?.value ?? null;
}

/** Trocar o modo da janela guarda o que dá para guardar: datas exatas nascem na janela de agora. */
export function windowForMode(mode: string, current: WidgetWindow, today: string): WidgetWindow {
  if (mode === 'custom') {
    if (current.mode === 'custom') return current;

    return { mode: 'custom', ...windowRange(current, today) };
  }
  const direction = mode === 'last' ? 'last' : 'next';
  if (current.mode === 'relative') return { ...current, direction };

  return { mode: 'relative', unit: 'month', count: 1, direction };
}

/** Trocar a unidade mantém a quantidade se ela existe na nova; senão, a menor. */
export function withUnit(
  window: Extract<WidgetWindow, { mode: 'relative' }>,
  unit: WindowUnit,
): WidgetWindow {
  const counts = WINDOW_COUNTS[unit];
  const count = counts.includes(window.count) ? window.count : (counts[0] ?? 1);

  return { ...window, unit, count };
}

/**
 * A altura da pré-visualização. O card com anel é um card só: esticado na caixa dos gráficos ele
 * ficava gordo, com o anel solto no meio — aqui ele tem a altura de uma linha do painel.
 */
export function previewHeightClass(kind: WidgetKind, isWide: boolean): string {
  if (kind === 'ringCard') return 'h-36';

  return isWide ? 'h-[62vh]' : 'h-96';
}
