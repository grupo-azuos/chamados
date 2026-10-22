/**
 * A MANUTENÇÃO de um computador: o que foi feito nele, e quando ele precisa de novo.
 *
 * As duas regras daqui vêm do sistema antigo, e cada uma existe por um motivo concreto:
 *
 * - **A cada três meses** toda máquina do parque precisa passar por manutenção. Era a régua
 *   do coletor antigo, e ela pega justamente o que ninguém lembra de fazer: limpeza e pasta
 *   térmica, que só aparecem como problema quando a máquina já está desligando sozinha.
 * - **Corretiva zera o relógio junto com a preventiva.** Quem abriu a máquina para trocar uma
 *   peça fez a mesma limpeza; cobrar preventiva de novo na semana seguinte seria mandar o
 *   técnico refazer o que ele acabou de fazer.
 */

export const MAINTENANCE_TYPES = [
  'preventive',
  'corrective',
  'part_replacement',
  'reinstall',
  'cleaning',
  'other',
] as const;

export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number];

/** A chave é inglês (o usuário não vê); o rótulo é português (vê). */
export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  preventive: 'Preventiva',
  corrective: 'Corretiva',
  part_replacement: 'Troca de peça',
  reinstall: 'Formatação/Reinstalação',
  cleaning: 'Limpeza',
  other: 'Outro',
};

export function maintenanceTypeLabel(type: MaintenanceType): string {
  return MAINTENANCE_TYPE_LABELS[type];
}

export type MaintenanceTypeTone = 'neutral' | 'info' | 'success' | 'warning' | 'brand';

/**
 * O tom de cada tipo.
 *
 * Corretiva é âmbar porque ela conta uma história: alguém teve problema. Preventiva é verde
 * porque é o trabalho que evita o problema. O resto é neutro — não há bom nem ruim em trocar
 * uma peça.
 */
const TYPE_TONES: Record<MaintenanceType, MaintenanceTypeTone> = {
  preventive: 'success',
  corrective: 'warning',
  part_replacement: 'info',
  reinstall: 'info',
  cleaning: 'neutral',
  other: 'neutral',
};

export function maintenanceTypeTone(type: MaintenanceType): MaintenanceTypeTone {
  return TYPE_TONES[type];
}

/**
 * Os tipos que valem como manutenção preventiva cumprida.
 *
 * Trocar uma peça ou formatar NÃO conta: são serviços pontuais, que podem acontecer sem
 * ninguém abrir a máquina para limpar. Contá-los faria o sistema anunciar em dia uma máquina
 * que não é aberta há um ano.
 */
export function resetsPreventiveClock(type: MaintenanceType): boolean {
  return type === 'preventive' || type === 'corrective';
}

/** Toda máquina do parque precisa de manutenção nesta cadência — a régua do sistema antigo. */
export const PREVENTIVE_INTERVAL_MONTHS = 3;

export const PREVENTIVE_STATUSES = ['ok', 'due', 'never'] as const;


export type PreventiveStatus = (typeof PREVENTIVE_STATUSES)[number];

export const PREVENTIVE_STATUS_LABELS: Record<PreventiveStatus, string> = {
  ok: 'Em dia',
  due: 'Vencida',
  never: 'Nunca feita',
};

export function preventiveStatusLabel(status: PreventiveStatus): string {
  return PREVENTIVE_STATUS_LABELS[status];
}

export function preventiveStatusTone(status: PreventiveStatus): 'success' | 'danger' | 'warning' {
  if (status === 'ok') return 'success';
  if (status === 'due') return 'danger';

  return 'warning';
}

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * O instante a partir do qual a última preventiva já está VENCIDA: feita nele ou antes, a
 * máquina precisa de manutenção. É a mesma régua do `preventiveStatusOf` (meses de 30,44 dias),
 * escrita como data para o banco filtrar sem trazer o parque inteiro.
 */
export function preventiveDueBefore(now: number = Date.now()): Date {
  /* `ceil`: a conta dá fração de milissegundo, e a data a corta — sem arredondar para cima, o
     corte caía um milissegundo depois e a máquina no limite ficava "em dia" no filtro e
     "vencida" no selo. */
  return new Date(now - Math.ceil(PREVENTIVE_INTERVAL_MONTHS * 30.44 * MILLISECONDS_PER_DAY));
}

/** Quantos meses inteiros se passaram desde uma data. Meio mês não conta como mês. */
export function monthsSince(iso: string, now: number = Date.now()): number | null {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return null;
  /* Data no futuro é zero mês, nunca negativa: manutenção agendada para amanhã não pode
     deixar a máquina "menos vencida" do que uma feita hoje. */
  if (at > now) return 0;

  const days = (now - at) / MILLISECONDS_PER_DAY;

  /* 30,44 é a média de dias do mês do calendário. Contar mês por número do mês faria "31 de
     janeiro" e "1º de fevereiro" ficarem a um mês de distância. */
  return Math.floor(days / 30.44);
}

/**
 * Se a máquina está em dia, vencida, ou nunca passou por manutenção.
 *
 * "Nunca feita" é diferente de "vencida" de propósito: a primeira é uma máquina que entrou no
 * parque e ninguém tocou, e a segunda é uma que tem histórico e passou do prazo. As duas
 * pedem a mesma ação, mas a primeira também diz que o cadastro pode ser novo — e ninguém
 * precisa correr atrás de uma máquina cadastrada ontem.
 */
export function preventiveStatusOf(
  lastDoneAt: string | null | undefined,
  now: number = Date.now(),
): PreventiveStatus {
  if (!lastDoneAt) return 'never';

  const months = monthsSince(lastDoneAt, now);
  if (months === null) return 'never';

  return months >= PREVENTIVE_INTERVAL_MONTHS ? 'due' : 'ok';
}

/**
 * A última vez que a máquina foi aberta, tirada do histórico dela. Só preventiva e corretiva
 * contam — a mesma regra do servidor (`resetsPreventiveClock`).
 */
export function lastPreventiveAtOf(
  history: readonly { type: MaintenanceType; performedAt: string }[],
): string | null {
  let last: string | null = null;
  for (const entry of history) {
    if (!resetsPreventiveClock(entry.type)) continue;
    if (last === null || Date.parse(entry.performedAt) > Date.parse(last)) last = entry.performedAt;
  }

  return last;
}

/**
 * O dia em que a próxima preventiva vence, ou nulo quando não há data de partida.
 *
 * Usa o mesmo mês médio de `monthsSince`: se a conta fosse outra, a tela diria "falta 1
 * dia" para uma máquina que o quadro de preventivas já mostra como vencida.
 */
export function nextPreventiveAt(lastDoneAt: string | null | undefined): string | null {
  if (!lastDoneAt) return null;

  const at = Date.parse(lastDoneAt);
  if (Number.isNaN(at)) return null;

  return new Date(at + PREVENTIVE_INTERVAL_MONTHS * 30.44 * MILLISECONDS_PER_DAY).toISOString();
}

/**
 * Quantos dias faltam para a próxima preventiva. Negativo é atraso: -5 quer dizer "venceu há
 * cinco dias". Nulo quando nunca houve manutenção — aí não há prazo, há pendência.
 */
export function daysUntilPreventive(
  lastDoneAt: string | null | undefined,
  now: number = Date.now(),
): number | null {
  const next = nextPreventiveAt(lastDoneAt);
  if (!next) return null;

  /* Arredonda para cima: com 10 horas sobrando, ainda "falta 1 dia", não "vence hoje". */
  return Math.ceil((Date.parse(next) - now) / MILLISECONDS_PER_DAY);
}

/** A frase do prazo, igual em toda tela: "faltam 12 dias", "vence hoje", "venceu há 3 dias". */
export function preventiveCountdownLabel(days: number): string {
  if (days === 0) return 'vence hoje';
  if (days === 1) return 'falta 1 dia';
  if (days > 1) return `faltam ${days} dias`;
  if (days === -1) return 'venceu há 1 dia';

  return `venceu há ${-days} dias`;
}

/**
 * A partir de quantas manutenções uma máquina passa a ser candidata a troca.
 *
 * Três é o número do sistema antigo, e ele não é arbitrário: é a terceira vez que alguém
 * para o trabalho de uma pessoa para consertar o mesmo equipamento.
 */
export const FREQUENT_MAINTENANCE_COUNT = 3;

export function isFrequentlyServiced(count: number): boolean {
  return count >= FREQUENT_MAINTENANCE_COUNT;
}

/** O dia de hoje no relógio LOCAL, como `AAAA-MM-DD` — o formato do campo de data. */
export function localDayOf(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Quantos dias faltam até um DIA agendado (`AAAA-MM-DD`). Zero é hoje; negativo é atraso.
 * Nulo quando o texto não é uma data.
 *
 * A conta é por dia de calendário, à meia-noite local dos dois lados: agendada para amanhã
 * "falta 1 dia" às 8h e às 23h, e não vira "vence hoje" no meio da tarde.
 */
export function daysUntilDay(day: string, now: Date = new Date()): number | null {
  const target = Date.parse(`${day}T00:00:00`);
  if (Number.isNaN(target)) return null;

  const today = Date.parse(`${localDayOf(now)}T00:00:00`);

  /* `round` e não `floor`: no dia em que o horário de verão muda, a diferença é 23 ou 25 horas. */
  return Math.round((target - today) / MILLISECONDS_PER_DAY);
}

/** A frase do agendamento, igual em toda tela: "faltam 5 dias", "é hoje", "atrasada há 2 dias". */
export function scheduleCountdownLabel(days: number): string {
  if (days === 0) return 'é hoje';
  if (days === 1) return 'falta 1 dia';
  if (days > 1) return `faltam ${days} dias`;
  if (days === -1) return 'atrasada há 1 dia';

  return `atrasada há ${-days} dias`;
}

/** O tom do agendamento: vermelho atrasado, âmbar hoje ou amanhã, azul com folga. */
export function scheduleTone(days: number): 'danger' | 'warning' | 'info' {
  if (days < 0) return 'danger';
  if (days <= 1) return 'warning';

  return 'info';
}
