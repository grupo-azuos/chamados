import { addDaysIso, addMonthsUtc, parseIsoDate, toIsoDate } from './calendar-date.util';

/**
 * A GRADE DE DIAS e o ANDAR PELO TECLADO do `AzuosDatePickerField`.
 *
 * Tudo entra e sai como texto ("AAAA-MM" para o mês, "AAAA-MM-DD" para o dia) e toda conta é
 * feita em UTC, pelo mesmo motivo do `calendar-date.util` do `shared`: data de calendário não
 * tem hora nem fuso, e converter para `Date` e de volta a cada comparação é onde o fuso entra e
 * muda o dia.
 *
 * Mês ou dia inválido devolve vazio, nunca um valor inventado: quem chama decide o que fazer.
 */

const ISO_MONTH = /^(\d{4})-(\d{2})$/;
const ISO_DAY = /^(\d{4})-(\d{2})-\d{2}$/;

/** Quantas células a grade tem: 6 semanas de 7 dias, fixo. */
const GRID_LENGTH = 42;
const WEEK = 7;

/** O mês ("AAAA-MM") a que um dia pertence. */
export function monthOfIso(value: string | null | undefined): string {
  const match = ISO_DAY.exec(value ?? '');
  if (!match) return '';

  return `${match[1]}-${match[2]}`;
}

/**
 * Anda `amount` meses: `shiftMonthIso('2026-01', -1)` dá `'2025-12'`. Sem estouro de mês,
 * porque o dia é sempre 1º.
 */
export function shiftMonthIso(monthIso: string, amount: number): string {
  const match = ISO_MONTH.exec(monthIso);
  if (!match) return '';

  const shifted = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1 + amount, 1));

  return shifted.toISOString().slice(0, 7);
}

/**
 * Os 42 dias da grade, do domingo da primeira semana ao sábado da última.
 *
 * Seis semanas SEMPRE, mesmo quando o mês cabe em cinco: grade que muda de altura faz o
 * calendário pular de tamanho ao trocar de mês, e o botão que a pessoa ia clicar sai do lugar.
 */
export function monthGridIso(monthIso: string): string[] {
  const match = ISO_MONTH.exec(monthIso);
  if (!match) return [];

  const firstOfMonth = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  const gridStart = new Date(firstOfMonth);
  gridStart.setUTCDate(gridStart.getUTCDate() - firstOfMonth.getUTCDay());

  return Array.from({ length: GRID_LENGTH }, (_, index) => {
    const day = new Date(gridStart);
    day.setUTCDate(gridStart.getUTCDate() + index);

    return toIsoDate(day);
  });
}

/** O dia pertence ao mês visível? É o que separa o dia cheio do dia apagado na grade. */
export function isInMonth(dayIso: string, monthIso: string): boolean {
  if (!ISO_MONTH.test(monthIso)) return false;

  return monthOfIso(dayIso) === monthIso;
}

/** O dia da semana (0 = domingo), lido em UTC. Dia inválido conta como domingo. */
export function weekdayOf(dayIso: string): number {
  return parseIsoDate(dayIso)?.getUTCDay() ?? 0;
}

/**
 * Anda meses mantendo o dia: 31/03 menos um mês é 28/02, e não 03/03.
 *
 * O dia é limitado ao último do mês de destino em vez de rolar para o mês seguinte — rolar
 * faria o PageUp no dia 31 parecer que não fez nada, voltando para o mesmo mês.
 */
export function shiftDayByMonthsIso(dayIso: string, months: number): string {
  const date = parseIsoDate(dayIso);
  if (!date) return '';

  addMonthsUtc(date, months);

  return toIsoDate(date);
}

/**
 * Para onde cada tecla leva na grade — vazio quando a tecla não é da grade e deve seguir o
 * caminho normal dela (Tab, Enter, Esc).
 *
 * A grade inteira tem UMA parada de Tab, e são estas teclas que andam dentro dela: é o
 * `tabindex` rotativo do padrão de grade da WAI-ARIA. Com os 42 dias na fila do Tab,
 * atravessar um mês custava 42 toques, e quem opera sem mouse desistia.
 */
export function nextDayForKey(key: string, dayIso: string): string {
  const step = DAY_STEP[key];
  if (step) return addDaysIso(dayIso, step);

  if (key === 'Home') return addDaysIso(dayIso, -weekdayOf(dayIso));
  if (key === 'End') return addDaysIso(dayIso, WEEK - 1 - weekdayOf(dayIso));
  if (key === 'PageUp') return shiftDayByMonthsIso(dayIso, -1);
  if (key === 'PageDown') return shiftDayByMonthsIso(dayIso, 1);

  return '';
}

const DAY_STEP: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -WEEK,
  ArrowDown: WEEK,
};

/**
 * Onde o Tab entra na grade: o dia escolhido; sem escolha, hoje; e se hoje não está no mês
 * desenhado, o dia 1º.
 *
 * Nunca "nenhum": a grade sem célula alcançável fica inacessível pelo teclado, e é o que
 * acontece quando se folheia para um mês distante com o campo vazio.
 */
export function firstFocusableIso(input: {
  days: string[];
  selectedIso: string;
  todayIso: string;
  monthIso: string;
}): string {
  if (input.days.includes(input.selectedIso)) return input.selectedIso;
  if (input.days.includes(input.todayIso)) return input.todayIso;

  return `${input.monthIso}-01`;
}

const ISO_YEAR = /^(\d{4})$/;

/** O ano de um mês ("2026-10" → "2026"). Mês inválido devolve vazio. */
export function yearOfMonth(monthIso: string): string {
  const match = ISO_MONTH.exec(monthIso);
  if (!match) return '';

  return match[1] ?? '';
}

/** Anda `amount` anos: `shiftYear('2026', -1)` dá `'2025'`. */
export function shiftYear(year: string, amount: number): string {
  if (!ISO_YEAR.test(year)) return '';

  return String(Number(year) + amount);
}

/**
 * Os doze meses de um ano, como "AAAA-MM" — a grade do seletor de mês.
 *
 * Doze SEMPRE, mesmo que o ano já tenha passado: o filtro serve para olhar para trás tanto
 * quanto para a frente, e esconder meses passados tiraria metade do uso.
 */
export function monthsOfYear(year: string): string[] {
  if (!ISO_YEAR.test(year)) return [];

  return Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`);
}
