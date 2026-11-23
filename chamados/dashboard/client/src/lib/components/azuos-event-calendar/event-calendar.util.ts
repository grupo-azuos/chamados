/**
 * A LÓGICA DO CALENDÁRIO DO GRUPO — datas, períodos e a arrumação dos eventos, sem tela.
 *
 * O desenho veio da big-calendar (MIT, github.com/lramos33/big-calendar), o mesmo do
 * `AzuosEventCalendar` do Paralegal; o código é nosso. Dia é texto `aaaa-mm-dd` em tudo o que entra
 * e sai: data de calendário não tem fuso. Por dentro, a conta é com `Date` LOCAL ao meio-dia, que é
 * o que a pessoa vê — ler em UTC trocaria o dia à noite. Sem biblioteca de data: `Date` e `Intl`
 * bastam para o que o calendário faz.
 */
export const CALENDAR_VIEWS = ['month', 'week', 'day', 'list', 'year'] as const;

export type AzuosCalendarView = (typeof CALENDAR_VIEWS)[number];

export const VIEW_LABELS: Record<AzuosCalendarView, string> = {
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
  list: 'Lista',
  year: 'Ano',
};

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

/** `aaaa-mm-dd` → o dia, ao meio-dia local (meio-dia nunca escorrega de dia no horário de verão). */
export function toDate(day: string): Date {
  const match = DAY_PATTERN.exec(day);
  if (!match) return todayDate();
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  if (Number.isNaN(date.getTime())) return todayDate();

  return date;
}

export function toDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`;
}

export function todayDate(): Date {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
}

export function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount, 12);
}

/** Soma meses sem pular: 31 de janeiro + 1 mês é 28 (ou 29) de fevereiro, não 3 de março. */
export function addMonths(date: Date, amount: number): Date {
  const first = new Date(date.getFullYear(), date.getMonth() + amount, 1, 12);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0, 12).getDate();

  return new Date(first.getFullYear(), first.getMonth(), Math.min(date.getDate(), last), 12);
}

/** A semana começa no domingo, como na folhinha da parede. */
function startOfWeek(date: Date): Date {
  return addDays(date, -date.getDay());
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 12);
}

function daysBetween(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  for (let day = from; toDay(day) <= toDay(to); day = addDays(day, 1)) days.push(day);

  return days;
}

/** O que cada visão mostra, com as duas pontas dentro. O mês inclui as sobras das semanas. */
export function visibleRangeOf(
  view: AzuosCalendarView,
  anchor: Date,
): { from: string; to: string } {
  const [from, to] = boundsOf(view, anchor);

  return { from: toDay(from), to: toDay(to) };
}

function boundsOf(view: AzuosCalendarView, anchor: Date): [Date, Date] {
  if (view === 'month')
    return [startOfWeek(startOfMonth(anchor)), addDays(startOfWeek(endOfMonth(anchor)), 6)];
  if (view === 'week') return [startOfWeek(anchor), addDays(startOfWeek(anchor), 6)];
  if (view === 'day') return [anchor, anchor];
  if (view === 'year') {
    return [new Date(anchor.getFullYear(), 0, 1, 12), new Date(anchor.getFullYear(), 11, 31, 12)];
  }

  return [startOfMonth(anchor), endOfMonth(anchor)];
}

/** Anterior e próximo: um passo do tamanho da visão. */
export function shiftAnchor(view: AzuosCalendarView, anchor: Date, step: 1 | -1): Date {
  if (view === 'week') return addDays(anchor, 7 * step);
  if (view === 'day') return addDays(anchor, step);
  if (view === 'year') return addMonths(anchor, 12 * step);

  return addMonths(anchor, step);
}

const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

const WEEKDAY_NAMES = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
] as const;

/** "dom", "seg"… — o cabeçalho das colunas. */
const WEEKDAY_LABELS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;

function shortMonth(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]!.slice(0, 3)}.`;
}

/** O título da barra: "novembro de 2026", "9 – 15 de nov. de 2026", "2026". */
export function titleOf(view: AzuosCalendarView, anchor: Date): string {
  if (view === 'year') return String(anchor.getFullYear());
  if (view === 'day') return `${longDayLabel(anchor)} de ${anchor.getFullYear()}`;
  if (view === 'week') return weekTitle(anchor);

  return `${monthLabel(anchor)} de ${anchor.getFullYear()}`;
}

function weekTitle(anchor: Date): string {
  const from = startOfWeek(anchor);
  const to = addDays(from, 6);
  const end = `${to.getDate()} de ${shortMonth(to)} de ${to.getFullYear()}`;
  if (from.getMonth() === to.getMonth()) return `${from.getDate()} – ${end}`;

  return `${from.getDate()} de ${shortMonth(from)} – ${end}`;
}

/** As semanas do mês, cada uma com os sete dias — as sobras dos meses vizinhos inclusas. */
export function monthWeeks(anchor: Date): Date[][] {
  const [from, to] = boundsOf('month', anchor);
  const days = daysBetween(from, to);

  return Array.from({ length: days.length / 7 }, (_, week) => days.slice(week * 7, week * 7 + 7));
}

export function weekDays(anchor: Date): Date[] {
  const from = startOfWeek(anchor);

  return daysBetween(from, addDays(from, 6));
}

/** Os doze meses do ano da âncora — o primeiro dia de cada um. */
export function yearMonths(anchor: Date): Date[] {
  return Array.from({ length: 12 }, (_, month) => new Date(anchor.getFullYear(), month, 1, 12));
}

export function weekdayLabel(date: Date): string {
  return WEEKDAY_LABELS[date.getDay()]!;
}

/** "D", "S", "T"… — a letra do dia, no mês miúdo da visão de ano. */
export function weekdayInitial(date: Date): string {
  return WEEKDAY_NAMES[date.getDay()]!.charAt(0).toUpperCase();
}

export function monthLabel(date: Date): string {
  return MONTH_NAMES[date.getMonth()]!;
}

/** "segunda-feira, 9 de novembro" — o grupo de um dia na lista. */
export function longDayLabel(date: Date): string {
  return `${WEEKDAY_NAMES[date.getDay()]}, ${date.getDate()} de ${monthLabel(date)}`;
}

export function isSameMonthOf(date: Date, anchor: Date): boolean {
  return date.getFullYear() === anchor.getFullYear() && date.getMonth() === anchor.getMonth();
}

/**
 * O EVENTO JÁ LIDO — o dia, e o minuto do começo e do fim quando há hora. Sem hora, é de dia
 * inteiro. Sem fim, meia hora.
 */
export type CalendarEntry<TEvent> = {
  event: TEvent;
  day: string;
  startMinute: number | null;
  endMinute: number;
};

const DEFAULT_DURATION = 30;

export function toEntry<TEvent extends { start: string; end?: string }>(
  event: TEvent,
): CalendarEntry<TEvent> {
  const startMinute = minuteOf(event.start);
  const endMinute = event.end ? minuteOf(event.end) : null;
  const start = startMinute ?? 0;

  return {
    event,
    day: event.start.slice(0, 10),
    startMinute,
    endMinute: Math.max(start + 15, endMinute ?? start + DEFAULT_DURATION),
  };
}

/** `aaaa-mm-ddThh:mm` → minutos desde a meia-noite; sem hora, `null`. */
export function minuteOf(value: string): number | null {
  const match = /T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;

  return Number(match[1]) * 60 + Number(match[2]);
}

/** "09:00" — o minuto escrito como hora. */
export function clockOf(minute: number): string {
  const hours = String(Math.floor(minute / 60)).padStart(2, '0');

  return `${hours}:${String(minute % 60).padStart(2, '0')}`;
}

/** Os eventos de um dia, os de dia inteiro primeiro e os demais pela hora. */
export function entriesOn<TEvent>(
  entries: readonly CalendarEntry<TEvent>[],
  day: string,
): CalendarEntry<TEvent>[] {
  return entries
    .filter((entry) => entry.day === day)
    .sort((a, b) => (a.startMinute ?? -1) - (b.startMinute ?? -1));
}

const WORKDAY = { from: 6, to: 22 };

/**
 * As horas da grade de semana e de dia: o expediente (6h às 22h), alargado quando há evento fora
 * dele — esconder o evento das 23h seria pior.
 */
export function visibleHours(entries: readonly CalendarEntry<unknown>[]): number[] {
  const timed = entries.filter((entry) => entry.startMinute !== null);
  const first = Math.min(
    WORKDAY.from,
    ...timed.map((entry) => Math.floor(entry.startMinute! / 60)),
  );
  const last = Math.max(WORKDAY.to, ...timed.map((entry) => Math.ceil(entry.endMinute / 60)));

  return Array.from({ length: Math.min(last, 24) - first }, (_, index) => first + index);
}

/** Onde cada evento de hora cai na coluna do dia — em fração da grade. */
export type PlacedEntry<TEvent> = CalendarEntry<TEvent> & {
  top: number;
  height: number;
  left: number;
  width: number;
};

export function placeTimed<TEvent>(
  entries: readonly CalendarEntry<TEvent>[],
  hours: readonly number[],
): PlacedEntry<TEvent>[] {
  const gridStart = (hours[0] ?? 0) * 60;
  const gridSize = hours.length * 60;
  const timed = entries
    .filter((entry) => entry.startMinute !== null)
    .sort((a, b) => a.startMinute! - b.startMinute!);
  const lanes = laneOf(timed);

  return timed.map((entry, index) => {
    const { lane, laneCount } = lanes[index]!;

    return {
      ...entry,
      top: (entry.startMinute! - gridStart) / gridSize,
      height: (entry.endMinute - entry.startMinute!) / gridSize,
      left: lane / laneCount,
      width: 1 / laneCount,
    };
  });
}

/** A faixa de cada evento dentro do grupo de eventos que se cruzam. */
function laneOf(timed: readonly CalendarEntry<unknown>[]): { lane: number; laneCount: number }[] {
  const result: { lane: number; laneCount: number }[] = [];
  let cluster: number[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;

  const closeCluster = () => {
    for (const index of cluster) result[index]!.laneCount = laneEnds.length;
    cluster = [];
    laneEnds = [];
  };

  timed.forEach((entry, index) => {
    if (entry.startMinute! >= clusterEnd) closeCluster();
    const free = laneEnds.findIndex((end) => end <= entry.startMinute!);
    const lane = free === -1 ? laneEnds.length : free;
    laneEnds[lane] = entry.endMinute;
    clusterEnd = Math.max(clusterEnd, entry.endMinute);
    cluster.push(index);
    result[index] = { lane, laneCount: 1 };
  });
  closeCluster();

  return result;
}

/** Fora da janela, não se navega: os botões de anterior e próximo travam. */
export function canShift(
  view: AzuosCalendarView,
  anchor: Date,
  step: 1 | -1,
  validRange: { from: string; to: string } | undefined,
): boolean {
  if (!validRange) return true;
  /* O mês conta pelos dias DELE, não pelas sobras das semanas. */
  const next = visibleRangeOf(view === 'month' ? 'list' : view, shiftAnchor(view, anchor, step));
  if (step === 1) return next.from <= validRange.to;

  return next.to >= validRange.from;
}

/** O dia está dentro da janela? Sem janela, sempre. */
export function isInside(
  day: string,
  validRange: { from: string; to: string } | undefined,
): boolean {
  if (!validRange) return true;

  return day >= validRange.from && day <= validRange.to;
}

/** Os dias do mês da âncora que têm alguma coisa — evento ou feriado —, em ordem. */
export function listDays(
  anchor: Date,
  entries: readonly CalendarEntry<unknown>[],
  holidays: ReadonlyMap<string, string[]>,
): string[] {
  const { from, to } = visibleRangeOf('list', anchor);
  const days = new Set<string>([...entries.map((entry) => entry.day), ...holidays.keys()]);

  return [...days].filter((day) => day >= from && day <= to).sort();
}

/** Os feriados por dia — os da lista e os eventos `kind: 'holiday'`, que é o mesmo dado. */
export function holidaysByDay(
  holidays: readonly { date: string; name: string }[],
  events: readonly { title: string; start: string; kind?: string }[],
): Map<string, string[]> {
  const fromEvents = events
    .filter((event) => event.kind === 'holiday')
    .map((event) => ({ date: event.start.slice(0, 10), name: event.title }));
  const byDay = new Map<string, string[]>();
  for (const holiday of [...holidays, ...fromEvents]) {
    const names = byDay.get(holiday.date) ?? [];
    if (!names.includes(holiday.name)) names.push(holiday.name);
    byDay.set(holiday.date, names);
  }

  return byDay;
}
