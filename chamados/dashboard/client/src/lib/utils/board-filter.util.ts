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

type PersonLike = { name: string; avatarUrl?: string | null };

/**
 * AS PESSOAS DOS FILTROS, com o rosto. A conta agrupa pelo NOME (é o que o bloco mostra), e a foto
 * vem do diretório de pessoas, achada pelo mesmo nome; quem não tem foto fica com as iniciais.
 *
 * "Responsável" lista a EQUIPE do módulo inteira, e não só quem já tem chamado: quem filtra procura
 * a pessoa do time mesmo que ela esteja em zero. "Quem abriu" lista só quem abriu chamado — é o
 * que existe para recortar —, também com o rosto.
 */
export function withPeople<T extends FilterCountsLike>(
  filters: readonly Pick<BoardFilter, 'id' | 'kind'>[],
  counts: Record<string, T>,
  people: { team: readonly PersonLike[]; directory: readonly PersonLike[] },
  empty: T,
): Record<string, T> {
  const photos = new Map([...people.directory, ...people.team].map((person) => [person.name, person.avatarUrl ?? null]));
  const photoOf = (name: string) => photos.get(name) ?? null;
  const next = { ...counts };
  for (const filter of filters) {
    if (filter.kind !== 'person' && filter.kind !== 'requester') continue;
    const count = next[filter.id] ?? empty;
    const counted = count.series.map((item) => ({ ...item, avatarUrl: photoOf(item.key) }));
    const known = new Set(count.series.map((item) => item.key));
    const team = filter.kind === 'person' ? people.team.filter((person) => !known.has(person.name)) : [];
    const idle = team.map((person) => ({ key: person.name, label: person.name, value: 0, avatarUrl: photoOf(person.name) }));
    next[filter.id] = { ...count, series: [...counted, ...idle] };
  }

  return next;
}

/**
 * O filtro "Departamento" com TODOS os departamentos da lista (os do RH e os daqui), e não só os
 * que já têm chamado: quem filtra procura o departamento pelo nome oficial, mesmo que ainda esteja
 * em zero — e num módulo ainda sem chamado nenhum. Os nomes que só a conta trouxe (um antigo,
 * gravado num chamado de antes) continuam, no fim. A lista ainda não chegou: fica o que há.
 */
export function withDepartmentCatalog<T extends FilterCountsLike>(
  filters: readonly Pick<BoardFilter, 'id' | 'kind'>[],
  counts: Record<string, T>,
  names: readonly string[],
  empty: T,
): Record<string, T> {
  if (names.length === 0) return counts;
  const next = { ...counts };
  for (const filter of filters) {
    if (filter.kind !== 'department') continue;
    const count = next[filter.id] ?? empty;
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

/** Quantos há em cada opção, pela conta do filtro; "Todos" (valor vazio) é o total. */
export function optionCounts(counts: FilterCountsLike | null | undefined): Map<string, number> {
  const byKey = new Map((counts?.series ?? []).map((item) => [item.key, item.value]));
  byKey.set('', counts?.total ?? 0);

  return byKey;
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
 * linha só, acima dos blocos: a lista suspensa ou a busca — e os CARDS, num carrossel da largura
 * da barra, cada opção com quantos há nela. As etiquetas, a lista aberta e as fotos saíram (as
 * etiquetas rolavam de lado dentro da peça e cortavam as opções); um painel gravado com elas cai
 * na lista suspensa, ou na busca para pessoa.
 */
export const TOOLBAR_DISPLAYS: readonly BoardFilterDisplay[] = ['select', 'search', 'cards'];

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
