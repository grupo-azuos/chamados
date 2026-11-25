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
/* A ilha tem a largura do que tem dentro: só a máquina, ou a máquina e a coluna do que passou por
   ela. Com a largura fixa, a máquina sem chamado ficava num fundo esticado e vazio. */
const ISLAND_WIDTH = {
  alone: PAD + ITEM.width + PAD,
  withWork: PAD + ITEM.width + COLUMN_GAP + ITEM.width + PAD,
};
const ISLAND_GAP = 48;

/** A ordem da coluna da esquerda e da direita das ilhas. */
const SIDE_ORDER: TraceabilityNodeKind[] = ['department', 'person'];
const WORK_ORDER: TraceabilityNodeKind[] = ['ticket', 'task', 'part'];

/**
 * O QUE ABRE NUM DIÁLOGO sobre o mapa (como no Paralegal): o endereço guarda o registro aberto
 * (`?focus=computer&id=4&ticket=52`), o link abre direto nele, e o voltar do navegador o fecha.
 */
export const TRACEABILITY_OPEN_KINDS = ['computer', 'ticket', 'task', 'part'] as const;
export type TraceabilityOpenKind = (typeof TRACEABILITY_OPEN_KINDS)[number];

const isOpenKind = (kind: string): kind is TraceabilityOpenKind =>
  (TRACEABILITY_OPEN_KINDS as readonly string[]).includes(kind);

/** O registro aberto no endereço, se houver. */
export function openRecordOf(
  params: URLSearchParams,
): { kind: TraceabilityOpenKind; id: number } | null {
  for (const kind of TRACEABILITY_OPEN_KINDS) {
    const id = Number(params.get(kind));
    if (Number.isInteger(id) && id > 0) return { kind, id };
  }

  return null;
}

/** O texto do endereço (sem o "?") a partir dos campos. */
export function searchOf(values: Record<string, string>): string {
  return new URLSearchParams(values).toString();
}

/** O endereço sem o registro aberto — o mapa por baixo do diálogo. */
export function withoutOpenRecord(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const kind of TRACEABILITY_OPEN_KINDS) next.delete(kind);

  return next;
}

/**
 * Onde a caixa leva — sempre de volta à Rastreabilidade: a pessoa e o departamento viram o novo
 * ponto de partida; o computador, o chamado, a tarefa e a peça abrem no diálogo sobre o mapa.
 */
export function traceabilityHref(
  node: TraceabilityNode,
  params: URLSearchParams = new URLSearchParams(),
): string | null {
  const [, key = ''] = node.id.split(':');
  if (node.kind === 'person' || node.kind === 'department') {
    return `?${new URLSearchParams({ focus: node.kind, id: key })}`;
  }
  if (!isOpenKind(node.kind) || node.recordId === null) return null;
  const next = withoutOpenRecord(params);
  next.set(node.kind, String(node.recordId));

  return `?${next}`;
}

const isSideKind = (nodeId: string) =>
  nodeId.startsWith('department:') || nodeId.startsWith('person:');

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
    /* Do departamento e da pessoa (a coluna da esquerda) a linha é CURVA: as retas em degrau de
       várias caixas se juntavam no mesmo trecho antes da máquina, e os chips ficavam uns em cima
       dos outros. Dentro da ilha, o degrau continua (é uma máquina para vários itens). */
    type: isSideKind(edge.source) ? 'default' : 'smoothstep',
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
  params: URLSearchParams,
  parentId?: string,
): TraceabilityMapNode {
  return {
    id: node.id,
    type: 'item',
    position,
    ...ITEM,
    data: { ...node, href: traceabilityHref(node, params) },
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
export function buildTraceabilityMap(
  graph: TraceabilityGraph,
  params: URLSearchParams = new URLSearchParams(),
): TraceabilityMap {
  const nodes: TraceabilityMapNode[] = [];
  const side = graph.nodes
    .filter((node) => SIDE_ORDER.includes(node.kind))
    .sort(byOrder(SIDE_ORDER));
  side.forEach((node, index) => nodes.push(itemNode(node, { x: 0, y: index * ROW }, params)));
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
      width: work.length ? ISLAND_WIDTH.withWork : ISLAND_WIDTH.alone,
      height,
      data: { title: computer.label },
      selectable: false,
    });
    nodes.push(
      itemNode(computer, { x: PAD, y: Math.round((height - ITEM.height) / 2) }, params, islandId),
    );
    work.forEach((node, index) =>
      nodes.push(
        itemNode(
          node,
          { x: PAD + ITEM.width + COLUMN_GAP, y: PAD + index * ROW },
          params,
          islandId,
        ),
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
