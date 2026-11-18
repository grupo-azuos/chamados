/**
 * Datas de CALENDÁRIO — nascimento, admissão, vencimento — no formato "AAAA-MM-DD".
 *
 * Elas não têm hora nem fuso, e é por isso que não viram `Date` com hora: 15/03 guardado como
 * meia-noite de Brasília vira 14/03 às 21h em UTC, e o aniversário muda de dia conforme quem
 * olha. Toda conta aqui é feita em UTC, só com ano, mês e dia.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * "2026-02-31" NÃO é uma data: `new Date` a transformaria em 03/03 sem reclamar. Data inválida
 * é recusada, nunca trocada por uma data inventada.
 */
export function parseIsoDate(value: string | null | undefined): Date | null {
  const match = ISO_DATE.exec(value ?? '');
  if (!match) return null;

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year) return null;
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;

  return date;
}

export function isValidIsoDate(value: string | null | undefined): boolean {
  return parseIsoDate(value) !== null;
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDaysIso(value: string | null | undefined, days: number): string {
  const date = parseIsoDate(value);
  if (!date) return '';

  date.setUTCDate(date.getUTCDate() + days);

  return toIsoDate(date);
}

/**
 * Soma meses sem estourar o mês: 31/01 + 1 mês cai em 28/02, e não em 03/03 — que é o que o
 * `setUTCMonth` sozinho faria.
 */
export function addMonthsUtc(date: Date, months: number): void {
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
}

/** "AAAA-MM-DD" mais N meses, sem estourar o fim do mês: 31/01 + 1 mês é 28/02. */
export function addMonthsIso(value: string | null | undefined, months: number): string {
  const date = parseIsoDate(value);
  if (!date) return '';

  addMonthsUtc(date, months);

  return toIsoDate(date);
}

/** "Hoje" como data de calendário de quem está usando — e não o dia em UTC. */
export function todayIso(now: Date = new Date()): string {
  return toIsoDate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

/**
 * Diferença em dias de calendário: hoje = 0, amanhã = 1, ontem = -1.
 *
 * Comparar só as datas tira a influência da hora atual. O sistema antigo media até as 23:59
 * do dia alvo e arredondava para cima, e algo que vencia hoje aparecia como "vence em 1 dia".
 */
export function daysBetween(fromIso: string, toIso: string): number | null {
  const from = parseIsoDate(fromIso);
  const to = parseIsoDate(toIso);
  if (!from || !to) return null;

  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}
