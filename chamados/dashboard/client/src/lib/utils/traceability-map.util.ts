import {
  type TraceabilityEdge,
  type TraceabilityGraph,
  type TraceabilityNode,
  type TraceabilityNodeKind,
} from '@template/shared/schemas/traceability.schema';
import { type Edge, type Node } from '@xyflow/svelte';

/**
 * O MAPA DE RASTREABILIDADE na tela — no formato das ilhas do paralegal: cada COMPUTADOR é uma
 * ilha, com a máquina à esquerda e, à direita, o que passou por ela (chamados, peças, tarefas).
 * Os departamentos e as pessoas ficam numa coluna à parte, à esquerda das ilhas: a mesma pessoa
 * responde por mais de uma máquina, e assim ela aparece uma vez só, ligada a cada uma.
 *
 * O que está EM ABERTO (chamado aberto, tarefa pendente) tem a linha tracejada e animada; o que é
 * DE ANTES (o responsável que já passou a máquina adiante) fica apagado, com a linha pontilhada.
 */
export type TraceabilityItemData = TraceabilityNode & { href: string | null };
export type TraceabilityIslandData = { title: string };

export type TraceabilityMapNode =
  Node<TraceabilityIslandData, 'island'> | Node<TraceabilityItemData, 'item'>;

export type TraceabilityMap = { nodes: TraceabilityMapNode[]; edges: Edge[] };

/* O rótulo da linha ("chamado", "2 un.") é um chip no padrão: pílula com o fio de 1px, no fundo
   do card, em cinza de apoio — solto, ele parecia texto perdido no meio do mapa. */
export const EDGE_LABEL_STYLE =
  'border: 1px solid var(--border); border-radius: var(--shape-chip); background: var(--card); color: var(--muted-foreground); padding: 1px 8px; font-size: 11px; font-weight: 500;';

const PAD = 20;
const GAP = 16;
const COLUMN_GAP = 64;
const ITEM = { width: 260, height: 60 };
const ROW = ITEM.height + GAP;
const ISLAND_LEFT = ITEM.width + COLUMN_GAP * 2;
const ISLAND_WIDTH = PAD + ITEM.width + COLUMN_GAP + ITEM.width + PAD;
const ISLAND_GAP = 48;

/** A ordem da coluna da esquerda e da direita das ilhas. */
const SIDE_ORDER: TraceabilityNodeKind[] = ['department', 'person'];
const WORK_ORDER: TraceabilityNodeKind[] = ['ticket', 'task', 'part'];

const DETAIL_PATHS: Partial<Record<TraceabilityNodeKind, string>> = {
  computer: '/infra/computers',
  ticket: '/infra/tickets',
  task: '/infra/tasks',
};

/** Onde a caixa leva: a tela do registro, quando ela existe. */
export function traceabilityHref(node: TraceabilityNode): string | null {
  const path = DETAIL_PATHS[node.kind];

  return path && node.recordId !== null ? `${path}/${node.recordId}` : null;
}

function edgeOf(edge: TraceabilityEdge): Edge {
  const style = edge.isPending
    ? 'stroke: var(--primary); stroke-width: 2; stroke-dasharray: 6 4;'
    : edge.isPast
      ? 'stroke: var(--muted-foreground); stroke-width: 1.5; stroke-dasharray: 2 4; opacity: 0.6;'
      : 'stroke: var(--muted-foreground); stroke-width: 1.5;';

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    label: edge.label ?? undefined,
    labelStyle: EDGE_LABEL_STYLE,
    animated: edge.isPending,
    selectable: false,
    focusable: false,
    style,
  };
}

const byOrder = (order: TraceabilityNodeKind[]) => (a: TraceabilityNode, b: TraceabilityNode) =>
  order.indexOf(a.kind) - order.indexOf(b.kind) || a.label.localeCompare(b.label, 'pt-BR');

function itemNode(
  node: TraceabilityNode,
  position: { x: number; y: number },
  parentId?: string,
): TraceabilityMapNode {
  return {
    id: node.id,
    type: 'item',
    position,
    ...ITEM,
    data: { ...node, href: traceabilityHref(node) },
    ...(parentId ? { parentId, extent: 'parent' as const, draggable: false } : {}),
  };
}

/** O que saiu da máquina (chamado, peça, tarefa), na ordem da coluna. */
function workOf(computerId: string, graph: TraceabilityGraph): TraceabilityNode[] {
  const targets = new Set(
    graph.edges.filter((edge) => edge.source === computerId).map((edge) => edge.target),
  );

  return graph.nodes
    .filter((node) => targets.has(node.id) && WORK_ORDER.includes(node.kind))
    .sort(byOrder(WORK_ORDER));
}

/** As ilhas dos computadores, uma embaixo da outra, e a coluna das pessoas e departamentos. */
export function buildTraceabilityMap(graph: TraceabilityGraph): TraceabilityMap {
  const nodes: TraceabilityMapNode[] = [];
  const side = graph.nodes
    .filter((node) => SIDE_ORDER.includes(node.kind))
    .sort(byOrder(SIDE_ORDER));
  side.forEach((node, index) => nodes.push(itemNode(node, { x: 0, y: index * ROW })));
  let top = 0;
  for (const computer of graph.nodes.filter((node) => node.kind === 'computer')) {
    const work = workOf(computer.id, graph);
    const rows = Math.max(work.length, 1);
    const height = rows * ROW - GAP + PAD * 2;
    const islandId = `island:${computer.id}`;
    nodes.push({
      id: islandId,
      type: 'island',
      position: { x: ISLAND_LEFT, y: top },
      width: ISLAND_WIDTH,
      height,
      data: { title: computer.label },
      selectable: false,
    });
    nodes.push(itemNode(computer, { x: PAD, y: Math.round((height - ITEM.height) / 2) }, islandId));
    work.forEach((node, index) =>
      nodes.push(
        itemNode(node, { x: PAD + ITEM.width + COLUMN_GAP, y: PAD + index * ROW }, islandId),
      ),
    );
    top += height + ISLAND_GAP;
  }
  const placed = new Set(nodes.map((node) => node.id));

  return {
    nodes,
    edges: graph.edges
      .filter((edge) => placed.has(edge.source) && placed.has(edge.target))
      .map(edgeOf),
  };
}

export const TRACEABILITY_KIND_LABELS: Record<TraceabilityNodeKind, string> = {
  computer: 'Computador',
  person: 'Pessoa',
  department: 'Departamento',
  ticket: 'Chamado',
  part: 'Peça',
  task: 'Tarefa',
};
