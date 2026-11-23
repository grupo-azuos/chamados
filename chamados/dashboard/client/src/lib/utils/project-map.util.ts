import {
  TIMELINE_EVENT_TYPE_LABELS,
  type TimelineEventType,
} from '@template/shared/domain/software-project.util';
import { TASK_STATUS_LABELS } from '@template/shared/domain/task-flow.util';
import { formatTicketProtocol } from '@template/shared/domain/ticket-protocol.util';
import { ticketStatusLabel } from '@template/shared/domain/ticket-status.util';
import {
  type ProjectMapEntry,
  type ProjectMapEvent,
  type ProjectMapTicket,
} from '@template/shared/schemas/project-map.schema';
import { type Edge, type Node } from '@xyflow/svelte';

/**
 * O MAPA DOS PROJETOS — cada sistema numa ILHA gigante, como o mapa das tarefas: o projeto, os
 * grupos (issues, pull requests, merges e versões, chamados sem issue), cada item do grupo, e à
 * direita o que ele puxa: a issue leva ao chamado dela (1:1) e o chamado à tarefa. O PR que cita
 * uma issue no título ("#12") liga nela. O que está EM ABERTO (issue, PR, chamado, tarefa) tem a
 * linha tracejada e animada.
 */
export type ProjectMapKind = 'issues' | 'prs' | 'merges' | 'tickets' | 'tasks';

export const PROJECT_MAP_KINDS: readonly ProjectMapKind[] = [
  'issues',
  'prs',
  'merges',
  'tickets',
  'tasks',
];

export const PROJECT_MAP_KIND_TOGGLES: { kind: ProjectMapKind; label: string }[] = [
  { kind: 'issues', label: 'Issues' },
  { kind: 'prs', label: 'Pull requests' },
  { kind: 'merges', label: 'Merges e versões' },
  { kind: 'tickets', label: 'Chamados' },
  { kind: 'tasks', label: 'Tarefas' },
];

/** O que cada caixa é — o ícone e a cor dela vêm daqui. */
export type ProjectMapItemKind = TimelineEventType | 'ticket' | 'task';

export type ProjectMapProjectData = { name: string; repository: string; hidden: number };
export type ProjectMapHubData = { label: string; count: number };
export type ProjectMapItemData = {
  kind: ProjectMapItemKind;
  title: string;
  sublabel: string;
  href: string | null;
  /** Fora do sistema (o GitHub): abre em nova aba. */
  isExternal: boolean;
  isPending: boolean;
};
export type ProjectMapIslandData = { title: string };

export type ProjectMapNode =
  | Node<ProjectMapIslandData, 'island'>
  | Node<ProjectMapProjectData, 'project'>
  | Node<ProjectMapHubData, 'hub'>
  | Node<ProjectMapItemData, 'item'>;

export type ProjectMapGraph = { nodes: ProjectMapNode[]; edges: Edge[] };

/** Onde cada ilha foi deixada, pelo id do projeto. */
export type ProjectMapPositions = Record<string, { x: number; y: number }>;

const PAD = 20;
const GAP = 16;
const COLUMN_GAP = 56;
const SIZE = {
  project: { width: 240, height: 76 },
  hub: { width: 200, height: 52 },
  item: { width: 280, height: 60 },
};
const COLUMNS = {
  project: PAD,
  hub: PAD + SIZE.project.width + COLUMN_GAP,
  item: PAD + SIZE.project.width + SIZE.hub.width + COLUMN_GAP * 2,
  ticket: PAD + SIZE.project.width + SIZE.hub.width + SIZE.item.width + COLUMN_GAP * 3,
  task: PAD + SIZE.project.width + SIZE.hub.width + SIZE.item.width * 2 + COLUMN_GAP * 4,
};
const ISLAND_WIDTH = COLUMNS.task + SIZE.item.width + PAD;
const ISLAND_COLUMNS = 2;
const ISLAND_GAP = 64;
const ROW = SIZE.item.height + GAP;

const EVENT_STATUS_LABELS = { open: 'Aberto', merged: 'Juntado', closed: 'Fechado' } as const;

export function projectIdOfIsland(nodeId: string): string | null {
  return nodeId.startsWith('island:') ? nodeId.slice('island:'.length) : null;
}

/** Os números de issue que o título cita: "Corrige a tela (#12)", "fixes #12". */
export function issueRefsOf(text: string): number[] {
  return [...text.matchAll(/#(\d+)/g)].map((match) => Number(match[1]));
}

function numberOf(event: ProjectMapEvent): number | null {
  const match = /^#(\d+)$/.exec(event.externalId ?? '');

  return match ? Number(match[1]) : null;
}

function eventItem(event: ProjectMapEvent): ProjectMapItemData {
  return {
    kind: event.type,
    title: event.title,
    sublabel: [event.externalId, EVENT_STATUS_LABELS[event.status], event.author]
      .filter(Boolean)
      .join(' · '),
    href: event.url,
    isExternal: true,
    isPending: event.status === 'open',
  };
}

function ticketItem(ticket: ProjectMapTicket): ProjectMapItemData {
  return {
    kind: 'ticket',
    title: formatTicketProtocol(ticket.id),
    sublabel: `${ticketStatusLabel(ticket.status)} · ${ticket.description.replace(/\s+/g, ' ').slice(0, 60)}`,
    href: `/system/tickets/${ticket.id}`,
    isExternal: false,
    isPending: !ticket.isClosed,
  };
}

/** A linha: cheia; tracejada e animada, na cor da marca, quando o destino está em aberto. */
function edgeOf(source: string, target: string, isPending: boolean): Edge {
  return {
    id: `${source}->${target}`,
    source,
    target,
    type: 'smoothstep',
    animated: isPending,
    selectable: false,
    focusable: false,
    style: isPending
      ? 'stroke: var(--primary); stroke-width: 2; stroke-dasharray: 6 4;'
      : 'stroke: var(--muted-foreground); stroke-width: 1.5;',
  };
}

type Group = {
  key: string;
  label: string;
  items: ProjectMapItemData[];
  events: ProjectMapEvent[];
  tickets: ProjectMapTicket[];
};

function groupsOf(entry: ProjectMapEntry, kinds: readonly ProjectMapKind[]): Group[] {
  const byType = (types: TimelineEventType[]) =>
    entry.events.filter((event) => types.includes(event.type));
  const issueNumbers = new Set(byType(['issue']).flatMap((issue) => numberOf(issue) ?? []));
  const groups: Group[] = [];
  const add = (
    kind: ProjectMapKind,
    key: string,
    label: string,
    events: ProjectMapEvent[],
    tickets: ProjectMapTicket[] = [],
  ) => {
    if (!kinds.includes(kind) || events.length + tickets.length === 0) return;
    groups.push({
      key,
      label,
      items: [...events.map(eventItem), ...tickets.map(ticketItem)],
      events,
      tickets,
    });
  };
  add('issues', 'issues', 'Issues', byType(['issue']));
  add('prs', 'prs', 'Pull requests', byType(['pr']));
  add(
    'merges',
    'merges',
    'Merges e versões',
    byType(['merge', 'release', 'deploy', 'maintenance']),
  );
  /* O chamado com issue aparece ao lado dela; aqui ficam os que não têm (ou cuja issue não veio). */
  const loose = entry.tickets.filter(
    (ticket) => !ticket.githubIssueNumber || !issueNumbers.has(ticket.githubIssueNumber),
  );
  add('tickets', 'tickets', 'Chamados sem issue', [], loose);

  return groups;
}

function islandHeight(groups: readonly Group[]): number {
  const rows = groups.reduce((sum, group) => sum + Math.max(group.items.length, 1), 0);

  return Math.max(rows * ROW - GAP, SIZE.project.height) + PAD * 2 + (groups.length - 1) * GAP;
}

function islandOf(
  entry: ProjectMapEntry,
  kinds: readonly ProjectMapKind[],
): ProjectMapGraph & { height: number } {
  const id = entry.project.id;
  const frameId = `island:${id}`;
  const projectId = `${id}/project`;
  const child = { parentId: frameId, extent: 'parent' as const, draggable: false };
  const groups = groupsOf(entry, kinds);
  const height = islandHeight(groups);
  const nodes: ProjectMapNode[] = [
    {
      id: frameId,
      type: 'island',
      position: { x: 0, y: 0 },
      width: ISLAND_WIDTH,
      height,
      data: { title: entry.project.name },
      selectable: false,
    },
    {
      ...child,
      id: projectId,
      type: 'project',
      position: { x: COLUMNS.project, y: Math.round((height - SIZE.project.height) / 2) },
      ...SIZE.project,
      data: {
        name: entry.project.name,
        repository: entry.project.repositoryUrl,
        hidden: entry.hiddenEvents,
      },
    },
  ];
  const edges: Edge[] = [];
  const item = (
    nodeId: string,
    x: number,
    y: number,
    data: ProjectMapItemData,
  ): ProjectMapNode => ({
    ...child,
    id: nodeId,
    type: 'item',
    position: { x, y },
    ...SIZE.item,
    data,
  });
  const tasksOf = (ticketId: number) =>
    kinds.includes('tasks') ? entry.tasks.filter((task) => task.ticketId === ticketId) : [];
  const ticketByIssue = new Map(
    entry.tickets.flatMap((ticket) =>
      ticket.githubIssueNumber ? [[ticket.githubIssueNumber, ticket] as const] : [],
    ),
  );
  const issueNodeByNumber = new Map<number, string>();
  let top = PAD;

  const addTaskOf = (ticketNode: string, ticketId: number, x: number, y: number) => {
    for (const task of tasksOf(ticketId)) {
      const taskNode = `${id}/task:${task.id}`;
      nodes.push(
        item(taskNode, x, y, {
          kind: 'task',
          title: task.title,
          sublabel: TASK_STATUS_LABELS[task.status],
          href: `/system/tasks/${task.id}`,
          isExternal: false,
          isPending: task.status !== 'done',
        }),
      );
      edges.push(edgeOf(ticketNode, taskNode, task.status !== 'done'));
    }
  };

  for (const group of groups) {
    const rows = Math.max(group.items.length, 1);
    const hubNode = `${id}/hub:${group.key}`;
    nodes.push({
      ...child,
      id: hubNode,
      type: 'hub',
      position: { x: COLUMNS.hub, y: top + Math.round((rows * ROW - GAP - SIZE.hub.height) / 2) },
      ...SIZE.hub,
      data: { label: group.label, count: group.items.length },
    });
    edges.push(edgeOf(projectId, hubNode, false));
    group.items.forEach((data, index) => {
      const y = top + index * ROW;
      const event = group.events[index];
      const ticket = event ? undefined : group.tickets[index - group.events.length];
      const nodeId = event ? `${id}/event:${event.id}` : `${id}/ticket:${ticket!.id}`;
      nodes.push(item(nodeId, COLUMNS.item, y, data));
      edges.push(edgeOf(hubNode, nodeId, data.isPending));
      if (ticket) addTaskOf(nodeId, ticket.id, COLUMNS.ticket, y);
      const number = event?.type === 'issue' ? numberOf(event) : null;
      if (number === null) return;
      issueNodeByNumber.set(number, nodeId);
      const linked = kinds.includes('tickets') ? ticketByIssue.get(number) : undefined;
      if (!linked) return;
      const ticketNode = `${id}/ticket:${linked.id}`;
      nodes.push(item(ticketNode, COLUMNS.ticket, y, ticketItem(linked)));
      edges.push(edgeOf(nodeId, ticketNode, !linked.isClosed));
      addTaskOf(ticketNode, linked.id, COLUMNS.task, y);
    });
    top += rows * ROW - GAP + GAP * 2;
  }

  edges.push(...prIssueEdges(entry, kinds, issueNodeByNumber));

  return { nodes, edges, height };
}

/** O PR que cita uma issue no título ("#12") liga nela. */
function prIssueEdges(
  entry: ProjectMapEntry,
  kinds: readonly ProjectMapKind[],
  issueNodeByNumber: ReadonlyMap<number, string>,
): Edge[] {
  if (!kinds.includes('prs')) return [];

  return entry.events
    .filter((event) => event.type === 'pr')
    .flatMap((pr) =>
      issueRefsOf(pr.title)
        .filter((ref) => ref !== numberOf(pr) && issueNodeByNumber.has(ref))
        .map((ref) =>
          edgeOf(
            `${entry.project.id}/event:${pr.id}`,
            issueNodeByNumber.get(ref)!,
            pr.status === 'open',
          ),
        ),
    );
}

/** As ilhas, duas lado a lado; a que a pessoa arrastou volta onde ela deixou. */
export function buildProjectMap(
  entries: readonly ProjectMapEntry[],
  kinds: readonly ProjectMapKind[],
  positions: ProjectMapPositions = {},
): ProjectMapGraph {
  const heights = Array.from({ length: ISLAND_COLUMNS }, () => 0);
  const graph: ProjectMapGraph = { nodes: [], edges: [] };
  for (const entry of entries) {
    const island = islandOf(entry, kinds);
    const column = heights.indexOf(Math.min(...heights));
    const frame = graph.nodes.length;
    graph.nodes.push(...island.nodes);
    graph.edges.push(...island.edges);
    graph.nodes[frame]!.position = positions[String(entry.project.id)] ?? {
      x: column * (ISLAND_WIDTH + ISLAND_GAP),
      y: heights[column]!,
    };
    heights[column] = heights[column]! + island.height + ISLAND_GAP;
  }

  return graph;
}

export const PROJECT_MAP_ITEM_LABELS: Record<ProjectMapItemKind, string> = {
  ...TIMELINE_EVENT_TYPE_LABELS,
  ticket: 'Chamado',
  task: 'Tarefa',
};
