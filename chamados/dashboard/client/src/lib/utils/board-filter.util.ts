import {
  TICKET_PRIORITIES,
  TICKET_STATUS_LABELS,
  TICKET_STATUSES,
  ticketPriorityLabel,
} from '@template/shared/domain/ticket-status.util';
import {
  type BoardFieldFilterKind,
  type BoardFilter,
  type BoardFilterDisplay,
  boardFilterDisplay,
  boardFilterDisplaysOf,
  type BoardFilterKind,
  type BoardFilterPlace,
  type BoardFilterValues,
  MAX_WINDOW_DAYS,
  ME_VALUE,
  type WidgetWindow,
  windowLabel,
  windowRange,
} from '@template/shared/schemas/dashboard-board.schema';

/**
 * AS REGRAS DOS FILTROS DO PAINEL — as opções de cada filtro, os períodos prontos, o resumo do
 * que está valendo e a ordem de leitura da grade. Funções puras: a barra só desenha.
 */
export type FilterCountsLike = {
  total: number;
  series: { key: string; label: string; value: number; avatarUrl?: string | null }[];
};

export type BoardFilterOption = { value: string; label: string; personName?: string; avatarUrl?: string | null };

/** Até aqui, um seletor; daqui para cima, a lista ganha busca (regra dos 15 itens). */
export const SEARCH_FROM = 15;

const relative = (direction: 'next' | 'last', count: number, unit: 'day' | 'week' | 'month'): WidgetWindow => ({
  mode: 'relative',
  direction,
  count,
  unit,
});

/** Os períodos prontos — o que mais se pergunta, sem abrir calendário. */
export const PERIOD_PRESETS: { value: string; label: string; window: WidgetWindow | null }[] = [
  { value: 'each', label: 'O de cada bloco', window: null },
  { value: 'last-7-day', label: 'Últimos 7 dias', window: relative('last', 7, 'day') },
  { value: 'last-30-day', label: 'Últimos 30 dias', window: relative('last', 30, 'day') },
  { value: 'last-90-day', label: 'Últimos 90 dias', window: relative('last', 90, 'day') },
  { value: 'last-1-month', label: 'Este mês', window: relative('last', 1, 'month') },
  { value: 'next-30-day', label: 'Próximos 30 dias', window: relative('next', 30, 'day') },
  { value: 'custom', label: 'Datas exatas', window: null },
];

/** Qual opção pronta é a janela escolhida — `custom` para datas exatas. */
export function presetOf(window: WidgetWindow | null): string {
  if (!window) return 'each';
  if (window.mode === 'custom') return 'custom';

  return `${window.direction}-${window.count}-${window.unit}`;
}

/** A janela de uma opção pronta. "Datas exatas" nasce nos últimos 30 dias, para ajustar. */
export function windowOfPreset(value: string, today: string): WidgetWindow | null {
  if (value === 'custom') return { mode: 'custom', ...windowRange(relative('last', 30, 'day'), today) };

  return PERIOD_PRESETS.find((preset) => preset.value === value)?.window ?? null;
}

/**
 * Datas exatas nunca passam de 90 dias: a data final escolhida longe demais é puxada para o
 * 90º dia — melhor que recusar sem dizer o que fazer.
 */
export function clampRange(from: string, to: string): { from: string; to: string } {
  const [start, end] = from <= to ? [from, to] : [to, from];
  const limit = new Date(`${start}T00:00:00.000Z`);
  limit.setUTCDate(limit.getUTCDate() + MAX_WINDOW_DAYS - 1);
  const last = limit.toISOString().slice(0, 10);

  return { from: start, to: end > last ? last : end };
}

/** As opções de um filtro de campo: as fixas do contrato, ou as que a conta do módulo trouxe. */
export function fieldFilterOptions(kind: BoardFieldFilterKind, counts: FilterCountsLike | null | undefined): BoardFilterOption[] {
  if (kind === 'ticketStatus') return TICKET_STATUSES.map((status) => ({ value: status, label: TICKET_STATUS_LABELS[status] }));
  if (kind === 'ticketPriority') return TICKET_PRIORITIES.map((priority) => ({ value: priority, label: ticketPriorityLabel(priority) }));

  return countedOptions(counts);
}

/** As pessoas do módulo, cada uma com o rosto (sem foto, o avatar cai nas iniciais). */
export function personOptions(counts: FilterCountsLike | null | undefined): BoardFilterOption[] {
  const photos = new Map((counts?.series ?? []).map((item) => [item.key, item.avatarUrl ?? null]));

  return countedOptions(counts).map((option) => ({
    ...option,
    personName: option.label,
    avatarUrl: photos.get(option.value) ?? null,
  }));
}

/**
 * A foto de cada pessoa na conta do filtro "Pessoa". A conta agrupa pelo NOME do responsável (é o
 * que o bloco mostra); a foto vem da lista de responsáveis do módulo, achada pelo mesmo nome.
 * Quem não está na lista fica com as iniciais.
 */
export function withPersonPhotos<T extends FilterCountsLike>(
  filters: readonly Pick<BoardFilter, 'id' | 'kind'>[],
  counts: Record<string, T>,
  people: readonly { name: string; avatarUrl?: string | null }[],
): Record<string, T> {
  const photos = new Map(people.map((person) => [person.name, person.avatarUrl ?? null]));
  const next = { ...counts };
  for (const filter of filters) {
    const count = next[filter.id];
    if (filter.kind !== 'person' || !count) continue;
    next[filter.id] = { ...count, series: count.series.map((item) => ({ ...item, avatarUrl: photos.get(item.key) ?? null })) };
  }

  return next;
}

/**
 * O filtro "Departamento" com TODOS os departamentos da lista (os do RH e os daqui), e não só os
 * que já têm chamado: quem filtra procura o departamento pelo nome oficial, mesmo que ainda esteja
 * em zero. Os nomes que só a conta trouxe (um antigo, gravado num chamado de antes) continuam, no
 * fim. A lista ou a conta ainda não chegaram (ou falharam): fica o que há.
 */
export function withDepartmentCatalog<T extends FilterCountsLike>(
  filters: readonly Pick<BoardFilter, 'id' | 'kind'>[],
  counts: Record<string, T>,
  names: readonly string[],
): Record<string, T> {
  if (names.length === 0) return counts;
  const next = { ...counts };
  for (const filter of filters) {
    if (filter.kind !== 'department') continue;
    const count = next[filter.id];
    if (!count) continue;
    const counted = new Map(count.series.map((item) => [item.key, item]));
    const listed = names.map((name) => counted.get(name) ?? { key: name, label: name, value: 0 });
    const extra = count.series.filter((item) => !names.includes(item.key));
    next[filter.id] = { ...count, series: [...listed, ...extra] };
  }

  return next;
}

/** O que a conta trouxe, sem os grupos de "sem valor" (`(Sem responsável)`). */
function countedOptions(counts: FilterCountsLike | null | undefined): BoardFilterOption[] {
  return (counts?.series ?? [])
    .filter((item) => !item.key.startsWith('('))
    .map((item) => ({ value: item.key, label: item.label }));
}

/** Os filtros com valor escolhido, com o valor escrito como a pessoa o leu na tela. */
export function activeSummary(
  filters: readonly BoardFilter[],
  values: BoardFilterValues,
  counts: Record<string, FilterCountsLike>,
): { label: string; value: string }[] {
  return filters.flatMap((filter) => {
    const value = valueLabel(filter, values, counts[filter.id]);

    return value ? [{ label: filter.label, value }] : [];
  });
}

function valueLabel(filter: BoardFilter, values: BoardFilterValues, counts: FilterCountsLike | undefined): string | null {
  const kind: BoardFilterKind = filter.kind;
  if (kind === 'period') return values.period ? windowLabel(values.period) : null;
  const value = values[kind];
  if (!value) return null;
  if (kind === 'person') return value === ME_VALUE ? 'Eu' : (personOptions(counts).find((option) => option.value === value)?.label ?? value);

  return fieldFilterOptions(kind, counts).find((option) => option.value === value)?.label ?? value;
}

/** De cima para baixo e da esquerda para a direita: a ordem em que a coluna única empilha. */
export function readingOrder<T extends { place: BoardFilterPlace }>(filters: readonly T[]): T[] {
  return [...filters].sort((one, other) => one.place.y - other.place.y || one.place.x - other.place.x);
}

/**
 * OS DESENHOS DA BARRA DE FILTROS — no estilo do Grafana, cada filtro é UMA peça compacta numa
 * linha só, acima dos blocos: a lista suspensa, a busca, ou as etiquetas à vista (para poucas
 * opções). Os desenhos grandes (cards, lista aberta, fotos) ocupavam uma casa inteira da grade e
 * empurravam o painel para baixo; um painel gravado com eles cai no desenho compacto mais perto.
 */
export const TOOLBAR_DISPLAYS: readonly BoardFilterDisplay[] = ['select', 'search', 'chips'];

/** Os desenhos que quem monta pode escolher para o filtro, na barra. */
export function toolbarDisplaysOf(kind: BoardFilterKind): BoardFilterDisplay[] {
  return boardFilterDisplaysOf(kind).filter((display) => TOOLBAR_DISPLAYS.includes(display));
}

/** O desenho do filtro na barra: o escolhido, se for compacto; senão, a lista com busca (pessoa) ou a suspensa. */
export function toolbarDisplayOf(filter: Pick<BoardFilter, 'kind' | 'display'>): BoardFilterDisplay {
  const display = boardFilterDisplay(filter);
  if (toolbarDisplaysOf(filter.kind).includes(display)) return display;

  return filter.kind === 'person' ? 'search' : 'select';
}

/**
 * A ORDEM da barra gravada no lugar de cada filtro: a barra lê da esquerda para a direita, e a
 * grade guarda a ordem de leitura (linha, depois coluna). Cada filtro numa casa 1×1, em sequência.
 */
export function placesInOrder(ids: readonly string[], columns: number): { id: string; place: BoardFilterPlace }[] {
  return ids.map((id, index) => ({
    id,
    place: { x: index % columns, y: Math.floor(index / columns), w: 1, h: 1 },
  }));
}

/** A lista com o item `from` levado para a posição `to` — o arrastar e as setas da ordem. */
export function moveInList<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return [...items];
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved as T);

  return next;
}
