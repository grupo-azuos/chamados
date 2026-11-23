import {
  TASK_LINK_KIND_LABELS,
  TASK_STATUS_LABELS,
  type TaskLinkKind,
} from '@template/shared/domain/task-flow.util';
import { type Task, type TaskLink } from '@template/shared/schemas/task.schema';
import { type Edge, type Node } from '@xyflow/svelte';

import { type AzuosPersonPickerPerson } from '$lib/components/azuos-person-picker-field/azuos-person-picker-field.svelte';
import { type AzuosCardHue } from '$lib/utils/card-tone.util';
import { taskHueOf } from '$lib/utils/task-gantt.util';

/**
 * O MAPA DOS VÍNCULOS (o do Paralegal) — cada tarefa numa ILHA SÓ DELA, espalhadas pela tela como
 * cartões num quadro: quem cuida → a tarefa → o que ela toca (chamados, computadores, peças, itens
 * do inventário). Nada de uma caixa compartilhada entre tarefas (com 100 tarefas, isso virava uma
 * torre de linhas cruzadas): o mesmo computador aparece em cada ilha que o cita.
 *
 * A ilha inteira se arrasta (e volta onde foi deixada); cada caixa leva à tela do que ela é.
 */
export type TaskMapTaskData = {
  title: string;
  status: string;
  ownerName: string;
  hue: AzuosCardHue;
  href: string;
  /** Em aberto: a ligação até o que ela toca fica tracejada e animada. */
  isPending: boolean;
};

export type TaskMapTargetData = {
  kind: TaskLinkKind;
  kindLabel: string;
  label: string;
  href: string | null;
};

export type TaskMapPersonData = {
  id: string | null;
  name: string;
  role: 'Responsável' | 'Participante';
  photo: string | null;
};

export type TaskMapIslandData = { title: string };

export type TaskMapNode =
  | Node<TaskMapIslandData, 'island'>
  | Node<TaskMapPersonData, 'person'>
  | Node<TaskMapTaskData, 'task'>
  | Node<TaskMapTargetData, 'target'>;

export type TaskMap = { nodes: TaskMapNode[]; edges: Edge[] };

/** Os tipos de item que o mapa mostra — o filtro "Mostrar" do mapa. */
export const TASK_MAP_KINDS: readonly TaskLinkKind[] = [
  'ticket',
  'computer',
  'part',
  'inventory_item',
];

export const TASK_MAP_KIND_TOGGLES: { kind: TaskLinkKind; label: string }[] = [
  { kind: 'ticket', label: 'Chamados' },
  { kind: 'computer', label: 'Computadores' },
  { kind: 'part', label: 'Peças' },
  { kind: 'inventory_item', label: 'Inventário' },
];

const PAD = 20;
const COLUMN_GAP = 56;
const PERSON_WIDTH = 220;
const NODE_WIDTH = 260;

export const TASK_MAP_LAYOUT = {
  personWidth: PERSON_WIDTH,
  nodeWidth: NODE_WIDTH,
  personHeight: 52,
  taskHeight: 76,
  targetHeight: 56,
  gap: 16,
  pad: PAD,
  columns: {
    person: PAD,
    task: PAD + PERSON_WIDTH + COLUMN_GAP,
    direct: PAD + PERSON_WIDTH + NODE_WIDTH + COLUMN_GAP * 2,
  },
  /** Quantas ilhas lado a lado, e o espaço entre elas. */
  islandColumns: 3,
  islandGap: 48,
} as const;

/** A largura de uma ilha cheia — a vaga de cada coluna de ilhas. */
const ISLAND_SLOT = TASK_MAP_LAYOUT.columns.direct + NODE_WIDTH + PAD;

export function islandNodeId(taskId: number): string {
  return `island:${taskId}`;
}

export function taskNodeId(taskId: number): string {
  return `task:${taskId}`;
}

/** O id é da ilha: o mesmo computador em duas tarefas são duas caixas. */
export function targetNodeId(taskId: number, kind: TaskLinkKind, targetId: number): string {
  return `${taskId}/${kind}:${targetId}`;
}

export function personNodeId(taskId: number, personId: string): string {
  return `${taskId}/person:${personId}`;
}

/** Onde cada ilha foi deixada pela pessoa, pelo id da tarefa. */
export type TaskMapPositions = Record<string, { x: number; y: number }>;

/** O id da tarefa de uma ilha — de volta, para guardar onde ela foi deixada. */
export function taskIdOfIsland(nodeId: string): string | null {
  return nodeId.startsWith('island:') ? nodeId.slice('island:'.length) : null;
}

/** As tarefas das pessoas escolhidas: responsável OU participante. Ninguém escolhido é "todas". */
export function tasksOfPeople<T extends Pick<Task, 'owner' | 'people'>>(
  tasks: readonly T[],
  peopleIds: readonly string[],
): T[] {
  if (peopleIds.length === 0) return [...tasks];

  return tasks.filter(
    (task) =>
      (task.owner !== null && peopleIds.includes(task.owner.id)) ||
      task.people.some((person) => peopleIds.includes(person.id)),
  );
}

/** Para onde cada item leva. */
export function linkHref(link: Pick<TaskLink, 'kind' | 'targetId'>): string {
  if (link.kind === 'ticket') return `/infra/tickets/${link.targetId}`;
  if (link.kind === 'computer') return `/infra/computers/${link.targetId}`;
  if (link.kind === 'part') return '/infra/parts';

  return '/maintenance/inventory';
}

/**
 * O mapa das tarefas, uma ilha por tarefa, só com os tipos de item escolhidos. A ilha que a pessoa
 * arrastou volta onde ela deixou (`positions`); as outras, no lugar automático.
 */
export function buildTaskMap(
  tasks: readonly Task[],
  kinds: readonly TaskLinkKind[],
  now: Date = new Date(),
  positions: TaskMapPositions = {},
): TaskMap {
  const heights: number[] = Array.from({ length: TASK_MAP_LAYOUT.islandColumns }, () => 0);
  const map: TaskMap = { nodes: [], edges: [] };
  for (const task of tasks) {
    const island = islandOf(task, kinds, now);
    /* Cada ilha vai para a coluna mais baixa: a tela enche por igual, sem buracos. */
    const column = heights.indexOf(Math.min(...heights));
    const frame = map.nodes.length;
    map.nodes.push(...island.nodes);
    map.edges.push(...island.edges);
    map.nodes[frame]!.position = positions[String(task.id)] ?? {
      x: column * (ISLAND_SLOT + TASK_MAP_LAYOUT.islandGap),
      y: heights[column]!,
    };
    heights[column] = heights[column]! + island.height + TASK_MAP_LAYOUT.islandGap;
  }

  return map;
}

type Island = TaskMap & { height: number };

function islandOf(task: Task, kinds: readonly TaskLinkKind[], now: Date): Island {
  const { taskHeight, personHeight, targetHeight, gap, columns } = TASK_MAP_LAYOUT;
  const links = uniqueLinks(task.links.filter((link) => kinds.includes(link.kind)));
  const people = peopleOf(task);
  const rightHeight = spanOf(links.length, targetHeight);
  const peopleHeight = spanOf(people.length, personHeight);
  const content = Math.max(taskHeight, peopleHeight, rightHeight);
  const frameId = islandNodeId(task.id);
  const taskId = taskNodeId(task.id);
  const isPending = task.status !== 'done';
  const child = { parentId: frameId, extent: 'parent' as const, draggable: false };
  const nodes: TaskMapNode[] = [
    {
      id: frameId,
      type: 'island',
      position: { x: 0, y: 0 },
      width: links.length > 0 ? ISLAND_SLOT : columns.task + NODE_WIDTH + PAD,
      height: content + PAD * 2,
      data: { title: task.title },
      selectable: false,
    },
    {
      ...child,
      id: taskId,
      type: 'task',
      position: { x: columns.task, y: PAD + centered(content, taskHeight) },
      width: NODE_WIDTH,
      height: taskHeight,
      data: taskDataOf(task, now),
    },
  ];
  const edges: Edge[] = [];
  const peopleTop = PAD + centered(content, peopleHeight);
  people.forEach((person, index) => {
    const id = personNodeId(task.id, person.id ?? 'none');
    nodes.push({
      ...child,
      id,
      type: 'person',
      position: { x: columns.person, y: peopleTop + index * (personHeight + gap) },
      width: PERSON_WIDTH,
      height: personHeight,
      data: person,
    });
    edges.push(edgeOf(id, taskId, { isDashed: person.role === 'Participante' }));
  });
  const linksTop = PAD + centered(content, rightHeight);
  links.forEach((link, index) => {
    const id = targetNodeId(task.id, link.kind, link.targetId);
    nodes.push({
      ...child,
      id,
      type: 'target',
      position: { x: columns.direct, y: linksTop + index * (targetHeight + gap) },
      width: NODE_WIDTH,
      height: targetHeight,
      data: targetDataOf(link),
    });
    edges.push(edgeOf(taskId, id, { isPending }));
  });

  return { nodes, edges, height: content + PAD * 2 };
}

function uniqueLinks(links: readonly TaskLink[]): TaskLink[] {
  return [...new Map(links.map((link) => [`${link.kind}:${link.targetId}`, link])).values()];
}

/** O responsável primeiro; depois os participantes (sem repetir o responsável). */
function peopleOf(task: Task): TaskMapPersonData[] {
  const owner: TaskMapPersonData = task.owner
    ? {
        id: task.owner.id,
        name: task.owner.name ?? 'Sem cadastro',
        role: 'Responsável',
        photo: task.owner.avatarUrl,
      }
    : { id: null, name: 'Sem responsável', role: 'Responsável', photo: null };
  const people = task.people
    .filter((person) => person.id !== task.owner?.id)
    .map<TaskMapPersonData>((person) => ({
      id: person.id,
      name: person.name ?? 'Sem cadastro',
      role: 'Participante',
      photo: person.avatarUrl,
    }));

  return [owner, ...people];
}

function spanOf(count: number, height: number): number {
  return count * (height + TASK_MAP_LAYOUT.gap) - TASK_MAP_LAYOUT.gap;
}

function centered(outer: number, inner: number): number {
  return Math.round((outer - inner) / 2);
}

/**
 * A linha é cheia; a do participante até a tarefa, tracejada. A da tarefa EM ABERTO até o que ela
 * toca é tracejada e ANIMADA, na cor da marca: algo ainda acontecendo.
 */
function edgeOf(
  source: string,
  target: string,
  look: { isDashed?: boolean; isPending?: boolean },
): Edge {
  const style = look.isPending
    ? 'stroke: var(--primary); stroke-width: 2; stroke-dasharray: 6 4;'
    : `stroke: var(--muted-foreground); stroke-width: 1.5;${look.isDashed ? ' stroke-dasharray: 6 4;' : ''}`;

  return {
    id: `${source}->${target}`,
    source,
    target,
    type: 'smoothstep',
    animated: Boolean(look.isPending),
    selectable: false,
    focusable: false,
    style,
  };
}

function taskDataOf(task: Task, now: Date): TaskMapTaskData {
  return {
    title: task.title,
    status: TASK_STATUS_LABELS[task.status],
    ownerName: task.owner?.name ?? 'Sem responsável',
    hue: taskHueOf(task, now),
    href: `/infra/tasks/${task.id}`,
    isPending: task.status !== 'done',
  };
}

function targetDataOf(link: TaskLink): TaskMapTargetData {
  const kindLabel = TASK_LINK_KIND_LABELS[link.kind];
  if (link.label === null)
    return { kind: link.kind, kindLabel, label: 'Saiu do cadastro', href: null };

  return { kind: link.kind, kindLabel, label: link.label, href: linkHref(link) };
}

/**
 * As pessoas do mapa: quem tem acesso (com a foto) e quem aparece nas tarefas como responsável ou
 * participante — o filtro existe para alcançar tarefas que existem.
 */
export function mapPeopleOf(
  tasks: readonly Task[],
  people: readonly AzuosPersonPickerPerson[],
): AzuosPersonPickerPerson[] {
  const byId: Record<string, AzuosPersonPickerPerson> = Object.fromEntries(
    people.map((person) => [person.id, person]),
  );
  for (const person of tasks.flatMap((task) => [
    ...(task.owner ? [task.owner] : []),
    ...task.people,
  ])) {
    if (byId[person.id] || !person.name) continue;
    byId[person.id] = { id: person.id, name: person.name, photo: person.avatarUrl };
  }

  return Object.values(byId).sort((first, second) =>
    first.name.localeCompare(second.name, 'pt-BR'),
  );
}
