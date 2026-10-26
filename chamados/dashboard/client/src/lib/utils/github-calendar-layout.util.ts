import type { SoftwareTimelineEvent } from '@template/shared/schemas/software-timeline.schema';
import type { SoftwareScheduleEvent } from '@template/shared/schemas/software-schedule.schema';

export const GITHUB_HOUR_CARD_HEIGHT = 52;

/**
 * Quanto o bloco de um registro ocupa na grade. O registro não tem duração — é um momento —,
 * mas precisa de altura para o título caber numa linha.
 */
export const RECORD_BLOCK_MINUTES = 30;

type ScheduleTimes = Pick<SoftwareScheduleEvent, 'startTime' | 'endTime'>;

function minutesOf(time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Início e fim do BLOCO na grade, em minutos do dia: o registro ganha a altura mínima. */
export function scheduleBlockMinutes(event: ScheduleTimes): { start: number; end: number } {
  const start = minutesOf(event.startTime);
  if (!event.endTime) return { start, end: start + RECORD_BLOCK_MINUTES };

  return { start, end: minutesOf(event.endTime) };
}

/** Se o item aparece na grade de horas (08:00 às 18:00). */
export function isOnScheduleGrid(event: ScheduleTimes): boolean {
  if (!event.endTime) return event.startTime >= '08:00' && event.startTime < '18:00';

  return event.startTime < '18:00' && event.endTime > '08:00';
}

/**
 * Se o item vai para a lista "fora do horário da grade". O compromisso que só encosta na
 * grade aparece nos dois lugares, para ninguém perder o pedaço que ficou de fora; o registro,
 * que é um ponto, aparece em um só.
 */
export function isOutsideScheduleGrid(event: ScheduleTimes): boolean {
  if (!event.endTime) return !isOnScheduleGrid(event);

  return event.startTime < '08:00' || event.endTime > '18:00';
}

export function overlapsGithubCard(event: ScheduleTimes, top: number): boolean {
  const block = scheduleBlockMinutes(event);
  const start = ((block.start - 480) * 56) / 60;
  const end = ((block.end - 480) * 56) / 60;
  return start < top + GITHUB_HOUR_CARD_HEIGHT && end > top;
}

export function isWithinScheduleHours(event: SoftwareTimelineEvent): boolean {
  const hour = new Date(event.eventDate).getHours();
  return hour >= 8 && hour < 18;
}

/** Nearby GitHub events share a card at the first event's time, avoiding overlapping titles. */
export function githubHourGroups(events: SoftwareTimelineEvent[]) {
  const groups: { top: number; events: SoftwareTimelineEvent[] }[] = [];
  const prs = events
    .filter(isWithinScheduleHours)
    .sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate) || a.id - b.id);
  for (const event of prs) {
    const date = new Date(event.eventDate);
    const top = Math.round((((date.getHours() - 8) * 60 + date.getMinutes()) * 56) / 60);
    const previous = groups.at(-1);
    if (previous && top - previous.top < GITHUB_HOUR_CARD_HEIGHT + 4) previous.events.push(event);
    else groups.push({ top, events: [event] });
  }
  return groups;
}
