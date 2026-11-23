import { isClosedTicketStatus } from '@template/shared/domain/ticket-status.util';
import { type TicketStatus } from '@template/shared/domain/ticket-status.util';
import { type TaskStatus } from '@template/shared/domain/task-flow.util';
import {
  type ProjectMap,
  type ProjectMapEvent,
  PROJECT_MAP_CLOSED_PER_TYPE,
} from '@template/shared/schemas/project-map.schema';

import { type SoftwareProjectRow } from '../../../lib/db/schema/software-projects.schema';
import { type SoftwareTimelineEventRow } from '../../../lib/db/schema/software-timeline-events.schema';

export type ProjectMapFacts = {
  projects: SoftwareProjectRow[];
  /** Do mais novo para o mais velho. */
  events: SoftwareTimelineEventRow[];
  tickets: {
    id: number;
    projectId: number | null;
    status: TicketStatus;
    description: string;
    githubIssueNumber: number | null;
  }[];
  tasks: { id: number; title: string; status: TaskStatus; ticketId: number | null }[];
};

/**
 * O que entra do sistema: tudo o que está em aberto, e só os `PROJECT_MAP_CLOSED_PER_TYPE` mais
 * recentes do que já fechou, de cada tipo (a lista vem do mais novo para o mais velho).
 */
function toEvent(event: SoftwareTimelineEventRow): ProjectMapEvent {
  return {
    id: event.id,
    type: event.type,
    externalId: event.externalId,
    title: event.title,
    status: event.status,
    url: event.url,
    author: event.authorName ?? event.author,
    eventDate: event.eventDate.toISOString(),
  };
}

function visibleEvents(events: readonly SoftwareTimelineEventRow[]): {
  shown: ProjectMapEvent[];
  hidden: number;
} {
  const closedSeen = new Map<string, number>();
  /* Conta quantos do mesmo tipo já fecharam antes deste: passou do limite, fica de fora. */
  const isShown = (event: SoftwareTimelineEventRow) => {
    if (event.status === 'open') return true;
    const seen = (closedSeen.get(event.type) ?? 0) + 1;
    closedSeen.set(event.type, seen);

    return seen <= PROJECT_MAP_CLOSED_PER_TYPE;
  };
  const shown = events.filter(isShown);

  return { shown: shown.map(toEvent), hidden: events.length - shown.length };
}

export function toProjectMap(facts: ProjectMapFacts): ProjectMap {
  return facts.projects.map((project) => {
    const { shown, hidden } = visibleEvents(
      facts.events.filter((event) => event.projectId === project.id),
    );
    const projectTickets = facts.tickets.filter((ticket) => ticket.projectId === project.id);
    const ticketIds = new Set(projectTickets.map((ticket) => ticket.id));

    return {
      project: {
        id: project.id,
        name: project.name,
        repositoryUrl: project.repositoryUrl,
        status: project.status,
      },
      events: shown,
      hiddenEvents: hidden,
      tickets: projectTickets.map((ticket) => ({
        id: ticket.id,
        status: ticket.status,
        isClosed: isClosedTicketStatus(ticket.status),
        description: ticket.description,
        githubIssueNumber: ticket.githubIssueNumber,
      })),
      tasks: facts.tasks.filter((task) => task.ticketId !== null && ticketIds.has(task.ticketId)),
    };
  });
}
