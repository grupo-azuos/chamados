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

import { ANCHOR_TOP, type AnchorRefs, anchorOf } from '$lib/utils/project-anchor.util';
import {
  buildGitGraph,
  GIT_ROW_HEIGHT,
  type GitGraphFilter,
  type GitGraphRow,
} from '$lib/utils/git-graph.util';

/**
 * O MAPA DOS PROJETOS — cada sistema numa ILHA gigante, e o EIXO da ilha é o GIT GRAPH (o
 * `git log --graph`, no desenho do lazygit): cada commit uma linha, a develop e a main em lanes
 * próprias, cada branch ao lado voltando no merge `--no-ff`, na cor do git-flow, a branch nova
 * pulsando e a versão (tag) em amarelo.
 *
 * Cada issue, PR e chamado sai da LINHA DO COMMIT ONDE FECHOU (ver `anchorOf`): o que o cita na
 * mensagem, ou a primeira versão depois de fechar; o que está em aberto sai do topo. À direita, o
 * que ele puxa: a issue leva ao chamado dela (1:1) e o chamado à tarefa. O PR que cita uma issue
 * no título ("#12") liga nela. O que está EM ABERTO tem a linha tracejada e animada.
 */
export type ProjectMapKind = 'issues' | 'prs' | 'tickets' | 'tasks';

export const PROJECT_MAP_KINDS: readonly ProjectMapKind[] = ['issues', 'prs', 'tickets', 'tasks'];

export const PROJECT_MAP_KIND_TOGGLES: { kind: ProjectMapKind; label: string }[] = [
  { kind: 'issues', label: 'Issues' },
  { kind: 'prs', label: 'Pull requests' },
  { kind: 'tickets', label: 'Chamados' },
  { kind: 'tasks', label: 'Tarefas' },
];

/** O que cada caixa é — o ícone e a cor dela vêm daqui. */
export type ProjectMapItemKind = TimelineEventType | 'ticket' | 'task';

export type ProjectMapProjectData = { name: string; repository: string; hidden: number };
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
/**
 * O git graph do sistema: as linhas que cabem, quantas o recorte tinha e os commits de onde sai
 * alguma linha para um item (cada um ganha a sua ponta, na altura da linha dele).
 */
export type ProjectMapGitData = { rows: GitGraphRow[]; total: number; anchors: string[] };

export type ProjectMapNode =
  | Node<ProjectMapIslandData, 'island'>
  | Node<ProjectMapProjectData, 'project'>
  | Node<ProjectMapItemData, 'item'>
  | Node<ProjectMapGitData, 'git'>;

export type ProjectMapGraph = { nodes: ProjectMapNode[]; edges: Edge[] };

/** Onde cada ilha foi deixada, pelo id do projeto. */
export type ProjectMapPositions = Record<string, { x: number; y: number }>;

const PAD = 20;
const GAP = 16;
const COLUMN_GAP = 56;
const SIZE = {
  project: { width: 240, height: 76 },
  item: { width: 280, height: 60 },
};
/* O git graph: a largura da coluna, o cabeçalho e o rodapé (as alturas da caixa dele) e quantos
   commits cabem — o resto fica no rodapé ("150 de 200"), como no lazygit. */
export const GIT_VISIBLE_ROWS = 150;
export const GIT_BOX = { width: 600, header: 44, footer: 32 };
const GIT_TOP = PAD + SIZE.project.height + GAP;
const COLUMNS = {
  item: PAD + GIT_BOX.width + COLUMN_GAP,
  ticket: PAD + GIT_BOX.width + SIZE.item.width + COLUMN_GAP * 2,
  task: PAD + GIT_BOX.width + SIZE.item.width * 2 + COLUMN_GAP * 3,
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

/** Um item da coluna do trabalho: a issue, o PR ou o chamado sem issue, e o que o pendura. */
type WorkItem = {
  nodeId: string;
  data: ProjectMapItemData;
  refs: AnchorRefs;
  event?: ProjectMapEvent;
  ticket?: ProjectMapTicket;
};

function eventWork(
  entry: ProjectMapEntry,
  event: ProjectMapEvent,
  ticketByIssue: ReadonlyMap<number, ProjectMapTicket>,
): WorkItem {
  const number = numberOf(event);
  const linked = number !== null ? ticketByIssue.get(number) : undefined;

  return {
    nodeId: `${entry.project.id}/event:${event.id}`,
    data: eventItem(event),
    refs: {
      numbers: number !== null ? [number] : [],
      protocols: linked ? [linked.id] : [],
      closedAt: event.status === 'open' ? null : event.eventDate,
    },
    event,
  };
}

/** A coluna do trabalho: as issues, os PRs e os chamados sem issue, conforme o "Mostrar". */
function workOf(entry: ProjectMapEntry, kinds: readonly ProjectMapKind[]): WorkItem[] {
  const ticketByIssue = new Map(
    entry.tickets.flatMap((ticket) =>
      ticket.githubIssueNumber ? [[ticket.githubIssueNumber, ticket] as const] : [],
    ),
  );
  const byType = (type: TimelineEventType) => entry.events.filter((event) => event.type === type);
  const issues = byType('issue');
  const issueNumbers = new Set(issues.flatMap((issue) => numberOf(issue) ?? []));
  const loose = entry.tickets.filter(
    (ticket) => !ticket.githubIssueNumber || !issueNumbers.has(ticket.githubIssueNumber),
  );

  return [
    ...(kinds.includes('issues')
      ? issues.map((issue) => eventWork(entry, issue, ticketByIssue))
      : []),
    ...(kinds.includes('prs') ? byType('pr').map((pr) => eventWork(entry, pr, ticketByIssue)) : []),
    ...(kinds.includes('tickets')
      ? loose.map((ticket) => ({
          nodeId: `${entry.project.id}/ticket:${ticket.id}`,
          data: ticketItem(ticket),
          refs: {
            numbers: ticket.githubIssueNumber ? [ticket.githubIssueNumber] : [],
            protocols: [ticket.id],
            closedAt: ticket.isClosed ? (ticket.closedAt ?? null) : null,
          },
          ticket,
        }))
      : []),
  ];
}

/** O meio da linha do commit, na altura da ilha. */
function rowCenterOf(index: number): number {
  return GIT_TOP + GIT_BOX.header + index * GIT_ROW_HEIGHT + GIT_ROW_HEIGHT / 2;
}

function gitHeightOf(rows: number): number {
  return GIT_BOX.header + Math.max(rows, 1) * GIT_ROW_HEIGHT + GIT_BOX.footer;
}

type IslandBuilder = {
  entry: ProjectMapEntry;
  kinds: readonly ProjectMapKind[];
  child: { parentId: string; extent: 'parent'; draggable: false };
  nodes: ProjectMapNode[];
  edges: Edge[];
};

function itemNode(
  builder: IslandBuilder,
  nodeId: string,
  x: number,
  y: number,
  data: ProjectMapItemData,
): void {
  builder.nodes.push({
    ...builder.child,
    id: nodeId,
    type: 'item',
    position: { x, y },
    ...SIZE.item,
    data,
  });
}

/** As tarefas do chamado, uma embaixo da outra; devolve quantas linhas ocuparam. */
function addTasks(
  builder: IslandBuilder,
  ticketNode: string,
  ticketId: number,
  x: number,
  y: number,
): number {
  if (!builder.kinds.includes('tasks')) return 1;
  const tasks = builder.entry.tasks.filter((task) => task.ticketId === ticketId);
  tasks.forEach((task, index) => {
    const taskNode = `${builder.entry.project.id}/task:${task.id}`;
    itemNode(builder, taskNode, x, y + index * ROW, {
      kind: 'task',
      title: task.title,
      sublabel: TASK_STATUS_LABELS[task.status],
      href: `/system/tasks/${task.id}`,
      isExternal: false,
      isPending: task.status !== 'done',
    });
    builder.edges.push(edgeOf(ticketNode, taskNode, task.status !== 'done'));
  });

  return Math.max(tasks.length, 1);
}

/** O que o item puxa à direita: a issue, o chamado dela; o chamado, as tarefas. Devolve as linhas. */
function addChain(
  builder: IslandBuilder,
  item: WorkItem,
  y: number,
  ticketByIssue: ReadonlyMap<number, ProjectMapTicket>,
): number {
  if (item.ticket) return addTasks(builder, item.nodeId, item.ticket.id, COLUMNS.ticket, y);
  const number = item.event?.type === 'issue' ? numberOf(item.event) : null;
  const linked =
    number !== null && builder.kinds.includes('tickets') ? ticketByIssue.get(number) : undefined;
  if (!linked) return 1;
  const ticketNode = `${builder.entry.project.id}/ticket:${linked.id}`;
  itemNode(builder, ticketNode, COLUMNS.ticket, y, ticketItem(linked));
  builder.edges.push(edgeOf(item.nodeId, ticketNode, !linked.isClosed));

  return addTasks(builder, ticketNode, linked.id, COLUMNS.task, y);
}

function islandOf(
  entry: ProjectMapEntry,
  kinds: readonly ProjectMapKind[],
  filter: GitGraphFilter,
  now: Date,
): ProjectMapGraph & { height: number } {
  const id = entry.project.id;
  const frameId = `island:${id}`;
  const gitNode = `${id}/git`;
  const allRows = buildGitGraph(entry.commits, entry.branches, filter, now, entry.tags ?? []);
  const rows = allRows.slice(0, GIT_VISIBLE_ROWS);
  const commits = rows.map((row) => row.commit);
  const topSha = rows[0]?.commit.sha ?? ANCHOR_TOP;
  const builder: IslandBuilder = {
    entry,
    kinds,
    child: { parentId: frameId, extent: 'parent', draggable: false },
    nodes: [],
    edges: [],
  };
  const ticketByIssue = new Map(
    entry.tickets.flatMap((ticket) =>
      ticket.githubIssueNumber ? [[ticket.githubIssueNumber, ticket] as const] : [],
    ),
  );
  const indexOf = new Map(rows.map((row, index) => [row.commit.sha, index]));
  const placed = workOf(entry, kinds)
    .map((item, order) => {
      const anchor = anchorOf(item.refs, commits, entry.tags ?? []);
      const sha = anchor === ANCHOR_TOP ? topSha : anchor;

      return { item, sha, index: indexOf.get(sha) ?? 0, order };
    })
    .sort((a, b) => a.index - b.index || a.order - b.order);

  let nextY = GIT_TOP;
  for (const { item, sha, index } of placed) {
    const y = Math.max(rowCenterOf(index) - SIZE.item.height / 2, nextY);
    itemNode(builder, item.nodeId, COLUMNS.item, y, item.data);
    builder.edges.push({
      ...edgeOf(gitNode, item.nodeId, item.data.isPending),
      sourceHandle: `row:${sha}`,
    });
    nextY = y + addChain(builder, item, y, ticketByIssue) * ROW;
  }
  builder.edges.push(...prIssueEdges(entry, kinds));

  const gitHeight = gitHeightOf(rows.length);
  const height = Math.max(GIT_TOP + gitHeight, nextY - GAP) + PAD;
  const anchors = [...new Set(placed.map((entryItem) => entryItem.sha))];

  return {
    nodes: [
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
        ...builder.child,
        id: `${id}/project`,
        type: 'project',
        position: { x: PAD, y: PAD },
        ...SIZE.project,
        data: {
          name: entry.project.name,
          repository: entry.project.repositoryUrl,
          hidden: entry.hiddenEvents,
        },
      },
      {
        ...builder.child,
        id: gitNode,
        type: 'git',
        position: { x: PAD, y: GIT_TOP },
        width: GIT_BOX.width,
        height: gitHeight,
        data: { rows, total: allRows.length, anchors },
      },
      ...builder.nodes,
    ],
    edges: builder.edges,
    height,
  };
}

/** O PR que cita uma issue no título ("#12") liga nela. */
function prIssueEdges(entry: ProjectMapEntry, kinds: readonly ProjectMapKind[]): Edge[] {
  if (!kinds.includes('prs') || !kinds.includes('issues')) return [];
  const issueNodeByNumber = new Map(
    entry.events
      .filter((event) => event.type === 'issue')
      .flatMap((issue) => {
        const number = numberOf(issue);

        return number !== null ? [[number, `${entry.project.id}/event:${issue.id}`] as const] : [];
      }),
  );

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
  filter: GitGraphFilter = {},
  now: Date = new Date(),
): ProjectMapGraph {
  const heights = Array.from({ length: ISLAND_COLUMNS }, () => 0);
  const graph: ProjectMapGraph = { nodes: [], edges: [] };
  for (const entry of entries) {
    const island = islandOf(entry, kinds, filter, now);
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
